#!/usr/bin/env python3
"""
Debug authentication issue
"""

import requests
import json
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Connect to MongoDB
mongo_client = MongoClient(os.environ['MONGO_URL'])
db = mongo_client[os.environ['DB_NAME']]

# Get a test session token
session = db.user_sessions.find_one({"session_token": {"$regex": "test_session_admin_*"}})
if not session:
    print("No test session found")
    exit(1)

token = session['session_token']
user_id = session['user_id']

print(f"Testing with token: {token}")
print(f"User ID: {user_id}")

# Check if user exists
user = db.users.find_one({"user_id": user_id})
if user:
    print(f"User found: {user['name']} ({user['role']})")
else:
    print("User not found!")
    exit(1)

# Test API call
url = "https://raceroster.preview.emergentagent.com/api/auth/me"
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

print(f"\nMaking request to: {url}")
print(f"Headers: {headers}")

try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 401:
        print("\nAuthentication failed. Checking session expiry...")
        from datetime import datetime, timezone
        
        expires_at = session['expires_at']
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        print(f"Session expires at: {expires_at}")
        print(f"Current time: {now}")
        print(f"Session expired: {expires_at < now}")
        
except Exception as e:
    print(f"Request failed: {e}")