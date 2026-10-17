import os
import sys

# Ensure backend module is importable from root or standalone
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np

import requests

from utils.skin_analysis import analyze_skin

app = FastAPI(title="Human Authenticity API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "Backend Active"}

@app.post("/api/analyze-frame")
async def analyze_frame(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Execute Module 4 (Developer 4)
    skin_data = analyze_skin(img)
    
    # Execute Module 3 (Deepfake Service via HTTP)
    try:
        deepfake_url = os.environ.get("DEEPFAKE_SERVICE_URL", "http://localhost:8004")
        df_res = requests.post(f"{deepfake_url}/analyze-image", files={"file": ("frame.jpg", contents, "image/jpeg")})
        if df_res.status_code == 200:
            authenticity_data = df_res.json().get("data", {})
        else:
            authenticity_data = {"authenticity": "ERROR", "confidence": 0}
    except Exception as e:
        print("Error calling deepfake service:", e)
        authenticity_data = {"authenticity": "OFFLINE", "confidence": 0}

    return {
        "status": "success",
        "skin_analysis": skin_data,
        "deepfake_analysis": authenticity_data
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
