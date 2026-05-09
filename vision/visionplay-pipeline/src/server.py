import os
import cv2
import base64
import json
import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from main import run_pipeline

# ─── Configuration ────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vision-server")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global State ─────────────────────────────────────────────────────────────
background_task: asyncio.Task = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")

manager = ConnectionManager()

# ─── Pipeline Integration ─────────────────────────────────────────────────────
def frame_to_base64(frame):
    _, buffer = cv2.imencode('.jpg', frame)
    return base64.b64encode(buffer).decode('utf-8')

async def stream_frame(frame, stats):
    """Callback from detect_objects inside the pipeline"""
    
    # Draw detections and IDs on the frame for visual feedback
    annotated_frame = frame.copy()
    detections = stats.get("detections", [])
    
    for d in detections:
        bbox = d.get("bbox", [0, 0, 0, 0])
        p_id = d.get("id", "?")
        team = d.get("team", "unknown")
        
        # Colors: Green for green team, Blue for white/other team
        color = (110, 232, 200) if team == "green" else (246, 130, 59) # BGR
        
        # Draw Box
        cv2.rectangle(annotated_frame, (int(bbox[0]), int(bbox[1])), (int(bbox[2]), int(bbox[3])), color, 2)
        
        # Draw ID Label
        label = f"ID: {p_id}"
        cv2.putText(annotated_frame, label, (int(bbox[0]), int(bbox[1]) - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    b64_frame = frame_to_base64(annotated_frame)
    message = {
        "type": "frame",
        "frame": b64_frame,
        "stats": stats
    }
    await manager.broadcast(message)

async def stream_status(status_msg):
    """Callback for pipeline status updates"""
    await manager.broadcast({
        "type": "status",
        "message": status_msg
    })

# ─── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "VisionPlay Engine Online"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send a ready message immediately
        await websocket.send_json({"type": "ready", "message": "Connected to VisionPlay Engine"})
        
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.post("/start")
async def start_session():
    """Trigger the pipeline"""
    global background_task
    from shared_state import reset_stop
    reset_stop()
    
    if background_task and not background_task.done():
        logger.info("Cancelling existing vision task...")
        background_task.cancel()
        try:
            await background_task
        except asyncio.CancelledError:
            pass
            
    background_task = asyncio.create_task(run_detection_task())
    return {"status": "started"}

@app.post("/stop")
async def stop_session_endpoint():
    """Stop the pipeline"""
    global background_task
    from shared_state import request_stop
    request_stop()
    
    if background_task and not background_task.done():
        logger.info("Stopping vision task...")
        background_task.cancel()
        try:
            # Wait for task to actually stop
            await asyncio.wait_for(background_task, timeout=2.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass
    return {"status": "stopped"}

async def run_detection_task():
    try:
        base_dir      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        input_dir     = os.path.join(base_dir, "input_videos")
        output_dir    = os.path.join(base_dir, "output_videos")
        extracted_dir = os.path.join(base_dir, "extracted_frames")
        processed_dir = os.path.join(base_dir, "processed_frames")
        model_path    = os.path.join(base_dir, "models", "yolov8n.pt")
        
        # Pick first video
        video_files = [f for f in os.listdir(input_dir) if f.lower().endswith(('.mp4', '.avi'))]
        if not video_files:
            await manager.broadcast({"type": "error", "message": "No video found in input_videos/"})
            return

        video_path = os.path.join(input_dir, video_files[0])
        main_loop = asyncio.get_running_loop()

        def on_frame_sync(frame, stats):
            if main_loop.is_running():
                asyncio.run_coroutine_threadsafe(stream_frame(frame, stats), main_loop)

        def on_status_sync(msg):
            if main_loop.is_running():
                asyncio.run_coroutine_threadsafe(stream_status(msg), main_loop)

        # 1 ── Initial Processing
        logger.info("Starting pipeline task...")
        result = await asyncio.to_thread(
            run_pipeline, 
            video_path, output_dir, model_path, extracted_dir, processed_dir,
            on_frame=on_frame_sync,
            on_status=on_status_sync
        )

        if not result:
            logger.error("Pipeline failed, cannot start loop.")
            return

        # 2 ── Continuous Looping
        logger.info("Pipeline finished. Transitioning to infinite loop...")
        processed_files = sorted([f for f in os.listdir(processed_dir) if f.endswith('.jpg')])
        if not processed_files:
            logger.error("No processed frames found for looping.")
            return

        timeline = result["detection"]["timeline"]
        
        from shared_state import is_stopped
        while True:
            # Check for cancellation or explicit stop request
            if asyncio.current_task().cancelled() or is_stopped():
                logger.info("Loop task halted.")
                break

            for idx, frame_file in enumerate(processed_files):
                if not manager.active_connections or asyncio.current_task().cancelled():
                    break
                    
                frame_path = os.path.join(processed_dir, frame_file)
                frame = cv2.imread(frame_path)
                if frame is not None:
                    frame_stats = timeline[idx] if idx < len(timeline) else {}
                    stats = {
                        "players_detected": frame_stats.get("t1", 0) + frame_stats.get("t2", 0),
                        "team1_count": frame_stats.get("t1", 0),
                        "team2_count": frame_stats.get("t2", 0),
                        "ball_detected": frame_stats.get("ball", False),
                        "frame_id": idx,
                        "detections": frame_stats.get("detections", [])
                    }
                    await stream_frame(frame, stats)
                    
                await asyncio.sleep(1/30)
    except asyncio.CancelledError:
        logger.info("Detection task stopped via cancellation.")
        raise
    except Exception as e:
        logger.error(f"Error in detection task: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
