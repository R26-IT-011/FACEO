import base64
import logging
import os
import sys
import uuid
from typing import Optional

import cv2
from fastapi import FastAPI, File, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from ultralytics import YOLO

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("face-condition-service")

app = FastAPI(title="Faceo Analytics — Face Condition & Marks Detection Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def resolve_model_path(filenames: list[str]) -> Optional[str]:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for name in filenames:
        path = os.path.join(base_dir, name)
        if os.path.exists(path):
            return path
    return None


# Locate and load YOLOv8 (Model 1) and YOLOv11 (Model 2)
MODEL1_PATH = resolve_model_path(["best_model1.pt", "best1.pt", "model1.pt"])
MODEL2_PATH = resolve_model_path(["best_model2.pt", "best2.pt", "model2.pt"])

model1 = None
model2 = None

try:
    if MODEL1_PATH:
        model1 = YOLO(MODEL1_PATH)
        logger.info(f"Loaded YOLOv8 model from {MODEL1_PATH}: {model1.names}")
    else:
        logger.warning("YOLO Model 1 file not found.")
except Exception as e:
    logger.error(f"Error loading Model 1: {e}")

try:
    if MODEL2_PATH:
        model2 = YOLO(MODEL2_PATH)
        logger.info(f"Loaded YOLOv11 model from {MODEL2_PATH}: {model2.names}")
    else:
        logger.warning("YOLO Model 2 file not found.")
except Exception as e:
    logger.error(f"Error loading Model 2: {e}")

sessions = {}


def run_yolo_detection(img: np.ndarray, model_choice: str = "yolov8") -> tuple[list[dict], str]:
    """Run detection using the selected YOLO model (yolov8 or yolov11)."""
    h, w = img.shape[:2]
    model_choice_lower = (model_choice or "yolov8").lower().strip()

    # Determine which model instance to use
    selected_model = None
    model_display_name = "YOLOv8"

    if "11" in model_choice_lower or "model2" in model_choice_lower:
        selected_model = model2 if model2 is not None else model1
        model_display_name = "YOLOv11"
    else:
        selected_model = model1 if model1 is not None else model2
        model_display_name = "YOLOv8"

    detections = []
    annotated_b64 = ""

    if selected_model is not None:
        try:
            results = selected_model.predict(source=img, conf=0.25, verbose=False)
            if results and len(results) > 0:
                res = results[0]
                # Plot annotated image
                try:
                    annotated_plot = res.plot()
                    _, buf = cv2.imencode(".jpg", annotated_plot)
                    annotated_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}"
                except Exception:
                    pass

                for box in res.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    label = selected_model.names.get(cls_id, f"Mark_{cls_id}")

                    # Ensure coordinates are within image boundaries
                    x = max(0, int(x1))
                    y = max(0, int(y1))
                    bw = max(1, int(x2 - x1))
                    bh = max(1, int(y2 - y1))

                    detections.append({
                        "label": label,
                        "confidence": round(conf * 100),
                        "bbox": {"x": x, "y": y, "w": bw, "h": bh},
                        "source_model": model_display_name,
                    })
        except Exception as e:
            logger.error(f"Inference error with {model_display_name}: {e}")

    return detections, annotated_b64


@app.get("/")
def health_check():
    return {
        "status": "Face Condition Detection Service Active",
        "port": 8003,
        "models": {
            "yolov8_loaded": model1 is not None,
            "yolov11_loaded": model2 is not None,
        }
    }


@app.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    model: Optional[str] = Query("yolov8"),
    model_choice: Optional[str] = Form(None)
):
    """Analyze a single uploaded face image using YOLOv8 or YOLOv11."""
    chosen_model = model_choice or model or "yolov8"

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"status": "error", "error": "Invalid or corrupt image"}

    h, w = img.shape[:2]
    detections, annotated_image = run_yolo_detection(img, chosen_model)

    avg_conf = (
        round(sum(d["confidence"] for d in detections) / len(detections))
        if detections
        else 0
    )

    model_display_name = "YOLOv11" if ("11" in chosen_model.lower() or "2" in chosen_model.lower()) else "YOLOv8"

    return {
        "status": "success",
        "data": {
            "detections": detections,
            "totalDetections": len(detections),
            "avgConfidence": avg_conf,
            "selectedModel": model_display_name,
            "sessionType": "upload",
            "imageWidth": w,
            "imageHeight": h,
            "annotatedImage": annotated_image if annotated_image else None
        }
    }


@app.post("/analyze-live-session")
async def analyze_live_session(
    frames: list[UploadFile] = File(...),
    model: Optional[str] = Query("yolov8")
):
    """Analyze a sequence of live webcam frames using the selected model."""
    session_id = str(uuid.uuid4())[:8]
    chosen_model = model or "yolov8"
    all_detections = []
    timeline = []

    for frame_file in frames:
        contents = await frame_file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            dets, _ = run_yolo_detection(img, chosen_model)
            timeline.append(len(dets))
            all_detections.extend(dets)

    # Deduplicate / aggregate by keeping highest confidence per label
    best_per_label = {}
    for d in all_detections:
        lbl = d["label"]
        if lbl not in best_per_label or d["confidence"] > best_per_label[lbl]["confidence"]:
            best_per_label[lbl] = d

    aggregated_detections = list(best_per_label.values())
    avg_conf = (
        round(sum(d["confidence"] for d in aggregated_detections) / len(aggregated_detections))
        if aggregated_detections
        else 0
    )

    model_display_name = "YOLOv11" if ("11" in chosen_model.lower() or "2" in chosen_model.lower()) else "YOLOv8"

    session_data = {
        "sessionId": session_id,
        "detections": aggregated_detections,
        "totalDetections": len(aggregated_detections),
        "avgConfidence": avg_conf,
        "timeline": timeline,
        "selectedModel": model_display_name,
        "sessionType": "live",
        "duration": len(frames),
    }

    sessions[session_id] = session_data
    return {"status": "success", "data": session_data}


@app.post("/compare")
async def compare_criminal(
    evidence: UploadFile = File(...),
    suspects: list[UploadFile] = File(...),
    model_choice: Optional[str] = Form("both")
):
    """Evidence & Suspect facial marks matching endpoint."""
    try:
        e_bytes = await evidence.read()
        e_img = cv2.imdecode(np.frombuffer(e_bytes, np.uint8), cv2.IMREAD_COLOR)
        if e_img is None:
            return {"status": "error", "error": "Invalid evidence image"}

        e_marks, e_visual = run_yolo_detection(e_img, model_choice or "both")
        h_e, w_e = e_img.shape[:2]

        # Normalized coordinates for matching
        normalized_e_marks = []
        for m in e_marks:
            bx = m["bbox"]
            normalized_e_marks.append({
                "class": m["label"],
                "confidence": m["confidence"] / 100.0,
                "x": (bx["x"] + bx["w"] / 2) / w_e,
                "y": (bx["y"] + bx["h"] / 2) / h_e
            })

        final_results = []
        for s_file in suspects:
            s_bytes = await s_file.read()
            s_img = cv2.imdecode(np.frombuffer(s_bytes, np.uint8), cv2.IMREAD_COLOR)
            if s_img is None:
                continue

            h_s, w_s = s_img.shape[:2]
            s_marks, s_visual = run_yolo_detection(s_img, model_choice or "both")

            normalized_s_marks = []
            for sm in s_marks:
                bx = sm["bbox"]
                normalized_s_marks.append({
                    "class": sm["label"],
                    "confidence": sm["confidence"] / 100.0,
                    "x": (bx["x"] + bx["w"] / 2) / w_s,
                    "y": (bx["y"] + bx["h"] / 2) / h_s
                })

            total_score = 0.0
            for em in normalized_e_marks:
                best_match_for_this_mark = 0.0
                for sm in normalized_s_marks:
                    if em["class"] == sm["class"]:
                        dist = float(np.sqrt((em["x"] - sm["x"]) ** 2 + (em["y"] - sm["y"]) ** 2))
                        loc_sim = max(0.0, 1.0 - dist)
                        conf_sim = 1.0 - abs(em["confidence"] - sm["confidence"])
                        combined_sim = (loc_sim * 0.7) + (conf_sim * 0.3)
                        if combined_sim > best_match_for_this_mark:
                            best_match_for_this_mark = combined_sim
                total_score += best_match_for_this_mark

            match_percent = (
                (total_score / len(normalized_e_marks) * 100.0)
                if len(normalized_e_marks) > 0
                else 0.0
            )

            final_results.append({
                "filename": s_file.filename,
                "match_percent": round(match_percent, 2),
                "marks_found": s_marks,
                "suspect_visual": s_visual,
            })

        final_results = sorted(final_results, key=lambda x: x["match_percent"], reverse=True)

        return {
            "status": "success",
            "selected_model": model_choice,
            "evidence_marks": e_marks,
            "evidence_image": e_visual,
            "results": final_results,
        }
    except Exception as e:
        logger.error(f"Compare error: {e}")
        return {"status": "error", "error": str(e)}


@app.get("/session/{session_id}")
def get_session(session_id: str):
    if session_id in sessions:
        return {"status": "success", "data": sessions[session_id]}
    return {"status": "error", "error": "Session not found"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)
