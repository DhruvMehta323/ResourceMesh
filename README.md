# ResourceMesh 🔗

**Enterprise Resource Discovery & Allocation Platform**

Discover, track, and optimally allocate your company's underutilized assets — GPUs, lab equipment, software licenses, meeting rooms, and test environments.

---

## 📁 File Structure

```
resourcemesh/
├── backend/
│   ├── app.py                  ← Main entry point (python3 app.py)
│   ├── config.py               ← DB + Redis config
│   ├── algorithms.py           ← All 7 algorithms
│   ├── .env                    ← Environment variables
│   ├── requirements.txt
│   ├── init_db.sql             ← Schema + seed data
│   └── api/
│       ├── __init__.py
│       ├── health.py
│       ├── resources.py        ← /assets, /categories
│       ├── teams.py            ← /teams
│       ├── allocations.py      ← /allocations
│       ├── projects.py         ← /projects
│       ├── matching.py         ← /match/*
│       └── analytics.py        ← /analytics/*
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js          ← Proxies /api → localhost:5000
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/index.js        ← Axios API client
│       ├── hooks/useApi.js
│       ├── utils/format.js
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── Sidebar.jsx
│       │   ├── Modal.jsx
│       │   ├── Spinner.jsx
│       │   └── StatusBadge.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Assets.jsx
│           ├── Teams.jsx
│           ├── Projects.jsx
│           ├── Allocations.jsx
│           ├── Matching.jsx
│           └── Analytics.jsx
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Setup & Run

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8.0
- Redis (optional — app runs without it, just no caching)

---

### 1. MySQL Setup

**Install MySQL** (if not installed):
```bash
# macOS
brew install mysql
brew services start mysql

# Ubuntu/Debian
sudo apt install mysql-server
sudo systemctl start mysql
```

**Create database and seed data:**
```bash
mysql -u root -p < backend/init_db.sql
```

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env .env.local              # Edit if needed
# Set MYSQL_USER, MYSQL_PASSWORD to match your MySQL

# Run
python3 app.py
```

Backend starts at: **http://localhost:5000**

**Test it:**
```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/v1/assets
```

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend starts at: **http://localhost:5173**

The Vite dev server proxies `/api` → `http://localhost:5000` automatically.

---

### 4. Redis (Optional, for caching)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis
```

Redis is optional. Without it, the app skips caching but works fine.

---

## 🐳 Docker (Full Stack)

```bash
# Build and run everything
docker-compose up --build

# Access at http://localhost
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/v1/assets` | List all assets (filters: status, category_id, search) |
| POST | `/api/v1/assets` | Create asset |
| GET | `/api/v1/assets/:id` | Asset detail with allocation history |
| GET | `/api/v1/categories` | Asset categories with counts |
| GET | `/api/v1/teams` | All teams |
| GET | `/api/v1/teams/:id` | Team detail with assets & projects |
| POST | `/api/v1/teams` | Create team |
| GET | `/api/v1/allocations?status=active` | List allocations |
| POST | `/api/v1/allocations` | Allocate asset to team/project |
| POST | `/api/v1/allocations/:id/release` | Release asset back to pool |
| GET | `/api/v1/projects` | List projects |
| GET | `/api/v1/projects/:id` | Project detail |
| POST | `/api/v1/projects` | Create project |
| POST | `/api/v1/match/urgent` | Greedy urgent matching |
| GET | `/api/v1/match/optimize/:project_id` | DP team optimizer |
| GET | `/api/v1/match/gap-analysis` | Two-pointer gap analysis |
| GET | `/api/v1/match/demand-scores` | PageRank demand scores |
| GET | `/api/v1/match/collaboration-graph` | Asset co-usage graph |
| GET | `/api/v1/analytics/overview` | Dashboard overview |
| GET | `/api/v1/analytics/cost-analysis` | Cost breakdown |
| GET | `/api/v1/analytics/utilization-trend` | Sliding window trends |

---

## 🧮 Algorithms

| Algorithm | Where Used | Complexity |
|-----------|------------|------------|
| **PageRank** | Asset demand scoring | O(iter × edges) |
| **DP (0/1 Knapsack)** | Optimal project allocation | O(n × budget_steps) |
| **BFS** | Asset upgrade path finding | O(V + E) |
| **Greedy** | Real-time urgent matching | O(n log n) |
| **Sliding Window** | Utilization trend analysis | O(n × window) |
| **Two Pointers** | Requirement gap analysis | O(n + m) |
| **Union-Find** | Co-usage community detection | O(α(n)) |

---

## 🔧 Environment Variables (.env)

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=resourcemesh

REDIS_HOST=localhost
REDIS_PORT=6379

FLASK_ENV=development
FLASK_DEBUG=1
PORT=5000
FRONTEND_URL=http://localhost:5173
```

---

## 📦 Install Commands Summary

```bash
# Python packages
pip install flask flask-cors redis python-dotenv numpy scipy PyMySQL gunicorn

# Frontend packages
npm install react react-dom react-router-dom recharts lucide-react axios clsx
npm install -D vite @vitejs/plugin-react tailwindcss postcss autoprefixer
```