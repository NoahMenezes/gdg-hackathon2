import cv2
import os
from tqdm import tqdm
import logging

logger = logging.getLogger("visionplay")

def rebuild_video(input_dir, output_video_path, fps=30):
    """
    Stitch processed frames into a final video file.
    """
    frame_files = sorted([f for f in os.listdir(input_dir) if f.endswith('.jpg')])
    if not frame_files:
        logger.error("No processed frames found to rebuild video.")
        return False

    # Get dimensions from first frame
    first_frame = cv2.imread(os.path.join(input_dir, frame_files[0]))
    height, width, layers = first_frame.shape
    size = (width, height)

    # Primary choice for browser/linux compatibility: mp4v
    # Falling back to XVID if needed. avc1 is often problematic with OpenCV/FFMPEG
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, size)
    
    if not out.isOpened():
        logger.warning("mp4v codec failed, falling back to XVID")
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        out = cv2.VideoWriter(output_video_path, fourcc, fps, size)

    logger.info(f"Rebuilding video at {width}x{height}, {fps} FPS...")
    
    pbar = tqdm(total=len(frame_files), desc="Rebuilding Video")
    
    for frame_file in frame_files:
        frame_path = os.path.join(input_dir, frame_file)
        frame = cv2.imread(frame_path)
        out.write(frame)
        pbar.update(1)
        
    out.release()
    pbar.close()
    logger.info(f"Video saved to: {output_video_path}")
    return True
