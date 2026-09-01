import os
import sys
import uuid
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from predictor import predict_emotions, aggregate_emotion_session

app = FastAPI(title="Faceo Analytics — Emotion Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = {}


@app.get("/")
def health_check():
    return {"status": "Emotion Service Active", "port": 8002}


@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    result = predict_emotions(img)
    return {"status": "success", "data": result}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Backward-compatible endpoint returning exact Flask app.py response structure."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    result = predict_emotions(img)
    if not result.get("face_found", False):
        return {
            "emotion": None,
            "confidence": 0.0,
            "face_found": False,
            "ssd_person_found": result.get("ssd_person_found", False)
        }

    return {
        "confidence": result["confidence"],
        "emotion": result["emotion"],
        "face_box": result["face_box"],
        "face_confidence": result["face_confidence"],
        "face_found": result["face_found"],
        "landmarks": result["landmarks"],
        "ssd_person_found": result["ssd_person_found"]
    }



@app.post("/analyze-live-session")
async def analyze_live_session(frames: list[UploadFile] = File(...)):
    session_id = str(uuid.uuid4())[:8]
    frame_results = []

    for frame_file in frames:
        contents = await frame_file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            frame_results.append(predict_emotions(img))

    aggregated = aggregate_emotion_session(frame_results)
    aggregated["sessionId"] = session_id
    sessions[session_id] = aggregated

    return {"status": "success", "data": aggregated}


@app.get("/session/{session_id}")
def get_session(session_id: str):
    if session_id in sessions:
        return {"status": "success", "data": sessions[session_id]}
    return {"status": "error", "error": "Session not found"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
