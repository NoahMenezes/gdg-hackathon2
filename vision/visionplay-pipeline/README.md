# VisionPlay Detection Pipeline

A complete, lightweight real-time object detection pipeline using Python, OpenCV, and YOLOv8n.

## ✨ Features
- **Lightweight Inference**: Uses YOLOv8n (the smallest YOLOv8 model).
- **CPU Optimized**: Designed to run smoothly on standard CPUs.
- **Modular Pipeline**: Separate scripts for extraction, detection, and reconstruction.
- **Real-time Visualization**: Live display of detections with FPS and object counts.
- **Progress Tracking**: Uses `tqdm` for all long-running tasks.
- **Clean Output**: Annotates frames with modern bounding boxes and reconstructs a smooth 30 FPS MP4 video.

## 📂 Project Structure
```text
visionplay_detection_pipeline/
├── input_videos/       # Place your source videos here
├── output_videos/      # Final annotated videos appear here
├── extracted_frames/   # Raw frames (auto-cleaned)
├── processed_frames/   # Annotated frames (auto-cleaned)
├── models/             # YOLO weights
├── src/                # Source code
└── requirements.txt    # Dependencies
```

## 🚀 Setup Instructions

### 1. Create Virtual Environment
```bash
# Linux/macOS
python3 -m venv .venv
source .venv/bin/activate

# Windows
python -m venv .venv
.venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Usage
1. Place a video file (MP4, AVI, etc.) into the `input_videos/` folder.
2. Run the main script:
```bash
python src/main.py
```

### 4. Controls during processing
- Press **'q'** in the live window to stop detection and proceed to video reconstruction.

## 🛠️ Performance Stats
- **Model**: YOLOv8n (Nano)
- **FPS**: ~20-60+ FPS on modern CPUs
- **RAM Usage**: Minimal (frame-by-frame processing)
- **VRAM**: Not required (CPU mode)

## 🔧 Troubleshooting
- **No Video Found**: Ensure your video is in the `input_videos/` folder and has a supported extension (.mp4, .avi, etc.).
- **Slow Processing**: YOLOv8n is very fast, but 4K videos may still take time. Consider resizing input videos for faster results.
- **GUI Errors**: If you are on a server without a display, comment out `cv2.imshow` and `cv2.destroyAllWindows` in `src/detect_objects.py`.
# visionplay-pipeline
