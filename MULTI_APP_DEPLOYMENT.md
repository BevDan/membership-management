# Multi-App Deployment Guide (Rock 3A / Raspberry Pi)

## Running DragClub + Farm App on One Device with Shared MongoDB

This guide covers running multiple applications on the same device, sharing one MongoDB instance.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Rock 3A                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                     Nginx (Port 80)                  │    │
│  │                                                      │    │
│  │   dragclub.local  ──►  localhost:8001 (DragClub)    │    │
│  │   farm.local      ──►  localhost:8002 (Farm App)    │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│            ┌───────────────┼───────────────┐                │
│            ▼               ▼               ▼                │
│     ┌──────────┐    ┌──────────┐    ┌──────────────┐       │
│     │ DragClub │    │ Farm App │    │   MongoDB    │       │
│     │  :8001   │    │  :8002   │    │   :27017     │       │
│     └──────────┘    └──────────┘    └──────────────┘       │
│            │               │               ▲                │
│            └───────────────┴───────────────┘                │
│                    Both apps connect to                     │
│                    same MongoDB instance                    │
│                    (different databases)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Option A: Use MongoDB Atlas (Recommended)

Share one MongoDB Atlas (free) account with separate databases:
- `dragclub_db` - for the drag club app
- `farm_db` - for your farm app

**Pros:** No local MongoDB install, automatic backups, works with ARM
**Cons:** Requires internet connection

---

## Option B: Install MongoDB Locally

### Install MongoDB on Rock 3A (ARM64)

```bash
# Add MongoDB repository (MongoDB 4.4 for ARM64)
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
echo "deb [ arch=arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list

# Update and install
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify it's running
sudo systemctl status mongod
```

If the above doesn't work (ARM compatibility issues), use **MongoDB Atlas** instead.

---

## Step 1: Prepare Directory Structure

```bash
# Create app directories
mkdir -p ~/apps/dragclub
mkdir -p ~/apps/farmapp

# Clone DragClub app
cd ~/apps/dragclub
git clone https://github.com/YOUR_USERNAME/YOUR_DRAGCLUB_REPO.git .

# Your farm app (assuming it's already somewhere or in a repo)
cd ~/apps/farmapp
# git clone or copy your farm app here
```

---

## Step 2: Configure Each Backend

### DragClub Backend (.env)

```bash
nano ~/apps/dragclub/backend/.env
```

```env
# Using MongoDB Atlas (recommended)
MONGO_URL=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/dragclub_db?retryWrites=true&w=majority
DB_NAME=dragclub_db
CORS_ORIGINS=*

# OR using local MongoDB
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=dragclub_db
```

### Farm App Backend (.env)

```bash
nano ~/apps/farmapp/backend/.env
```

```env
# Using MongoDB Atlas - SAME cluster, DIFFERENT database
MONGO_URL=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/farm_db?retryWrites=true&w=majority
DB_NAME=farm_db
CORS_ORIGINS=*

# OR using local MongoDB - SAME server, DIFFERENT database
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=farm_db
```

**Key Point:** Both apps connect to the same MongoDB server/cluster but use different database names (`dragclub_db` vs `farm_db`). Data is completely separate.

---

## Step 3: Set Up Python Environments

### DragClub Backend

```bash
cd ~/apps/dragclub/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn motor pydantic python-dotenv httpx "pydantic[email]"
deactivate
```

### Farm App Backend

```bash
cd ~/apps/farmapp/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt  # or install your farm app dependencies
deactivate
```

---

## Step 4: Build Frontends

### DragClub Frontend

```bash
cd ~/apps/dragclub/frontend

# Set backend URL
echo "REACT_APP_BACKEND_URL=http://dragclub.local" > .env

npm install
npm run build
```

### Farm App Frontend

```bash
cd ~/apps/farmapp/frontend

# Set backend URL (adjust based on your farm app)
echo "REACT_APP_BACKEND_URL=http://farm.local" > .env

npm install
npm run build
```

---

## Step 5: Create Systemd Services

### DragClub Service

```bash
sudo nano /etc/systemd/system/dragclub.service
```

```ini
[Unit]
Description=DragClub Backend API
After=network.target

[Service]
Type=simple
User=rock
WorkingDirectory=/home/rock/apps/dragclub/backend
Environment=PATH=/home/rock/apps/dragclub/backend/venv/bin
ExecStart=/home/rock/apps/dragclub/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Farm App Service

```bash
sudo nano /etc/systemd/system/farmapp.service
```

```ini
[Unit]
Description=Farm App Backend API
After=network.target

[Service]
Type=simple
User=rock
WorkingDirectory=/home/rock/apps/farmapp/backend
Environment=PATH=/home/rock/apps/farmapp/backend/venv/bin
ExecStart=/home/rock/apps/farmapp/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8002
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Note:** Change `rock` to your actual username, and adjust the farm app start command based on its framework.

### Enable Both Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable dragclub farmapp
sudo systemctl start dragclub farmapp

# Check status
sudo systemctl status dragclub
sudo systemctl status farmapp
```

---

## Step 6: Configure Nginx (Multiple Sites)

### Option A: Using Subdomains (Recommended)

```bash
sudo nano /etc/nginx/sites-available/multi-app
```

```nginx
# DragClub App - dragclub.local
server {
    listen 80;
    server_name dragclub.local;

    # Frontend
    location / {
        root /home/rock/apps/dragclub/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

# Farm App - farm.local
server {
    listen 80;
    server_name farm.local;

    # Frontend
    location / {
        root /home/rock/apps/farmapp/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option B: Using Paths (if you prefer one domain)

```nginx
# Both apps on same domain with different paths
server {
    listen 80;
    server_name myserver.local;

    # DragClub at /dragclub
    location /dragclub/ {
        alias /home/rock/apps/dragclub/frontend/build/;
        index index.html;
        try_files $uri $uri/ /dragclub/index.html;
    }

    location /dragclub/api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Farm App at /farm
    location /farm/ {
        alias /home/rock/apps/farmapp/frontend/build/;
        index index.html;
        try_files $uri $uri/ /farm/index.html;
    }

    location /farm/api/ {
        proxy_pass http://127.0.0.1:8002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Enable Nginx Config

```bash
sudo ln -s /etc/nginx/sites-available/multi-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 7: Set Up Local DNS (for .local domains)

### On Your Rock 3A

Edit hosts file:
```bash
sudo nano /etc/hosts
```

Add:
```
127.0.0.1   dragclub.local
127.0.0.1   farm.local
```

### On Your Computer/Phone (to access the apps)

#### Windows
Edit `C:\Windows\System32\drivers\etc\hosts` (as admin):
```
192.168.1.XXX   dragclub.local
192.168.1.XXX   farm.local
```
(Replace `192.168.1.XXX` with your Rock 3A's IP address)

#### Mac/Linux
```bash
sudo nano /etc/hosts
```
Add same lines as Windows.

#### Alternative: Use IP with Ports
Instead of local domains, access via:
- `http://192.168.1.XXX:8001` - DragClub (direct to backend)
- `http://192.168.1.XXX:8002` - Farm App (direct to backend)

Or configure Nginx to listen on different ports.

---

## Step 8: MongoDB Database Separation

Both apps share the same MongoDB server but have isolated databases:

```
MongoDB Server (Atlas or Local)
├── dragclub_db          ← DragClub app data
│   ├── users
│   ├── members
│   ├── vehicles
│   └── user_sessions
│
└── farm_db              ← Farm app data
    ├── crops
    ├── livestock
    └── ...
```

### Viewing Databases (if using local MongoDB)

```bash
mongosh

# List databases
show dbs

# Switch to dragclub
use dragclub_db
show collections

# Switch to farm
use farm_db
show collections
```

---

## Useful Commands

### Manage Services
```bash
# View all app statuses
sudo systemctl status dragclub farmapp

# Restart both apps
sudo systemctl restart dragclub farmapp

# View logs
sudo journalctl -u dragclub -f
sudo journalctl -u farmapp -f
```

### Nginx
```bash
# Test config
sudo nginx -t

# Reload after config changes
sudo systemctl reload nginx

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### Update Apps
```bash
# Update DragClub
cd ~/apps/dragclub
git pull
cd frontend && npm run build
sudo systemctl restart dragclub

# Update Farm App
cd ~/apps/farmapp
git pull
cd frontend && npm run build
sudo systemctl restart farmapp
```

---

## Port Reference

| Service | Port | Description |
|---------|------|-------------|
| Nginx | 80 | Web server (routes to apps) |
| DragClub Backend | 8001 | FastAPI |
| Farm App Backend | 8002 | Your farm app |
| MongoDB (local) | 27017 | Database |

---

## Troubleshooting

### App not accessible
```bash
# Check if services are running
sudo systemctl status dragclub farmapp

# Check which ports are in use
sudo netstat -tlnp | grep -E '80|8001|8002|27017'

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log
```

### Database connection issues
```bash
# Test MongoDB connection (if local)
mongosh --eval "db.adminCommand('ping')"

# Check MongoDB status
sudo systemctl status mongod
```

### DNS not resolving
- Make sure you've added entries to hosts file on the device you're browsing from
- Try accessing via IP address directly: `http://192.168.1.XXX`

---

## Resource Usage Estimate (Rock 3A with 2GB RAM)

| Component | RAM Usage |
|-----------|-----------|
| System | ~300MB |
| MongoDB (local) | ~200-400MB |
| DragClub Backend | ~50-100MB |
| Farm App Backend | ~50-100MB |
| Nginx | ~10MB |
| **Total** | ~600-900MB |

You should have enough headroom with 2GB RAM. Monitor with:
```bash
htop
# or
free -h
```

---

*Guide for running multiple apps on Rock 3A / Raspberry Pi with shared MongoDB*
