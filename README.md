# ResourceMesh 🔗

**Enterprise Resource Discovery & Allocation Platform**

Discover, track, and optimally allocate your company's underutilized assets — GPUs, lab equipment, software licenses, meeting rooms, and test environments.

## 🚀 Setup & Run
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

Setup .env in the root directory
# Set MYSQL_USER, MYSQL_PASSWORD to match your MySQL

# Run
python3 app.py
```


### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

---

## 🐳 Docker (Full Stack)

```bash
# Build and run everything
docker-compose up --build

# Access at http://localhost:5000 for backend
# Access at http://localhost:5173 for frontend
```


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
