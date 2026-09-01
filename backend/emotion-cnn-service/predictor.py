import os
import torch
import torch.nn as nn
import cv2
import numpy as np
from PIL import Image
from mtcnn import MTCNN
from torchvision import transforms
from collections import Counter


class EmotionCNN(nn.Module):
    """Custom VGG-like CNN with BatchNorm for Emotion Detection."""

    def __init__(self, num_classes=5):
        super(EmotionCNN, self).__init__()

        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),   # 0
            nn.BatchNorm2d(32),                            # 1
            nn.ReLU(inplace=True),                         # 2
            nn.MaxPool2d(2, 2),                            # 3
            nn.Conv2d(32, 64, kernel_size=3, padding=1),   # 4
            nn.BatchNorm2d(64),                            # 5
            nn.ReLU(inplace=True),                         # 6
            nn.MaxPool2d(2, 2),                            # 7
            nn.Conv2d(64, 128, kernel_size=3, padding=1),  # 8
            nn.BatchNorm2d(128),                           # 9
            nn.ReLU(inplace=True),                         # 10
            nn.MaxPool2d(2, 2),                            # 11
            nn.Conv2d(128, 256, kernel_size=3, padding=1), # 12
            nn.BatchNorm2d(256),                           # 13
            nn.ReLU(inplace=True),                         # 14
            nn.MaxPool2d(2, 2),                            # 15
            nn.Conv2d(256, 256, kernel_size=3, padding=1), # 16
            nn.BatchNorm2d(256),                           # 17
            nn.ReLU(inplace=True),                         # 18
            nn.MaxPool2d(2, 2),                            # 19
        )

        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))

        self.classifier = nn.Sequential(
            nn.Dropout(0.5),           # 0
            nn.ReLU(inplace=True),     # 1
            nn.Linear(256, 128),       # 2
            nn.Dropout(0.5),           # 3
            nn.ReLU(inplace=True),     # 4
            nn.Linear(128, num_classes), # 5
        )

    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x


# Configuration & Model Loading
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FINAL_MODEL_PATH = os.path.join(BASE_DIR, "model", "face_emotion_cnn 110.pth")
if not os.path.exists(FINAL_MODEL_PATH):
    FINAL_MODEL_PATH = os.path.join(BASE_DIR, "face_emotion_cnn 110.pth")

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

if os.path.exists(FINAL_MODEL_PATH):
    checkpoint = torch.load(FINAL_MODEL_PATH, map_location=DEVICE, weights_only=False)

    NUM_CLASSES = checkpoint.get("num_classes", 5)
    CLASS_NAMES = checkpoint.get("class_names", ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"])
    IMG_SIZE = checkpoint.get("img_size", 224)

    norm_mean = checkpoint.get("normalization", {}).get("mean", [0.485, 0.456, 0.406])
    norm_std = checkpoint.get("normalization", {}).get("std", [0.229, 0.224, 0.225])

    emotion_model = EmotionCNN(num_classes=NUM_CLASSES).to(DEVICE)
    emotion_model.load_state_dict(checkpoint["model_state_dict"])
    emotion_model.eval()
    MODEL_LOADED = True
else:
    print(f"[WARNING] Model file not found at {FINAL_MODEL_PATH}")
    MODEL_LOADED = False
    CLASS_NAMES = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
    IMG_SIZE = 224
    norm_mean = [0.485, 0.456, 0.406]
    norm_std = [0.229, 0.224, 0.225]

# Load MTCNN face detector
mtcnn = MTCNN(device=str(DEVICE))

eval_tfms = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=norm_mean, std=norm_std),
])

EMOTIONS = CLASS_NAMES


def rotate_align_face(img_bgr: np.ndarray, keypoints: dict) -> np.ndarray:
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


def predict_emotions(img_bgr: np.ndarray) -> dict:
    """Predict emotion using PyTorch EmotionCNN model with MTCNN face alignment."""
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

    # MTCNN detects face + landmarks
    detections = mtcnn.detect_faces(rgb)
    if not detections:
        return {
            "dominant": "neutral",
            "confidence": 0,
            "emotions": {e: 0 for e in EMOTIONS},
            "trend": [0],
            "sessionType": "upload",
            "face_found": False,
            "error": "No face detected"
        }

    # Select largest face
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
        logits = emotion_model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
        idx = int(probs.argmax())

    scores = {c: round(float(p) * 100, 1) for c, p in zip(CLASS_NAMES, probs)}
    dominant = CLASS_NAMES[idx]
    raw_confidence = float(probs[idx])
    raw_face_confidence = float(det.get("confidence", 0.0))

    return {
        "emotion": dominant,
        "confidence": raw_confidence,
        "face_found": True,
        "face_confidence": raw_face_confidence,
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
