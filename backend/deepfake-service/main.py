import os
import uuid
import io
import cv2
import numpy as np
import torch
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image

app = FastAPI(title="Faceo Analytics — Deepfake Service (Custom ML)")

# CORS Allowances
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Loading ALL Models into memory at startup
MODEL_PATHS = {
    "swin": "ruchiraRTG/swin_model_final_pro",
    "vit": "ruchiraRTG/vit_model_final_pro",
    "cnn": "ruchiraRTG/cnn_model_final_pro"
}

print("Loading models... This might take a minute...")
processors = {}
models = {}

for name, path in MODEL_PATHS.items():
    try:
        print(f"Loading {name.upper()} model...")
        processors[name] = AutoImageProcessor.from_pretrained(path)
        models[name] = AutoModelForImageClassification.from_pretrained(path)
    except Exception as e:
        print(f"Warning: Failed to load {name.upper()} model: {e}")
print("✅ Models Loading Process Finished!")

# Loading OpenCV Face Detector
# The original code expected the haarcascade file locally. We use cv2's built in one.
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def process_image(pil_image: Image.Image, model_type: str = "swin"):
    # Map frontend model ID 'swin_base' to 'swin'
    if model_type == "swin_base":
        model_type = "swin"

    # Fallback just in case a wrong model name comes
    if model_type not in models:
        model_type = "swin"

    # In case loading failed completely, raise an error
    if model_type not in models:
        raise ValueError(f"Model '{model_type}' is not loaded or unavailable.")

    current_processor = processors[model_type]
    current_model = models[model_type]

    # --- STEP A: Convert PIL to OpenCV format (BGR) ---
    opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    gray_image = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)

    # --- STEP B: Detect Faces ---
    faces = face_cascade.detectMultiScale(gray_image, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    if len(faces) == 0:
        raise ValueError("No clear human face was detected in the image.")

    labels = ["Fake", "Real"]
    found_face = True
    (x, y, w, h) = faces[0]

    import base64
    # 1. Crop face from the PIL image for the Model
    face_crop = pil_image.crop((x, y, x + w, y + h))

    # Draw box on opencv_image
    cv2.rectangle(opencv_image, (x, y), (x + w, y + h), (0, 255, 0), 2)
    _, buffer = cv2.imencode('.jpg', opencv_image)
    result_image_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

    # --- STEP C: AI prediction on Cropped Face ---
    inputs = current_processor(images=face_crop, return_tensors="pt")
    with torch.no_grad():
        outputs = current_model(**inputs)
        logits = outputs.logits
        predicted_class_idx = logits.argmax(-1).item()
        probs = torch.nn.functional.softmax(logits, dim=-1)
        final_confidence = probs[0][predicted_class_idx].item()

    final_prediction_text = labels[predicted_class_idx]

    return {
        "prediction": final_prediction_text,
        "confidence": final_confidence,
        "found_face": found_face,
        "modelUsed": model_type,
        "result_image": result_image_b64
    }

def format_frontend_response(result: dict, original_model_type: str):
    confidence_pct = round(result["confidence"] * 100, 2)
    prediction = result["prediction"]
    
    if prediction == "Real" or prediction == "No Face Detected":
        authenticity = "REAL"
        real_prob = confidence_pct
        fake_prob = round(100.00 - real_prob, 2)
    else:
        authenticity = "AI GENERATED"
        fake_prob = confidence_pct
        real_prob = round(100.00 - fake_prob, 2)

    # Bounding risks
    if real_prob > 80:
        risk = "Low"
    elif real_prob > 50:
        risk = "Medium"
    else:
        risk = "High"

    model_name_display = original_model_type.replace('_', ' ').title()
    
    if authenticity == "REAL":
        reason = f"The {model_name_display} analyzed the facial structures and determined the subject is authentic. No synthetic GAN artifacts or deepfake distortions were detected."
    else:
        reason = f"The {model_name_display} detected synthetic artifacts consistent with AI-generated or deepfake imagery. Further manual verification is recommended."

    return {
        "authenticity": authenticity,
        "realProbability": real_prob,
        "deepfakeProbability": fake_prob,
        "confidence": confidence_pct,
        "riskLevel": risk,
        "reason": reason,
        "sessionType": "upload",
        "selectedModel": model_name_display,
        "metrics": {},
        "resultImage": result.get("result_image")
    }


@app.get("/")
def health_check():
    return {"status": "Deepfake Service Active", "port": 8004}

@app.post("/analyze-image")
async def analyze_image(request: Request, file: UploadFile = File(...)):
    model_type = request.query_params.get("model", "swin_base")
    try:
        request_object_content = await file.read()
        pil_image = Image.open(io.BytesIO(request_object_content)).convert("RGB")
        
        result = process_image(pil_image, model_type)
        data = format_frontend_response(result, model_type)
        
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
