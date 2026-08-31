import os
import torch
import cv2
import numpy as np
from PIL import Image
from mtcnn import MTCNN
from torchvision import transforms, models
from collections import Counter
from torchvision.models.detection import (
    ssdlite320_mobilenet_v3_large,
    SSDLite320_MobileNet_V3_Large_Weights
)

# Configuration & Model Loading
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FINAL_MODEL_PATH = os.path.join(BASE_DIR, "model", "best_model.pth")

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

if os.path.exists(FINAL_MODEL_PATH):
    checkpoint = torch.load(FINAL_MODEL_PATH, map_location=DEVICE, weights_only=False)

    CLASS_NAMES = checkpoint.get("class_names", ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"])
    IMG_SIZE = checkpoint.get("img_size", 224)
    EMOTION_BACKBONE = checkpoint.get("emotion_backbone", "MobileNetV3-Large")

    emotion_state = checkpoint["emotion_model"]
    NUM_CLASSES = emotion_state["classifier.3.weight"].shape[0]
    if len(CLASS_NAMES) < NUM_CLASSES:
        while len(CLASS_NAMES) < NUM_CLASSES:
            CLASS_NAMES.append(f"Emotion_{len(CLASS_NAMES)}")

    if EMOTION_BACKBONE == "MobileNetV3-Large":
        emotion_model = models.mobilenet_v3_large(weights=None)
        in_features = emotion_model.classifier[-1].in_features
        emotion_model.classifier[-1] = torch.nn.Linear(in_features, NUM_CLASSES)
    else:
        raise ValueError(f"Unsupported emotion backbone: {EMOTION_BACKBONE}")

    emotion_model.load_state_dict(emotion_state)
    emotion_model = emotion_model.to(DEVICE)
    emotion_model.eval()
    MODEL_LOADED = True
else:
    print(f"[WARNING] Model file not found at {FINAL_MODEL_PATH}")
    MODEL_LOADED = False
    CLASS_NAMES = ["angry", "happy", "sad", "neutral", "fear", "disgust", "surprise"]
    IMG_SIZE = 224

# Load MTCNN
mtcnn = MTCNN(device=str(DEVICE))

# Load SSD MobileNetV3
ssd_weights = SSDLite320_MobileNet_V3_Large_Weights.DEFAULT
ssd_model = ssdlite320_mobilenet_v3_large(weights=ssd_weights)
ssd_model = ssd_model.to(DEVICE).eval()
ssd_preprocess = ssd_weights.transforms()
ssd_categories = ssd_weights.meta["categories"]

eval_tfms = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

EMOTIONS = CLASS_NAMES


def rotate_align_face(img_bgr, keypoints):
    try:
        left_eye = np.array(keypoints["left_eye"], dtype=np.float32)
        right_eye = np.array(keypoints["right_eye"], dtype=np.float32)
        dx = right_eye[0] - left_eye[0]
        dy = right_eye[1] - left_eye[1]
        angle = np.degrees(np.arctan2(dy, dx))
        center = ((left_eye[0] + right_eye[0]) / 2, (left_eye[1] + right_eye[1]) / 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        h, w = img_bgr.shape[:2]
        aligned = cv2.warpAffine(img_bgr, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
        return aligned
    except Exception:
        return img_bgr


def predict_emotions(img_bgr: np.ndarray, use_ssd: bool = True, ssd_score_threshold: float = 0.40) -> dict:
    """
    Predict emotion using PyTorch MobileNetV3-Large, MTCNN face alignment, and SSD MobileNetV3.
    Matches exact model logic from test/app.py.
    """
    if img_bgr is None or not MODEL_LOADED:
        return {
            "dominant": "neutral",
            "confidence": 0,
            "emotions": {e: 0 for e in EMOTIONS},
            "trend": [0],
            "sessionType": "upload",
            "face_found": False,
            "error": "Invalid image or model not loaded"
        }

    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # Optional SSD stage: detect a person/object region.
    ssd_box = None
    if use_ssd:
        pil = Image.fromarray(rgb)
        x = ssd_preprocess(pil).to(DEVICE)
        with torch.no_grad():
            pred = ssd_model([x])[0]

        candidates = []
        for box, label, score in zip(pred["boxes"], pred["labels"], pred["scores"]):
            if float(score) >= ssd_score_threshold:
                name = ssd_categories[int(label)]
                if name == "person":
                    candidates.append((float(score), box.cpu().numpy()))

        if candidates:
            candidates.sort(reverse=True, key=lambda z: z[0])
            ssd_box = candidates[0][1]

    # MTCNN detects face + landmarks.
    detections = mtcnn.detect_faces(rgb)
    if not detections:
        return {
            "dominant": "neutral",
            "confidence": 0,
            "emotions": {e: 0 for e in EMOTIONS},
            "trend": [0],
            "sessionType": "upload",
            "face_found": False,
            "ssd_person_found": ssd_box is not None,
            "error": "No face detected"
        }

    # Largest face
    det = max(detections, key=lambda r: max(1, r["box"][2]) * max(1, r["box"][3]))
    x, y, w, h = det["box"]
    x, y = max(0, x), max(0, y)

    aligned = rotate_align_face(img_bgr, det["keypoints"])
    ah, aw = aligned.shape[:2]
    x2, y2 = min(aw, x + max(1, w)), min(ah, y + max(1, h))
    face = aligned[y:y2, x:x2]

    if face.size == 0:
        face = img_bgr

    face_rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
    face_pil = Image.fromarray(face_rgb).resize((IMG_SIZE, IMG_SIZE))

    tensor = eval_tfms(face_pil).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        probs = torch.softmax(emotion_model(tensor), dim=1)[0]
        idx = int(probs.argmax())

    # Build emotion dictionary with scores (percentages 0-100)
    scores = {c: round(float(p) * 100, 1) for c, p in zip(CLASS_NAMES, probs)}
    dominant = CLASS_NAMES[idx]
    raw_confidence = float(probs[idx])
    raw_face_confidence = float(det.get("confidence", 0.0))

    return {
        "emotion": dominant,
        "confidence": raw_confidence,
        "face_found": True,
        "face_confidence": raw_face_confidence,
        "ssd_person_found": ssd_box is not None,
        "face_box": [int(x), int(y), int(x2), int(y2)],
        "landmarks": {k: [int(v) for v in pt] for k, pt in det["keypoints"].items()},
        "dominant": dominant,
        "emotions": scores,
        "trend": [round(raw_confidence * 100, 1)],
        "sessionType": "upload",
    }


def aggregate_emotion_session(frame_results: list[dict]) -> dict:
    """Aggregate multiple frame predictions into an emotion session summary."""
    if not frame_results:
        return {
            "dominant": "neutral",
            "confidence": 0,
            "emotions": {e: 0 for e in EMOTIONS},
            "trend": [],
            "emotionFrequency": {e: 0 for e in EMOTIONS},
            "sessionType": "live",
            "duration": 120,
        }

    dominant_counts = Counter(r["dominant"] for r in frame_results if r.get("face_found", True))
    if not dominant_counts:
        dominant_counts = Counter(["neutral"])

    overall_dominant = dominant_counts.most_common(1)[0][0]

    avg_emotions = {}
    for e in EMOTIONS:
        vals = [r["emotions"].get(e, 0) for r in frame_results if "emotions" in r]
        avg_emotions[e] = round(sum(vals) / len(vals), 1) if vals else 0

    all_confs = [r["confidence"] for r in frame_results if "confidence" in r]
    step = max(1, len(all_confs) // 7)
    trend = all_confs[::step][:7] if all_confs else [0]

    total = sum(dominant_counts.values())
    frequency = {e: round(dominant_counts.get(e, 0) / total * 100, 1) for e in EMOTIONS}

    return {
        "dominant": overall_dominant,
        "confidence": avg_emotions.get(overall_dominant, 0),
        "emotions": avg_emotions,
        "trend": trend,
        "emotionFrequency": frequency,
        "sessionType": "live",
        "duration": 120,
    }

