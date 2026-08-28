# 🧠 Human Authenticity Analyzer

> **FACEO** — A real-time facial intelligence platform that analyzes emotion, age & gender, deepfake authenticity, and skin health — all in one unified system.

---

## 📌 Project Status

> **This repository is the canonical source of truth for the project.**
> Team members should fork or clone this repo as their starting point and work on feature branches in their own forks. Do **not** push breaking changes directly to this repo.

---

## ✨ Features

| Module | Description |
|---|---|
|  **Emotion Detection** | Real-time 5-class emotion recognition (Angry, Happy, Sad, Neutral, Fear) |
|  **Age & Gender** | Age regression and gender classification from webcam or uploaded image |
|  **Deepfake Detection** | Authenticity analysis using ELA (Error Level Analysis) + FFT frequency-domain spectral checks |
|  **Skin Analysis** | Skin tone classification (HSV) and blemish/clearness detection (Laplacian variance) |
|  **Bruise/Marks Detection** | Bounding-box detection of bruises, scars, and marks (OpenCV-based, YOLO-ready stub) |

---

##  Architecture Overview

```
Browser (face-api.js — TensorFlow.js)
  │
  ├── Client-side face gate ──── loads weights from /frontend/public/models
  │
  └── ApiClient.ts (fetch) ───── HTTP POST multipart/form-data
        ├── → localhost:8000  (Main API — Skin Analysis)
        ├── → localhost:8001  (Age & Gender — DeepFace / FairFace)
        ├── → localhost:8002  (Emotion — DeepFace / FER2013)
        ├── → localhost:8003  (Bruise & Marks — OpenCV)
        └── → localhost:8004  (Deepfake — ELA + FFT)
```

See [`architecture.md`](./architecture.md) for the full system diagram and data-flow documentation.

---

##  Repository Structure

```
human-authenticity-analyzer/
├── backend/
│   ├── api/                              # Main API gateway (port 8000) — skin analysis
│   ├── age-gender-service/               # Age & Gender microservice   (port 8001)
│   ├── emotion-service/                  # Emotion microservice        (port 8002)
│   ├── face-condition-detection-service/ # Face Condition microservice (port 8003)
│   ├── deepfake-service/                 # Deepfake microservice       (port 8004)
│   └── venv/                             # Python virtual environment  (not committed)
├── frontend/
│   ├── src/                        # Next.js App Router source
│   ├── public/models/              # face-api.js TF.js model weights
│   └── package.json
├── modules/                        # Research/notebook modules per domain
├── docs/
│   └── Architecture.pdf
├── architecture.md
├── components_models_datasets.txt
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Python | ≥ 3.10 |
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |

---

### Step 1 — Clone the Repository

```powershell
git clone https://github.com/GaganaUshan/Faceo-Research-Project-Origin.git
cd Faceo-Research-Project-Origin
```

---

### Step 2 — Set Up the Python Virtual Environment

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install dependencies for all backend services:

```powershell
pip install -r age-gender-service/requirements.txt
pip install -r emotion-service/requirements.txt
pip install -r face-condition-detection-service/requirements.txt
pip install -r deepfake-service/requirements.txt
```

---

### Step 3 — Install Frontend Dependencies

Open a new terminal:

```powershell
cd frontend
npm install
```

---

##  Running the Project

Open **6 separate terminal windows** and run one command in each.
Replace `<PROJECT_ROOT>` with the full path to your cloned folder.

---

### Terminal 1 — Main API · Port `8000`
> Skin Analysis

```powershell
cd <PROJECT_ROOT>\backend; .\venv\Scripts\Activate.ps1; python api/main.py
```

---

### Terminal 2 — Age & Gender Service · Port `8001`

```powershell
cd <PROJECT_ROOT>\backend; .\venv\Scripts\Activate.ps1; python age-gender-service/main.py
```

---

### Terminal 3 — Emotion Service · Port `8002`

```powershell
cd <PROJECT_ROOT>\backend; .\venv\Scripts\Activate.ps1; python emotion-service/main.py
```

---

### Terminal 4 — Face Condition Service · Port `8003`

```powershell
cd <PROJECT_ROOT>\backend; .\venv\Scripts\Activate.ps1; python face-condition-detection-service/main.py
```

---

### Terminal 5 — Deepfake Detection Service · Port `8004`

```powershell
cd <PROJECT_ROOT>\backend; .\venv\Scripts\Activate.ps1; python deepfake-service/main.py
```

---

### Terminal 6 — Frontend · Port `3000`

```powershell
cd <PROJECT_ROOT>\frontend; npm run dev
```

---

###  Service Status Reference

| # | Service | Port | Ready When You See |
|---|---|---|---|
| 1 | Main API (Skin Analysis) | `8000` | `Uvicorn running on http://0.0.0.0:8000` |
| 2 | Age & Gender | `8001` | `Uvicorn running on http://0.0.0.0:8001` |
| 3 | Emotion | `8002` | `Uvicorn running on http://0.0.0.0:8002` |
| 4 | Bruise & Marks | `8003` | `Uvicorn running on http://0.0.0.0:8003` |
| 5 | Deepfake | `8004` | `Uvicorn running on http://0.0.0.0:8004` |
| 6 | Frontend | `3000` | `Local: http://localhost:3000` |

Once all 6 services are running, open **[http://localhost:3000](http://localhost:3000)** in your browser.

> **Tip:** Every FastAPI service has an interactive API docs page at `/docs`
> e.g. [http://localhost:8001/docs](http://localhost:8001/docs) — test any endpoint directly without the frontend.

---

##  Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion 12 |
| Icons | Lucide React |
| Client-side AI | `@vladmandic/face-api` v1.7 (TensorFlow.js) |
| State | React hooks + `sessionStorage` |

### Backend

| Layer | Technology |
|---|---|
| Framework | FastAPI (Python) |
| Server | Uvicorn (ASGI) |
| Image Processing | OpenCV (`opencv-python-headless`) |
| Numerical Computing | NumPy |
| Deep Learning | DeepFace + `tf-keras` |
| File Uploads | `python-multipart` |

---

##  AI Models & Datasets

### Client-side Models (loaded from `/frontend/public/models`)

| Model | Purpose |
|---|---|
| `ssdMobilenetv1` | Primary face detection |
| `tinyFaceDetector` | Lightweight face detection (fallback) |
| `faceLandmark68Net` | 68-point facial landmark mapping |
| `faceExpressionNet` | 7-class emotion recognition |
| `ageGenderNet` | Age regression + gender classification |

### Training Datasets

| Module | Datasets |
|---|---|
| Emotion | FER2013, AffectNet, RAF-DB |
| Age & Gender | IMDB-WIKI, UTKFace, Adience |
| Deepfake | FaceForensics++, DFDC |
| Skin Tone | Fitzpatrick17k, DDI, ACNE04 |

---

##  Key Architecture Patterns

**Dual-Layer Face Detection**
- Client-side gate (face-api.js) validates a face *before* any API call — eliminates wasted requests.
- Server-side inference (DeepFace / OpenCV) handles the heavy ML for high accuracy.

**Graceful Fallback**
- If DeepFace fails to import, every service falls back to a seeded NumPy heuristic — the UI never crashes.

**Session-based Result Transfer**
- Results are stored in `sessionStorage` post-analysis. The `/results/<module>` page reads from it, decoupling analysis from display.

**Microservice Independence**
- Each service is fully independent with its own port and `requirements.txt`. Start or stop any one without affecting others.

---

##  Team Collaboration Guide

This repository is the **source of truth**. Recommended team workflow:

```
[This Repo — Source of Truth]
        │
        ▼
[Team Lead forks → their own GitHub repo]
        │
        ├── feature/emotion-upgrade     (Member A)
        ├── feature/deepfake-model-v2   (Member B)
        ├── feature/skin-yolo           (Member C)
        └── fix/age-regression-bias     (Member D)
```

1. **Team Lead** clones this repo and pushes it to their own GitHub repo.
2. **Each team member** clones the lead's repo and creates a feature branch per module.
3. Members open **Pull Requests** into the lead's `main` for review.
4. Stable improvements may be back-ported here as a reference update.

> **Do not commit** `backend/venv/`, `frontend/node_modules/`, `frontend/.next/`, or any runtime-downloaded model files — these are gitignored.


*Built by the FACEO team.*
