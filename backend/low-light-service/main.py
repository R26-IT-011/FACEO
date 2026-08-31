"""Low-Light Facial Emotion Recognition API with FastAPI."""
import os
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from tensorflow.keras.models import load_model

# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

IMG_SIZE = (224, 224)

CLASS_NAMES = ["Angry", "Fear", "Happy", "Neutral", "Sad"]

MODEL_PATH = BASE_DIR / "low_light_emotion_cnn.keras"

SSD_DIR = BASE_DIR / "ssd_mobilenet_face_detector"
PROTO = SSD_DIR / "deploy.prototxt"
FACE_MODEL = SSD_DIR / "res10_300x300_ssd_iter_140000.caffemodel"

UPLOAD_FOLDER = BASE_DIR / "uploads"

# ============================================================
# CHECK FILES
# ============================================================

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Emotion model not found: {MODEL_PATH}")

if not PROTO.exists():
    raise FileNotFoundError(f"SSD prototxt not found: {PROTO}")

if not FACE_MODEL.exists():
    raise FileNotFoundError(f"SSD model not found: {FACE_MODEL}")

# ============================================================
# LOAD EMOTION MODEL
# ============================================================

print("Loading emotion model...")
model = load_model(MODEL_PATH)
print("Emotion model loaded successfully.")

# ============================================================
# LOAD SSD FACE DETECTOR
# ============================================================

print("Loading SSD face detector...")
face_net = cv2.dnn.readNetFromCaffe(str(PROTO), str(FACE_MODEL))
print("SSD face detector loaded successfully.")

# ============================================================
# FACE DETECTION
# ============================================================

def detect_faces(image_bgr, threshold=0.50):
    h, w = image_bgr.shape[:2]

    blob = cv2.dnn.blobFromImage(
        cv2.resize(image_bgr, (300, 300)),
        1.0, (300, 300), (104.0, 177.0, 123.0),
    )
    face_net.setInput(blob)
    detections = face_net.forward()

    results = []
    for i in range(detections.shape[2]):
        confidence = float(detections[0, 0, i, 2])
        if confidence < threshold:
            continue

        box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
        x1, y1, x2, y2 = box.astype(int)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)

        if x2 > x1 and y2 > y1:
            results.append((x1, y1, x2, y2, confidence))

    return results

# ============================================================
# LOW-LIGHT ENHANCEMENT
# ============================================================

def enhance_low_light(face_bgr, gamma=1.15):
    lab = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)

    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

    inv_gamma = 1.0 / gamma
    table = np.array(
        [((i / 255.0) ** inv_gamma) * 255 for i in range(256)]
    ).astype(np.uint8)

    return cv2.LUT(enhanced, table)

# ============================================================
# PREDICT IMAGE
# ============================================================

def predict_image_from_path(image_path, face_threshold=0.50):
    image = cv2.imread(str(image_path))
    if image is None:
        return [], f"Could not read image: {image_path}"

    detections = detect_faces(image, face_threshold)
    predictions = []

    for x1, y1, x2, y2, face_conf in detections:
        face = image[y1:y2, x1:x2]
        if face.size == 0:
            continue

        # Low-light enhancement
        face = enhance_low_light(face)

        # Resize for CNN
        face = cv2.resize(face, IMG_SIZE)

        # BGR -> RGB
        face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)

        # Add batch dimension
        tensor = np.expand_dims(face.astype(np.float32), axis=0)

        # Predict emotion
        probabilities = model.predict(tensor, verbose=0)[0]

        index = int(np.argmax(probabilities))
        emotion = CLASS_NAMES[index]
        emotion_conf = float(probabilities[index])

        predictions.append({
            "emotion": emotion,
            "emotion_confidence": emotion_conf,
            "face_confidence": float(face_conf),
            "box": [int(x1), int(y1), int(x2), int(y2)],
        })

    return predictions, None

# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(title="Low-Light Facial Emotion Recognition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "status": "success",
        "message": "Emotion Recognition API is running",
        "docs": "/docs",
    }

# ============================================================
# PREDICT
# ============================================================

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No selected file")

    filepath = os.path.join(UPLOAD_FOLDER, os.path.basename(file.filename))

    try:
        with open(filepath, "wb") as f:
            f.write(await file.read())

        predictions, error = predict_image_from_path(filepath)

        if error:
            raise HTTPException(status_code=500, detail=error)

        if not predictions:
            return {
                "message": "No face detected or prediction could be made.",
                "predictions": [],
            }

        return {"predictions": predictions}

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

# ============================================================
# ANALYZE IMAGE (Standard Microservice Endpoint)
# ============================================================

@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    res = await predict(file)
    return {"status": "success", "data": res}

# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)