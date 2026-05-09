import logging
import json
import os

from detect_objects import detect_objects
from extract_frames import extract_frames
from rebuild_video import rebuild_video
from utils import Timer, clear_directory, setup_logging


def run_pipeline(
    video_path: str,
    output_dir: str,
    model_path: str,
    extracted_dir: str,
    processed_dir: str,
    target_fps: int = 30,
    on_frame: callable = None,
    on_status: callable = None,
) -> dict:
    """
    Run the full VisionPlay detection pipeline on a single video file.
    """
    logger = logging.getLogger("visionplay")

    logger.info(f"Processing: {video_path}")

    timer = Timer()
    timer.start()

    # 1 ── Clear temp dirs
    if on_status:
        on_status("INITIALIZING_TEMP_SYSTEMS")
    clear_directory(extracted_dir)
    clear_directory(processed_dir)

    # 2 ── Extract frames
    if on_status:
        on_status("EXTRACTING_TELEMETRY_FRAMES")
    if not extract_frames(video_path, extracted_dir, target_fps=target_fps):
        logger.error("Frame extraction failed.")
        return {}

    # 3 ── Detect + classify
    if on_status:
        on_status("ANALYZING_PERSONNEL_MOVEMENT")
    detection_data = detect_objects(
        extracted_dir, processed_dir, model_path, on_frame=on_frame
    )
    if not detection_data:
        logger.error("Object detection failed.")
        return {}

    # 4 ── Rebuild annotated video
    if on_status:
        on_status("FINALIZING_TACTICAL_DATA")
    
    # Save directly to public/videos for frontend access
    public_video_dir = "/home/noah/Desktop/NextJS/gdg/public/videos"
    os.makedirs(public_video_dir, exist_ok=True)
    output_video_path = os.path.join(public_video_dir, "detected_test.mp4")

    if not rebuild_video(processed_dir, output_video_path, fps=target_fps):
        logger.error("Video reconstruction failed.")
        return {}

    duration = timer.stop()
    return {
        "output_video": output_video_path,
        "duration": duration,
        "detection": detection_data,
    }


def main():
    setup_logging()
    logger = logging.getLogger("visionplay")
    logger.info("Initializing VisionPlay Detection Pipeline...")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_dir = os.path.join(base_dir, "input_videos")
    output_dir = os.path.join(base_dir, "output_videos")
    extracted_dir = os.path.join(base_dir, "extracted_frames")
    processed_dir = os.path.join(base_dir, "processed_frames")
    model_dir = os.path.join(base_dir, "models")
    model_path = os.path.join(model_dir, "yolov8n.pt")

    # Auto-download model if missing
    if not os.path.exists(model_path):
        logger.info("YOLOv8n model not found. Downloading...")
        import urllib.request

        os.makedirs(model_dir, exist_ok=True)
        urllib.request.urlretrieve(
            "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolov8n.pt",
            model_path,
        )
        logger.info(f"Model saved to {model_path}")

    # Pick first video in input_videos/
    video_files = [
        f
        for f in os.listdir(input_dir)
        if f.lower().endswith((".mp4", ".avi", ".mov", ".mkv"))
    ]
    if not video_files:
        logger.error(f"No video files found in {input_dir}.")
        return

    video_path = os.path.join(input_dir, video_files[0])

    result = run_pipeline(
        video_path=video_path,
        output_dir=output_dir,
        model_path=model_path,
        extracted_dir=extracted_dir,
        processed_dir=processed_dir,
        target_fps=30,
        on_frame=None,
    )

    if result:
        summary = result["detection"]["summary"]
        logger.info(f"Team 1 (green): {summary['team1_total']}")
        logger.info(f"Team 2 (white): {summary['team2_total']}")
    
    logger.info("PIPELINE COMPLETE")


if __name__ == "__main__":
    main()
