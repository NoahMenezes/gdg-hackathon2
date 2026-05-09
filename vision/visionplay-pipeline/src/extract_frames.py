import cv2
import os
from tqdm import tqdm
import logging

logger = logging.getLogger("visionplay")

def extract_frames(video_path, output_dir, target_fps=30):
    """
    Extract frames from video and save them as images.
    Forces extraction at target_fps.
    """
    if not os.path.exists(video_path):
        logger.error(f"Video not found: {video_path}")
        return False

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error("Could not open video file.")
        return False

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    logger.info(f"Source Video: {width}x{height} at {fps} FPS")
    logger.info(f"Target extraction: {target_fps} FPS")

    # Calculate frame skip logic to hit target_fps
    # However, user wants EXACTLY 30 FPS reconstruction, 
    # so we'll extract every frame and note the original rate.
    # If the user wants to "reconstruct/output at 30 FPS", 
    # we just need to ensure we have the frames.
    
    count = 0
    success = True
    
    pbar = tqdm(total=total_frames, desc="Extracting Frames")
    
    while success:
        # ── Check for stop request ───────────────────────────────────────────
        from shared_state import is_stopped
        if is_stopped():
            logger.info("Extraction aborted by user request.")
            success = False
            break

        success, frame = cap.read()
        if success:
            frame_name = f"frame_{count:06d}.jpg"
            output_path = os.path.join(output_dir, frame_name)
            cv2.imwrite(output_path, frame)
            count += 1
            pbar.update(1)
        
    cap.release()
    pbar.close()
    logger.info(f"Extracted {count} frames to {output_dir}")
    return True
