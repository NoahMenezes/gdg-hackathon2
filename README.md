# FieldTheory | Tactical Graph Intelligence

FieldTheory is an advanced sports intelligence platform that pivots away from traditional dashboard metrics into a high-fidelity **Command and Control Tactical HUD**. It leverages graph theory and real-time vision to map team connectivity, identify structural vulnerabilities, and provide actionable coaching insights through a topological lens.

![FieldTheory HUD Mockup](https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=2000)

## 🌌 The "Liquid Glass" Aesthetic
FieldTheory utilizes a premium design system characterized by:
- **Deep Obsidian Background**: `#0b0f1a` for maximum focus.
- **Liquid Glass Panels**: `backdrop-blur-xl` with subtle white borders.
- **Neon Accents**: Emerald (`#10b981`), Cyber Blue (`#3b82f6`), and Alert Rose (`#f43f5e`).
- **Typography**: `Orbitron` for high-tech headings and `Inter` for precise data readout.

## 🚀 Key Features

### 1. The Centerpiece: Live Graph Canvas
Replaces basic video feeds with a dynamic SVG/Canvas pitch.
- **Neural Nodes**: Players are represented as nodes driven by YOLOv8 coordinates.
- **Pulsing Edges**: Connections glow and pulse based on "Tactical Chemistry" weights.
- **Topological Alerts**: Isolated nodes turn Alert Rose, and flickering edges signal imminent community fracture.

### 2. "Momentum Shift" Demo Engine
A state-toggling system to visualize mathematical team states:
- **Control**: Small World Network topology with balanced connectivity.
- **Pressure**: Graph stretching with centrality shifting to defensive anchors.
- **Collapse**: Community fracture visualized via Louvain detection algorithms.

### 3. AI Tactical Feed
A live-typewriter interface providing natural language coaching recommendations derived from graph entropy and connectivity metrics.

### 4. Topological Tab System
- **Structural Health**: Real-time Algebraic Connectivity (Laplacian Eigenvalue) & MST overlay.
- **Lynchpin Detection**: Betweenness Centrality scaling to identify "Critical Articulation Points."
- **Target States**: Triadic Closure visualization with human-guided "Synergy Bias" overrides.
- **Pipeline Telemetry**: Complete stack verification (YOLOv8 -> Flink -> Memgraph).

## 🛠 Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS 4, Framer Motion.
- **Vision Pipeline**: YOLOv8, OpenCV.
- **Stream Processing**: Apache Flink, Kafka.
- **Graph Engine**: Memgraph, Python NetworkX.

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+ (for vision pipeline)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/NoahMenezes/gdg-hackathon2.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the vision pipeline (optional for demo):
   ```bash
   cd vision/football_analysis
   pip install -r requirements.txt
   ```

### Running the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the landing page, or [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to enter the Tactical HUD.

---
*Built for the GDG Hackathon 2026.*
