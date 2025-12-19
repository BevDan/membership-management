# Raspberry Pi Deployment Guide

## Steel City Drag Club - Member & Vehicle Management System

This guide will help you deploy the application on a Raspberry Pi using MongoDB Atlas (free cloud database).

---

## Prerequisites

### Hardware
- Raspberry Pi 3B+ or newer (Pi 4 with 2GB+ RAM recommended)
- 16GB+ microSD card (32GB recommended)
- Stable internet connection
- Power supply for your Pi

### Software
- Raspberry Pi OS (64-bit recommended for Pi 4)
- SSH access or keyboard/monitor connected

---

## Step 1: Update Your Raspberry Pi

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Step 2: Install Required Software

```bash
# Install Python 3 and pip
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js (for building frontend)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx (web server)
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

Verify installations:
```bash
python3 --version    # Should show Python 3.9+
node --version       # Should show v18+
npm --version        # Should show 9+
nginx -v             # Should show nginx version
```

---

## Step 3: Set Up MongoDB Atlas (Free Cloud Database)

### 3.1 Create Account
1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" and create an account
3. Choose the **FREE** tier (M0 Sandbox - 512MB)

### 3.2 Create a Cluster
1. Select **Shared** (free tier)
2. Choose a cloud provider and region closest to you
3. Click "Create Cluster" (takes 1-3 minutes)

### 3.3 Set Up Database Access
1. Go to **Database Access** (left sidebar)
2. Click "Add New Database User"
3. Choose **Password** authentication
4. Enter a username (e.g., `dragclub_admin`)
5. Generate or create a secure password - **SAVE THIS PASSWORD**
6. Set privileges to "Read and write to any database"
7. Click "Add User"

### 3.4 Set Up Network Access
1. Go to **Network Access** (left sidebar)
2. Click "Add IP Address"
3. For home use: Click "Add Current IP Address"
4. For allowing any IP (less secure but easier): Click "Allow Access from Anywhere" (0.0.0.0/0)
5. Click "Confirm"

### 3.5 Get Your Connection String
1. Go to **Database** (left sidebar)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select **Python** and version **3.6 or later**
5. Copy the connection string - it looks like:
   ```
   mongodb+srv://dragclub_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password
7. Add your database name before the `?`:
   ```
   mongodb+srv://dragclub_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/dragclub_db?retryWrites=true&w=majority
   ```

---

## Step 4: Get the Code

### Option A: Clone from GitHub (if you've saved to GitHub)
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git dragclub
cd dragclub
```

### Option B: Download from Emergent
1. In Emergent, click "Save to GitHub" to push your code
2. Then clone as shown above

---

## Step 5: Set Up the Backend

### 5.1 Create Python Virtual Environment
```bash
cd ~/dragclub/backend
python3 -m venv venv
source venv/bin/activate
```

### 5.2 Install Python Dependencies
```bash
pip install --upgrade pip
pip install fastapi uvicorn motor pydantic python-dotenv httpx
pip install "pydantic[email]"
```

### 5.3 Configure Environment Variables
Create/edit the `.env` file:
```bash
nano .env
```

Add the following (replace with your actual values):
```env
MONGO_URL=mongodb+srv://dragclub_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/dragclub_db?retryWrites=true&w=majority
DB_NAME=dragclub_db
CORS_ORIGINS=*
```

Save and exit (Ctrl+X, Y, Enter)

### 5.4 Test the Backend
```bash
source venv/bin/activate
cd ~/dragclub/backend
uvicorn server:app --host 0.0.0.0 --port 8001
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
```

Press Ctrl+C to stop.

---

## Step 6: Build the Frontend

### 6.1 Install Node Dependencies
```bash
cd ~/dragclub/frontend
npm install
```

### 6.2 Configure Frontend Environment
Edit the `.env` file:
```bash
nano .env
```

Update the backend URL to point to your Pi:
```env
REACT_APP_BACKEND_URL=http://YOUR_PI_IP_ADDRESS
```

Replace `YOUR_PI_IP_ADDRESS` with your Pi's local IP (find it with `hostname -I`)

For example:
```env
REACT_APP_BACKEND_URL=http://192.168.1.100
```

### 6.3 Build Production Files
```bash
npm run build
```

This creates a `build` folder with static files.

---

## Step 7: Configure Nginx

### 7.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/dragclub
```

Add the following:
```nginx
server {
    listen 80;
    server_name _;

    # Frontend - serve static files
    location / {
        root /home/pi/dragclub/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API - proxy to FastAPI
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
```

**Note:** If your username isn't `pi`, change `/home/pi/` to `/home/YOUR_USERNAME/`

### 7.2 Enable the Site
```bash
sudo ln -s /etc/nginx/sites-available/dragclub /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 8: Create Systemd Service (Auto-Start Backend)

### 8.1 Create Service File
```bash
sudo nano /etc/systemd/system/dragclub-backend.service
```

Add the following:
```ini
[Unit]
Description=DragClub Backend API
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/dragclub/backend
Environment=PATH=/home/pi/dragclub/backend/venv/bin
ExecStart=/home/pi/dragclub/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Note:** Change `pi` to your username if different.

### 8.2 Enable and Start the Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable dragclub-backend
sudo systemctl start dragclub-backend
```

### 8.3 Check Status
```bash
sudo systemctl status dragclub-backend
```

---

## Step 9: Access Your Application

1. Find your Pi's IP address:
   ```bash
   hostname -I
   ```

2. Open a web browser on any device on your network and go to:
   ```
   http://YOUR_PI_IP_ADDRESS
   ```

   For example: `http://192.168.1.100`

3. You should see the login page!

---

## Step 10: Set Up Google OAuth (Required for Login)

The app uses Google OAuth for authentication. You'll need to update the OAuth configuration:

### Option 1: Keep Using Emergent Auth (Easiest)
The current setup uses Emergent's managed Google Auth. This will continue to work as long as:
- Your Pi has internet access
- You access the app from the same domain/setup

### Option 2: Set Up Your Own Google OAuth
If you need your own OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Update the backend code with your credentials

---

## Useful Commands

### View Backend Logs
```bash
sudo journalctl -u dragclub-backend -f
```

### Restart Backend
```bash
sudo systemctl restart dragclub-backend
```

### Restart Nginx
```bash
sudo systemctl restart nginx
```

### Update the Code
```bash
cd ~/dragclub
git pull
cd frontend && npm run build
sudo systemctl restart dragclub-backend
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
sudo journalctl -u dragclub-backend -n 50

# Test manually
cd ~/dragclub/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Can't connect to MongoDB Atlas
1. Check your connection string in `.env`
2. Verify your IP is whitelisted in MongoDB Atlas Network Access
3. Check your username/password

### Frontend shows blank page
```bash
# Check if build folder exists
ls ~/dragclub/frontend/build

# Rebuild if needed
cd ~/dragclub/frontend
npm run build
```

### Nginx errors
```bash
# Test configuration
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log
```

---

## Optional: Access from Internet

To access your Pi from outside your home network:

### Option 1: Port Forwarding
1. Log into your router
2. Forward port 80 to your Pi's internal IP
3. Use your public IP or a dynamic DNS service

### Option 2: Cloudflare Tunnel (Free & Secure)
1. Sign up at [Cloudflare](https://cloudflare.com)
2. Install cloudflared on your Pi
3. Create a tunnel to expose your app securely

### Option 3: Tailscale (Easy VPN)
1. Install Tailscale on your Pi and devices
2. Access via Tailscale IP from anywhere

---

## Security Recommendations

1. **Change default Pi password**: `passwd`
2. **Enable firewall**:
   ```bash
   sudo apt install ufw
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw enable
   ```
3. **Keep system updated**: `sudo apt update && sudo apt upgrade`
4. **Use HTTPS** if exposing to internet (use Cloudflare or Let's Encrypt)

---

## Hardware Tips

- Use a **good quality power supply** (official Pi power supply recommended)
- Consider an **SSD instead of SD card** for better performance and longevity
- Use **active cooling** (fan/heatsink) if running 24/7
- Set up **automatic backups** of your MongoDB Atlas data

---

## Summary

Your Steel City Drag Club app is now running on:
- **Raspberry Pi** - Handles the web server and API
- **MongoDB Atlas** - Stores all your member and vehicle data (cloud, free)
- **Nginx** - Serves the frontend and proxies API requests

The app will automatically start when your Pi boots up!

---

*Generated for Steel City Drag Club Management System*
