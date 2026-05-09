import cv2
import os
import time
import json
import numpy as np
from ultralytics import YOLO
from tqdm import tqdm
import logging

logger = logging.getLogger("visionplay")

# ── Team colour definitions (HSV ranges) ──────────────────────────────────────

# Team 1 → Green shirts
TEAM1_LOWER = np.array([35,  50,  50], dtype=np.uint8)
TEAM1_UPPER = np.array([85, 255, 255], dtype=np.uint8)
TEAM1_COLOR  = (0, 200, 0)       # BGR
TEAM1_LABEL  = "Team 1"

# Team 2 → White shirts
TEAM2_LOWER = np.array([0,   0, 180], dtype=np.uint8)
TEAM2_UPPER = np.array([180, 50, 255], dtype=np.uint8)
TEAM2_COLOR  = (220, 220, 220)   # BGR
TEAM2_LABEL  = "Team 2"

# Minimum fraction of torso pixels required to assign a team
TEAM_THRESHOLD = 0.12

# ── Centroid Tracker ──────────────────────────────────────────────────────────

class CentroidTracker:
    def __init__(self, max_disappeared=10):
        self.next_id = 0
        self.objects = {}  # {id: centroid}
        self.disappeared = {}  # {id: count}
        self.max_disappeared = max_disappeared

    def update(self, rects):
        if len(rects) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    del self.objects[object_id]
                    del self.disappeared[object_id]
            return self.objects

        input_centroids = np.zeros((len(rects), 2), dtype="int")
        for (i, (x1, y1, x2, y2)) in enumerate(rects):
            input_centroids[i] = (int((x1 + x2) / 2), int((y1 + y2) / 2))

        if len(self.objects) == 0:
            for i in range(len(input_centroids)):
                self.objects[self.next_id] = input_centroids[i]
                self.disappeared[self.next_id] = 0
                self.next_id += 1
        else:
            object_ids = list(self.objects.keys())
            object_centroids = list(self.objects.values())

            # Distance matrix
            dists = np.linalg.norm(np.array(object_centroids)[:, np.newaxis] - input_centroids, axis=2)
            
            rows = dists.min(axis=1).argsort()
            cols = dists.argmin(axis=1)[rows]

            used_rows = set()
            used_cols = set()

            for (row, col) in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue
                
                object_id = object_ids[row]
                self.objects[object_id] = input_centroids[col]
                self.disappeared[object_id] = 0
                
                used_rows.add(row)
                used_cols.add(col)

            unused_rows = set(range(dists.shape[0])).difference(used_rows)
            unused_cols = set(range(dists.shape[1])).difference(used_cols)

            if dists.shape[0] >= dists.shape[1]:
                for row in unused_rows:
                    object_id = object_ids[row]
                    self.disappeared[object_id] += 1
                    if self.disappeared[object_id] > self.max_disappeared:
                        del self.objects[object_id]
                        del self.disappeared[object_id]
            else:
                for col in unused_cols:
                    self.objects[self.next_id] = input_centroids[col]
                    self.disappeared[self.next_id] = 0
                    self.next_id += 1

        return self.objects


def classify_shirt(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> tuple:
    """
    Sample the upper-middle torso region of a bounding box and decide team.
    Returns (team_label, bgr_draw_color).
    """
    h, w = y2 - y1, x2 - x1
    if h <= 0 or w <= 0:
        return "Not playing", (128, 128, 128)

    # Torso ROI: vertical 20–55 %, horizontal 20–80 %
    roi = frame[y1 + int(h*0.20):y1 + int(h*0.55),
                x1 + int(w*0.20):x1 + int(w*0.80)]
    if roi.size == 0:
        return "Not playing", (128, 128, 128)

    hsv   = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    total = hsv.shape[0] * hsv.shape[1]
    if total == 0:
        return "Not playing", (128, 128, 128)

    green_ratio = np.count_nonzero(cv2.inRange(hsv, TEAM1_LOWER, TEAM1_UPPER)) / total
    white_ratio  = np.count_nonzero(cv2.inRange(hsv, TEAM2_LOWER, TEAM2_UPPER))  / total

    if green_ratio >= TEAM_THRESHOLD and green_ratio >= white_ratio:
        return TEAM1_LABEL, TEAM1_COLOR
    if white_ratio >= TEAM_THRESHOLD:
        return TEAM2_LABEL, TEAM2_COLOR
    return "Not playing", (128, 128, 128)


def draw_box(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int,
             label: str, color: tuple, conf: float) -> None:
    """Draw a colour-coded bounding box with a filled label tag."""
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    tag = f"{label} {conf:.2f}"
    (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
    tag_y = max(y1, th + 6)

    cv2.rectangle(frame, (x1, tag_y - th - 6), (x1 + tw + 4, tag_y), color, -1)

    brightness = 0.299*color[2] + 0.587*color[1] + 0.114*color[0]
    txt_color  = (0, 0, 0) if brightness > 150 else (255, 255, 255)
    cv2.putText(frame, tag, (x1 + 2, tag_y - 3),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, txt_color, 1, cv2.LINE_AA)


def detect_objects(input_dir: str, output_dir: str,
                   model_path: str = 'models/yolov8n.pt',
                   on_frame: callable = None) -> dict:
    """
    Run YOLO person detection + shirt-colour team classification on every frame.

    Args:
        input_dir:  Directory containing extracted .jpg frames.
        output_dir: Directory to write annotated .jpg frames.
        model_path: Path to the YOLOv8 .pt weights file.

    Returns:
        dict with keys:
            summary     – aggregate stats (total_persons, team1_total, team2_total, avg_inference_time)
            best_frame  – metadata of the frame with most active players
            timeline    – per-frame list of {t1, t2, np} counts
        Returns {} on failure.
    """
    logger.info(f"Loading YOLO model from {model_path}...")
    model = YOLO(model_path)

    frame_files = sorted([f for f in os.listdir(input_dir) if f.endswith('.jpg')])
    if not frame_files:
        logger.error("No frames found to process.")
        return {}

    logger.info(f"Processing {len(frame_files)} frames...")

    total_objects   = 0
    team1_total     = 0
    team2_total     = 0
    inference_times = []
    max_players     = -1
    best_frame_data = {}
    all_frames_stats = []
    tracker = CentroidTracker(max_disappeared=15)
    previous_centers = {}
    possession_team1 = 0
    possession_team2 = 0
    player_registry = {}

    pbar = tqdm(total=len(frame_files), desc="Detecting Objects")

    for idx, frame_file in enumerate(frame_files):
        # ── Check for stop request ───────────────────────────────────────────
        from shared_state import is_stopped
        if is_stopped():
            logger.info("Object detection aborted by user request.")
            pbar.close()
            return {}

        frame = cv2.imread(os.path.join(input_dir, frame_file))
        if frame is None:
            pbar.update(1)
            continue

        # YOLO inference — persons (0) and ball (32)
        t0 = time.time()
        results = model(frame, classes=[0, 32], verbose=False)[0]
        inference_times.append(time.time() - t0)

        frame_t1 = frame_t2 = 0
        ball_in_frame = False
        frame_detections = []
        current_centers = []

        for box in results.boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            if cls == 32: # Ball
                ball_in_frame = True
                bx, by = int((x1+x2)/2), int((y1+y2)/2)
                cv2.circle(frame, (bx, by), 15, (0, 255, 255), 2)
                cv2.putText(frame, "BALL", (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
                continue

            # Person detection
            total_objects += 1
            current_centers.append((x1, y1, x2, y2))
            
            team, color = classify_shirt(frame, x1, y1, x2, y2)

            if team == TEAM1_LABEL:
                frame_t1   += 1
                team1_total += 1
            elif team == TEAM2_LABEL:
                frame_t2   += 1
                team2_total += 1

            # Temporary detection for tracking
            frame_detections.append({
                "team": "green" if team == TEAM1_LABEL else "white", 
                "bbox": [x1, y1, x2, y2], 
                "conf": round(conf, 3),
                "center": (int((x1+x2)/2), int((y1+y2)/2))
            })
            draw_box(frame, x1, y1, x2, y2, team, color, conf)

        # Update Tracker
        tracked_objects = tracker.update(current_centers)
        
        # Merge tracked IDs back to detections
        final_detections = []
        for det in frame_detections:
            cx, cy = det["center"]
            # Find closest tracked ID
            best_id = -1
            min_dist = 50 # Max 50 pixels movement
            for obj_id, obj_center in tracked_objects.items():
                d = np.linalg.norm(np.array((cx, cy)) - obj_center)
                if d < min_dist:
                    min_dist = d
                    best_id = obj_id
            
            if best_id != -1:
                det["id"] = best_id
                final_detections.append(det)

        # Calculate velocities and metabolic power using tracked IDs
        metabolic_power = 0
        for det in final_detections:
            obj_id = det["id"]
            cx, cy = det["center"]
            team = det["team"]
            
            if obj_id not in player_registry:
                player_registry[obj_id] = {
                    "id": obj_id,
                    "team": team,
                    "distance": 0,
                    "topSpeed": 0,
                    "intensity": 0,
                    "fatigueIndex": 0,
                    "tacticalScore": 70 + (obj_id % 20),
                    "cognitiveLoad": 40 + (obj_id % 30),
                    "lastPos": (cx, cy)
                }
            
            if obj_id in previous_centers:
                px, py = previous_centers[obj_id]
                dist = ((cx - px)**2 + (cy - py)**2)**0.5
                scaled_dist = dist * 0.05
                
                player_registry[obj_id]["distance"] += scaled_dist
                player_registry[obj_id]["topSpeed"] = max(player_registry[obj_id]["topSpeed"], scaled_dist * 10)
                player_registry[obj_id]["intensity"] += scaled_dist * 1.5
                player_registry[obj_id]["fatigueIndex"] = min(100, (player_registry[obj_id]["intensity"] / 500) * 100)
                player_registry[obj_id]["lastPos"] = (cx, cy)
                
                metabolic_power += scaled_dist * 20
            previous_centers[obj_id] = (cx, cy)

        # Cleanup old centers
        for obj_id in list(previous_centers.keys()):
            if obj_id not in tracked_objects:
                del previous_centers[obj_id]

        possession = "team1" if frame_t1 > frame_t2 else "team2"
        if possession == "team1":
            possession_team1 += 1
        else:
            possession_team2 += 1

        # Track best frame
        total_active = frame_t1 + frame_t2
        if total_active > max_players:
            max_players     = total_active
            best_frame_data = {
                "frame_index":     idx,
                "frame_file":      frame_file,
                "team1_count":     frame_t1,
                "team2_count":     frame_t2,
                "not_playing_count": len(results.boxes) - total_active,
                "detections":      final_detections,
            }

        all_frames_stats.append({
            "t1": frame_t1,
            "t2": frame_t2,
            "np": len(results.boxes) - total_active - (1 if ball_in_frame else 0),
            "ball": ball_in_frame,
            "detections": final_detections,
            "metabolic_power": round(metabolic_power, 2),
            "possession": possession
        })

        # HUD overlay
        avg_inf = sum(inference_times) / len(inference_times)
        for text, pos in [
            (f"FPS: {1/avg_inf:.1f}",         (20, 40)),
            (f"Team 1 (green): {frame_t1}",   (20, 75)),
            (f"Team 2 (white): {frame_t2}",   (20, 110)),
        ]:
            cv2.putText(frame, text, (pos[0]+1, pos[1]+1),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 2, cv2.LINE_AA)
            cv2.putText(frame, text, pos,
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2, cv2.LINE_AA)

        cv2.imwrite(os.path.join(output_dir, frame_file), frame)

        # ── Frame callback (for streaming) ───────────────────────────────────
        if on_frame:
            on_frame(frame, {
                "players_detected": frame_t1 + frame_t2,
                "team1_count": frame_t1,
                "team2_count": frame_t2,
                "ball_detected": ball_in_frame,
                "frame_id": idx,
                "detections": final_detections,
                "metabolic_power": round(metabolic_power, 2),
                "possession": possession
            })

        pbar.update(1)

    pbar.close()

    avg_time = sum(inference_times) / len(inference_times) if inference_times else 0
    
    summary = {
        "total_persons":       total_objects,
        "team1_total":         team1_total,
        "team2_total":         team2_total,
        "avg_inference_time":  avg_time,
        "possession_team1":    possession_team1,
        "possession_team2":    possession_team2,
        "total_frames":        len(frame_files)
    }

    results_dict = {
        "summary": summary,
        "best_frame": best_frame_data,
        "timeline": all_frames_stats,
        "player_registry": player_registry
    }

    # Save to public/data/match_telemetry.json for frontend
    try:
        public_data_dir = "/home/noah/Desktop/NextJS/gdg/public/data"
        os.makedirs(public_data_dir, exist_ok=True)
        with open(os.path.join(public_data_dir, "match_telemetry.json"), "w") as f:
            json.dump(results_dict, f, indent=4)
        logger.info(f"Match telemetry saved to {public_data_dir}/match_telemetry.json")
    except Exception as e:
        logger.error(f"Failed to save telemetry: {e}")

    return results_dict
