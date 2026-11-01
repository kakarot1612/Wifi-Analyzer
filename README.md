# Wi-Fi RF Analyzer & Planner (Enterprise Edition)

A high-performance indoor Wi-Fi simulation and RF predictive planning application inspired by **Ekahau AI Pro**, featuring:

- **2D Blueprint Import & Calibration**: Upload PDF or image blueprints (PNG, JPG), calibrate real-world scale using a 2-point ruler tool.
- **Architectural Wall & Obstacle Engine**:
  - Draw and edit walls with materials (Concrete, Brick, Drywall, Glass, Metal) and accurate physical dB attenuation.
  - Warehouse shelf & rack tool (volumetric loss per meter).
- **AI Auto-Planner (Room-Aware & Wall-Aware)**:
  - Automatically calculates optimal AP placement and count based on RF ray-tracing through walls.
  - Excludes specified non-coverage areas (Balconies, yards, elevator shafts) with **Exclusion Zones**.
  - Non-overlapping channel planning (2.4 GHz, 5 GHz, 6 GHz) to eliminate Co-Channel Interference (CCI).
- **Ultra High-Definition Ekahau Heatmap Engine**:
  - Continuous vivid RGB gradient with 3-dBm topographic contour lines.
  - Sub-0.15m sampling resolution with zero blurriness.
  - Real-time 3D signal inspection probe.
- **Cisco Catalyst 9800 WLC Integration**:
  - Sync AP configurations directly to Cisco controllers via NETCONF / RESTCONF.

## Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Canvas API, Lucide Icons.
- **Backend**: FastAPI, Python 3.12, NumPy, OpenCV, Uvicorn.

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows (or source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` to start planning.
