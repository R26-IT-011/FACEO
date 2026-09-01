import os
import sys
import uuid
from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np

# Import predictor
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from predictor import predict_age_gender, aggregate_session, MODEL_REGISTRY

app = FastAPI(title="Faceo Analytics — Age & Gender Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store
sessions = {}


@app.get("/")
def health_check():
    return {
        "status": "Age & Gender Service Active",
        "port": 8001,
        "supportedModels": list(MODEL_REGISTRY.keys()),
    }


@app.get("/models")
def get_available_models():
    return {
        "status": "success",
        "models": [
            {
                "id": k,
                "name": v["name"],
                "badge": v["badge"],
                "description": v["description"],
            }
            for k, v in MODEL_REGISTRY.items()
        ],
    }


@app.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    model: str = Query("fairface", description="Selected model architecture"),
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    result = predict_age_gender(img, model_name=model)
    return {"status": "success", "data": result}


@app.post("/analyze-live-session")
async def analyze_live_session(
    frames: list[UploadFile] = File(...),
    model: str = Query("fairface", description="Selected model architecture"),
):
    session_id = str(uuid.uuid4())[:8]
    frame_results = []

    for frame_file in frames:
        contents = await frame_file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            frame_results.append(predict_age_gender(img, model_name=model))

    aggregated = aggregate_session(frame_results, model_name=model)
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
    uvicorn.run(app, host="0.0.0.0", port=8001)
