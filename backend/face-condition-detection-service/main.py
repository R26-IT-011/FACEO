import base64
import logging
import os
import cv2
from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
from ultralytics import YOLO

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("face-condition-service")

app = Flask(__name__)
CORS(app)


def resolve_model_path(candidates: list[str]) -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for name in candidates:
        p = os.path.join(base_dir, name)
        if os.path.exists(p):
            return p
    return os.path.join(base_dir, candidates[0])


# relative paths භාවිතයෙන් YOLO Models 2ම Load කරගැනීම (best_model1.pt / best1.pt & best_model2.pt / best2.pt)
MODEL1_PATH = resolve_model_path(["best_model1.pt", "best1.pt", "model1.pt"])
MODEL2_PATH = resolve_model_path(["best_model2.pt", "best2.pt", "model2.pt"])

model1 = None
model2 = None

try:
    if os.path.exists(MODEL1_PATH):
        model1 = YOLO(MODEL1_PATH)
        logger.info(f"Loaded YOLOv8 (Model 1) successfully: {model1.names}")
    else:
        logger.warning(f"Model 1 not found at {MODEL1_PATH}")
except Exception as e:
    logger.error(f"Failed to load Model 1 ({MODEL1_PATH}): {e}")

try:
    if os.path.exists(MODEL2_PATH):
        model2 = YOLO(MODEL2_PATH)
        logger.info(f"Loaded YOLOv11 (Model 2) successfully: {model2.names}")
    else:
        logger.warning(f"Model 2 not found at {MODEL2_PATH}")
except Exception as e:
    logger.error(f"Failed to load Model 2 ({MODEL2_PATH}): {e}")


def get_marks(image_bytes: bytes, model_choice: str = "both"):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return [], ""

    results1, results2 = [], []
    choice_lower = (model_choice or "both").lower()

    # Frontend එකෙන් එවන model_choice (yolov8, yolov11, model1, model2, both) අනුව prediction සිදුකිරීම
    if choice_lower in ["yolov8", "model1", "both"]:
        if model1 is not None:
            results1 = model1.predict(source=img, conf=0.25, verbose=False)

    if choice_lower in ["yolov11", "model2", "both"]:
        if model2 is not None:
            results2 = model2.predict(source=img, conf=0.25, verbose=False)

    # If requested model was not loaded, fallback to available one
    if not results1 and not results2:
        active_model = model1 or model2
        if active_model is not None:
            results1 = active_model.predict(source=img, conf=0.25, verbose=False)

    annotated_img = img.copy()
    if len(results1) > 0:
        annotated_img = results1[0].plot()
    elif len(results2) > 0:
        annotated_img = results2[0].plot()

    _, buffer = cv2.imencode(".jpg", annotated_img)
    img_base64 = base64.b64encode(buffer).decode("utf-8")
    img_data_url = f"data:image/jpeg;base64,{img_base64}"

    marks_detail = []

    # Model 1 detections එකතු කිරීම
    for r in results1:
        for box in r.boxes:
            coords = box.xywhn[0].tolist()
            cls_id = int(box.cls[0])
            label = model1.names.get(cls_id, f"Mark_{cls_id}") if model1 else f"Mark_{cls_id}"
            marks_detail.append({
                "class": label,
                "confidence": float(box.conf[0]),
                "x": coords[0],
                "y": coords[1],
                "source_model": "YOLOv8",
            })

    # Model 2 detections එකතු කිරීම
    for r in results2:
        for box in r.boxes:
            coords = box.xywhn[0].tolist()
            cls_id = int(box.cls[0])
            label = model2.names.get(cls_id, f"Mark_{cls_id}") if model2 else f"Mark_{cls_id}"
            marks_detail.append({
                "class": label,
                "confidence": float(box.conf[0]),
                "x": coords[0],
                "y": coords[1],
                "source_model": "YOLOv11",
            })

    return marks_detail, img_data_url


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "Face Condition Detection Service Active",
        "port": 8003,
        "models": {
            "yolov8_loaded": model1 is not None,
            "yolov11_loaded": model2 is not None
        }
    })


@app.route("/compare", methods=["POST"])
def compare_criminal():
    try:
        if "evidence" not in request.files or "suspects" not in request.files:
            return jsonify({"status": "error", "error": "Please upload case evidence and suspect images"}), 400

        # React Frontend එකෙන් එවන selected model එක (Default = 'both')
        model_choice = request.form.get("model_choice", "both")

        e_bytes = request.files["evidence"].read()
        e_marks, e_visual = get_marks(e_bytes, model_choice)

        suspect_files = request.files.getlist("suspects")
        final_results = []

        for s_file in suspect_files:
            s_bytes = s_file.read()
            s_marks, s_visual = get_marks(s_bytes, model_choice)

            total_score = 0.0

            # Evidence & Suspect marks සැසඳීම
            for em in e_marks:
                best_match_for_this_mark = 0.0
                for sm in s_marks:
                    if em["class"] == sm["class"]:
                        # Distance based similarity
                        dist = np.sqrt((em["x"] - sm["x"]) ** 2 + (em["y"] - sm["y"]) ** 2)
                        loc_sim = max(0.0, 1.0 - float(dist))

                        # Confidence similarity
                        conf_sim = 1.0 - abs(float(em["confidence"]) - float(sm["confidence"]))

                        # Weighted combination (70% Location, 30% Confidence)
                        combined_sim = (loc_sim * 0.7) + (conf_sim * 0.3)

                        if combined_sim > best_match_for_this_mark:
                            best_match_for_this_mark = combined_sim

                total_score += best_match_for_this_mark

            # Average match percentage ගණනය කිරීම
            match_percent = (
                (total_score / len(e_marks) * 100.0) if len(e_marks) > 0 else 0.0
            )

            final_results.append({
                "filename": s_file.filename,
                "match_percent": round(match_percent, 2),
                "marks_found": s_marks,
                "suspect_visual": s_visual,
            })

        final_results = sorted(final_results, key=lambda x: x["match_percent"], reverse=True)

        return jsonify({
            "status": "success",
            "selected_model": model_choice,
            "evidence_marks": e_marks,
            "evidence_image": e_visual,
            "results": final_results,
        })

    except Exception as e:
        logger.error(f"Compare error: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/analyze-image", methods=["POST"])
def analyze_single_image():
    """Single image analysis endpoint for compatibility."""
    try:
        if "file" not in request.files:
            return jsonify({"status": "error", "error": "No image file uploaded"}), 400

        model_choice = request.form.get("model_choice") or request.args.get("model", "both")
        file_bytes = request.files["file"].read()
        marks, visual = get_marks(file_bytes, model_choice)

        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        h, w = img.shape[:2] if img is not None else (480, 640)

        return jsonify({
            "status": "success",
            "data": {
                "detections": marks,
                "totalDetections": len(marks),
                "avgConfidence": round(sum(float(m["confidence"]) * 100 for m in marks) / len(marks)) if marks else 0,
                "selectedModel": model_choice,
                "sessionType": "upload",
                "imageWidth": w,
                "imageHeight": h,
                "annotatedImage": visual
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8003))
    logger.info(f"Starting Face Condition Detection Service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
