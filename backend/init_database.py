#!/usr/bin/env python3
"""
Database Initialization and Diagnostic Script
Run this on your Rock 3A to check and setup the MongoDB database.

Usage:
    python3 init_database.py --check    # Check connection and collections
    python3 init_database.py --init     # Initialize collections and indexes
    python3 init_database.py --env      # Show what env vars are being used
"""

import os
import sys
import asyncio
from datetime import datetime, timezone

# Try to load dotenv if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Note: python-dotenv not installed, using system environment variables")

async def check_connection():
    """Check if MongoDB is accessible"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
    except ImportError:
        print("ERROR: motor not installed. Run: pip install motor")
        return False
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'dragclub_db')
    
    print("")
    print("Connection Settings:")
    if len(mongo_url) > 50:
        print(f"   MONGO_URL: {mongo_url[:50]}...")
    else:
        print(f"   MONGO_URL: {mongo_url}")
    print(f"   DB_NAME: {db_name}")
    
    try:
        print("")
        print("Attempting to connect to MongoDB...")
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        
        # Test connection
        await client.admin.command('ping')
        print("SUCCESS: MongoDB connection successful!")
        
        db = client[db_name]
        
        # List collections
        collections = await db.list_collection_names()
        print("")
        print(f"Collections in '{db_name}':")
        if collections:
            for col in collections:
                count = await db[col].count_documents({})
                print(f"   - {col}: {count} documents")
        else:
            print("   (no collections found)")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"ERROR: MongoDB connection failed: {e}")
        return False

async def init_database():
    """Initialize the database with required collections and indexes"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
    except ImportError:
        print("ERROR: motor not installed. Run: pip install motor")
        return False
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'dragclub_db')
    
    print("")
    print(f"Initializing database '{db_name}'...")
    
    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        
        db = client[db_name]
        
        # Create collections if they don't exist
        collections_to_create = ['users', 'members', 'vehicles', 'user_sessions', 'vehicle_options']
        existing = await db.list_collection_names()
        
        for col_name in collections_to_create:
            if col_name not in existing:
                await db.create_collection(col_name)
                print(f"   Created collection: {col_name}")
            else:
                print(f"   Collection exists: {col_name}")
        
        # Create indexes
        print("")
        print("Creating indexes...")
        
        # Users indexes
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("email", unique=True)
        print("   users indexes created")
        
        # Members indexes
        await db.members.create_index("member_id", unique=True)
        await db.members.create_index("member_number")
        await db.members.create_index("name")
        await db.members.create_index("email1")
        print("   members indexes created")
        
        # Vehicles indexes
        await db.vehicles.create_index("vehicle_id", unique=True)
        await db.vehicles.create_index("member_id")
        await db.vehicles.create_index("registration")
        await db.vehicles.create_index("log_book_number")
        print("   vehicles indexes created")
        
        # Sessions indexes
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("expires_at")
        print("   user_sessions indexes created")
        
        # Vehicle options indexes
        await db.vehicle_options.create_index("option_id", unique=True)
        await db.vehicle_options.create_index("type")
        print("   vehicle_options indexes created")
        
        # Add default vehicle options if empty
        options_count = await db.vehicle_options.count_documents({})
        if options_count == 0:
            print("")
            print("Adding default vehicle options...")
            from uuid import uuid4
            
            default_options = [
                {"option_id": str(uuid4()), "type": "status", "value": "Active"},
                {"option_id": str(uuid4()), "type": "status", "value": "Inactive"},
                {"option_id": str(uuid4()), "type": "status", "value": "Cancelled"},
                {"option_id": str(uuid4()), "type": "reason", "value": "Blank"},
                {"option_id": str(uuid4()), "type": "reason", "value": "Sold Vehicle"},
                {"option_id": str(uuid4()), "type": "reason", "value": "No Longer Financial"},
                {"option_id": str(uuid4()), "type": "reason", "value": "Lost Log Book"},
            ]
            
            await db.vehicle_options.insert_many(default_options)
            print("   Default vehicle options added")
        
        client.close()
        print("")
        print("Database initialization complete!")
        return True
        
    except Exception as e:
        print(f"ERROR: Database initialization failed: {e}")
        return False

def show_env():
    """Show environment variable status"""
    print("")
    print("Environment Variables:")
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    cors_origins = os.environ.get('CORS_ORIGINS')
    
    if mongo_url:
        print("   MONGO_URL: Set")
        # Hide password in output
        if '@' in mongo_url:
            parts = mongo_url.split('@')
            user_part = parts[0].split(':')[0] if ':' in parts[0] else parts[0]
            safe_url = user_part + ':****@' + parts[1]
            print(f"             {safe_url[:60]}...")
        else:
            print(f"             {mongo_url}")
    else:
        print("   MONGO_URL: Not set")
    
    if db_name:
        print(f"   DB_NAME: {db_name}")
    else:
        print("   DB_NAME: Not set (will use dragclub_db)")
    
    if cors_origins:
        print(f"   CORS_ORIGINS: {cors_origins}")
    else:
        print("   CORS_ORIGINS: Not set (will use *)")
    
    print("")
    print("Checking .env file...")
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        print(f"   .env file found at: {env_path}")
        with open(env_path, 'r') as f:
            lines = f.readlines()
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#'):
                    key = line.split('=')[0] if '=' in line else line
                    print(f"      - {key}")
    else:
        print(f"   No .env file found at: {env_path}")
        print("      Create one with:")
        print("      MONGO_URL=mongodb://localhost:27017")
        print("      DB_NAME=dragclub_db")
        print("      CORS_ORIGINS=*")

async def main():
    print("=" * 60)
    print("Steel City Drag Club - Database Diagnostic Tool")
    print("=" * 60)
    
    if len(sys.argv) < 2:
        print("")
        print("Usage:")
        print("  python3 init_database.py --check    Check connection")
        print("  python3 init_database.py --init     Initialize database")
        print("  python3 init_database.py --env      Show environment")
        print("  python3 init_database.py --all      Run all checks and init")
        return
    
    arg = sys.argv[1]
    
    if arg == '--env' or arg == '--all':
        show_env()
    
    if arg == '--check' or arg == '--all':
        await check_connection()
    
    if arg == '--init' or arg == '--all':
        await init_database()
    
    print("")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
