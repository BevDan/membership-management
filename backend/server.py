from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, UploadFile, File, Query, Depends, Header, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import csv
import io
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'dragclub_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Password hashing functions
def hash_password(password: str) -> str:
    """Hash a password with a random salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{hashed.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against its hash"""
    try:
        salt, hashed = stored_hash.split(':')
        new_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return new_hash.hex() == hashed
    except:
        return False

class User(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    role: Literal['admin', 'full_editor', 'member_editor']
    picture: Optional[str] = None
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: Literal['admin', 'full_editor', 'member_editor']

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Member(BaseModel):
    member_id: str
    member_number: str
    name: str
    address: str
    suburb: str
    postcode: str
    state: Optional[str] = None
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    email1: Optional[str] = None
    email2: Optional[str] = None
    life_member: bool = False
    financial: bool = False
    inactive: bool = False
    membership_type: Literal['Full', 'Family', 'Junior']
    family_members: Optional[List[str]] = None
    interest: Literal['Drag Racing', 'Car Enthusiast', 'Both']
    date_paid: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    comments: Optional[str] = None
    receive_emails: bool = True
    receive_sms: bool = True
    created_at: datetime
    updated_at: datetime

class MemberCreate(BaseModel):
    name: str
    address: str
    suburb: str
    postcode: str
    state: Optional[str] = None
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    email1: Optional[EmailStr] = None
    email2: Optional[EmailStr] = None
    life_member: bool = False
    financial: bool = False
    inactive: bool = False
    membership_type: Literal['Full', 'Family', 'Junior']
    family_members: Optional[List[str]] = None
    interest: Literal['Drag Racing', 'Car Enthusiast', 'Both']
    date_paid: Optional[str] = None
    expiry_date: Optional[str] = None
    comments: Optional[str] = None
    receive_emails: bool = True
    receive_sms: bool = True

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    suburb: Optional[str] = None
    postcode: Optional[str] = None
    state: Optional[str] = None
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    email1: Optional[str] = None  # Changed from EmailStr to allow empty strings
    email2: Optional[str] = None  # Changed from EmailStr to allow empty strings
    life_member: Optional[bool] = None
    financial: Optional[bool] = None
    inactive: Optional[bool] = None
    membership_type: Optional[Literal['Full', 'Family', 'Junior']] = None
    family_members: Optional[List[str]] = None
    interest: Optional[Literal['Drag Racing', 'Car Enthusiast', 'Both']] = None
    date_paid: Optional[str] = None
    expiry_date: Optional[str] = None
    comments: Optional[str] = None
    receive_emails: Optional[bool] = None
    receive_sms: Optional[bool] = None

class Vehicle(BaseModel):
    vehicle_id: str
    member_id: str
    log_book_number: str
    entry_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    make: str
    body_style: str
    model: str
    year: int
    registration: str
    status: str
    reason: str
    archived: bool = False
    created_at: datetime
    updated_at: datetime

class VehicleCreate(BaseModel):
    member_id: str
    log_book_number: str
    entry_date: Optional[str] = None
    expiry_date: Optional[str] = None
    make: str
    body_style: str
    model: str
    year: int
    registration: str
    status: str
    reason: str = ""

class VehicleUpdate(BaseModel):
    log_book_number: Optional[str] = None
    entry_date: Optional[str] = None
    expiry_date: Optional[str] = None
    make: Optional[str] = None
    body_style: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    registration: Optional[str] = None
    status: Optional[str] = None
    reason: Optional[str] = None

class VehicleOption(BaseModel):
    option_id: str
    type: Literal['status', 'reason']
    value: str
    created_at: datetime

class VehicleOptionCreate(BaseModel):
    type: Literal['status', 'reason']
    value: str

class ExportFilters(BaseModel):
    receive_emails: Optional[bool] = None
    receive_sms: Optional[bool] = None
    interest: Optional[Literal['Drag Racing', 'Car Enthusiast', 'Both']] = None

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None)) -> User:
    token = session_token
    
    # Try to get token from Authorization header if not in cookie
    if not token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:]
    
    logging.info(f"Auth attempt - Cookie token: {session_token}, Auth header: {request.headers.get('authorization')}, Final token: {token}")
    
    if not token:
        logging.warning("No token provided")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    logging.info(f"Session lookup for token {token}: {'Found' if session_doc else 'Not found'}")
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# Username/Password Authentication
@api_router.post("/auth/register")
async def register_user(user_data: UserRegister, response: Response):
    """Register a new user with email/password. First user becomes admin."""
    
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # First user becomes admin
    user_count = await db.users.count_documents({})
    user_role = "admin" if user_count == 0 else "member_editor"
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(user_data.password)
    
    await db.users.insert_one({
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "role": user_role,
        "password_hash": password_hash,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=90)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,  # Required for SameSite=None
        samesite="none",  # Allow cross-site cookies for production
        path="/",
        max_age=90*24*60*60
    )
    
    return {"message": "User registered successfully", "role": user_role}

@api_router.post("/auth/login")
async def login_user(credentials: UserLogin, response: Response):
    """Login with email/password"""
    
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check password
    if "password_hash" not in user:
        raise HTTPException(status_code=401, detail="Account uses Google login. Please use Google to sign in or contact admin to reset password.")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=90)
    
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,  # Required for SameSite=None
        samesite="none",  # Allow cross-site cookies for production
        path="/",
        max_age=90*24*60*60
    )
    
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

@api_router.post("/auth/session")
async def create_session(session_id: str, response: Response):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid session ID")
            
            data = resp.json()
            email = data["email"]
            name = data["name"]
            picture = data.get("picture")
            emergent_session_token = data["session_token"]
            
            existing_user = await db.users.find_one({"email": email}, {"_id": 0})
            
            if existing_user:
                user_id = existing_user["user_id"]
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"name": name, "picture": picture}}
                )
            else:
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                user_role = "admin"
                admin_count = await db.users.count_documents({"role": "admin"})
                if admin_count > 0:
                    user_role = "member_editor"
                
                await db.users.insert_one({
                    "user_id": user_id,
                    "email": email,
                    "name": name,
                    "role": user_role,
                    "picture": picture,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            session_token = f"session_{uuid.uuid4().hex}"
            expires_at = datetime.now(timezone.utc) + timedelta(days=90)
            
            await db.user_sessions.insert_one({
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            response.set_cookie(
                key="session_token",
                value=session_token,
                httponly=True,
                secure=True,
                samesite="none",
                path="/",
                max_age=90*24*60*60
            )
            
            user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if isinstance(user_doc['created_at'], str):
                user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
            
            return User(**user_doc)
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Auth service timeout")
        except Exception as e:
            logging.error(f"Auth error: {str(e)}")
            raise HTTPException(status_code=500, detail="Authentication failed")

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    for u in users:
        if isinstance(u['created_at'], str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    new_user = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    return User(**user_doc)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"name": user_data.name, "role": user_data.role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    return User(**user_doc)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

@api_router.get("/members", response_model=List[Member])
async def get_members(
    search: Optional[str] = None,
    member_number: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    
    query = {}
    if member_number:
        query["member_number"] = str(member_number)
    elif search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email1": {"$regex": search, "$options": "i"}},
            {"email2": {"$regex": search, "$options": "i"}}
        ]
    
    members = await db.members.find(query, {"_id": 0}).sort("member_number", -1).to_list(1000)
    for m in members:
        for field in ['created_at', 'updated_at', 'date_paid', 'expiry_date']:
            if field in m and isinstance(m[field], str):
                m[field] = datetime.fromisoformat(m[field])
    return members

@api_router.get("/members/suburbs/list")
async def get_suburbs(current_user: User = Depends(get_current_user)):
    suburbs = await db.members.distinct("suburb")
    return sorted([s for s in suburbs if s])

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get comprehensive dashboard statistics"""
    
    # Get all members and vehicles
    members = await db.members.find({}, {"_id": 0}).to_list(10000)
    vehicles = await db.vehicles.find({"archived": False}, {"_id": 0, "member_id": 1, "status": 1}).to_list(10000)
    
    # Create set of member_ids that have vehicles
    members_with_vehicles = set(v["member_id"] for v in vehicles)
    
    # Count only active vehicles
    active_vehicles = sum(1 for v in vehicles if v.get("status") == "Active")
    
    # Separate active and inactive members
    active_members = [m for m in members if not m.get("inactive")]
    inactive_members = [m for m in members if m.get("inactive")]
    
    # Calculate statistics (excluding inactive members for financial counts)
    total_members = len(members)
    inactive_count = len(inactive_members)
    financial_members = sum(1 for m in active_members if m.get("financial"))
    unfinancial_members = sum(1 for m in active_members if not m.get("financial"))
    
    # Life member stats (excluding inactive)
    life_members_financial = sum(1 for m in active_members if m.get("life_member") and m.get("financial"))
    life_members_unfinancial = sum(1 for m in active_members if m.get("life_member") and not m.get("financial"))
    
    # Members with vehicles stats (excluding inactive)
    members_with_vehicle_financial = sum(1 for m in active_members if m.get("member_id") in members_with_vehicles and m.get("financial"))
    members_with_vehicle_unfinancial = sum(1 for m in active_members if m.get("member_id") in members_with_vehicles and not m.get("financial"))
    
    # Interest breakdown (all members)
    interest_drag_racing = sum(1 for m in members if m.get("interest") == "Drag Racing")
    interest_car_enthusiast = sum(1 for m in members if m.get("interest") == "Car Enthusiast")
    interest_both = sum(1 for m in members if m.get("interest") == "Both")
    
    # Membership type breakdown (all members)
    type_full = sum(1 for m in members if m.get("membership_type") == "Full")
    type_family = sum(1 for m in members if m.get("membership_type") == "Family")
    type_junior = sum(1 for m in members if m.get("membership_type") == "Junior")
    
    return {
        "total_members": total_members,
        "financial_members": financial_members,
        "unfinancial_members": unfinancial_members,
        "inactive_members": inactive_count,
        "life_members_financial": life_members_financial,
        "life_members_unfinancial": life_members_unfinancial,
        "members_with_vehicle_financial": members_with_vehicle_financial,
        "members_with_vehicle_unfinancial": members_with_vehicle_unfinancial,
        "total_vehicles": len(vehicles),
        "active_vehicles": active_vehicles,
        "interest": {
            "drag_racing": interest_drag_racing,
            "car_enthusiast": interest_car_enthusiast,
            "both": interest_both
        },
        "membership_type": {
            "full": type_full,
            "family": type_family,
            "junior": type_junior,
            "inactive": inactive_count
        }
    }

@api_router.get("/reports/members")
async def get_member_report(
    filter_type: str = "all",
    current_user: User = Depends(get_current_user)
):
    """
    Get member report with filters.
    filter_type: all, unfinancial, with_vehicle, unfinancial_with_vehicle, 
                 expiring_soon, vehicles_expiring_soon, expired_vehicles
    Note: "all" shows everyone including inactive. All other filters exclude inactive members.
    """
    
    # Get all members
    members = await db.members.find({}, {"_id": 0}).to_list(10000)
    
    # For any filter OTHER than "all", exclude inactive members
    if filter_type != "all":
        members = [m for m in members if not m.get("inactive")]
    
    # Get vehicles and create lookups
    vehicles = await db.vehicles.find({"archived": False}, {"_id": 0}).to_list(10000)
    members_with_vehicles = set(v["member_id"] for v in vehicles)
    
    # Calculate date thresholds
    today = datetime.now(timezone.utc)
    two_months_ahead = today + timedelta(days=60)
    
    # Create lookup for vehicles by member
    vehicles_by_member = {}
    for v in vehicles:
        mid = v.get("member_id")
        if mid not in vehicles_by_member:
            vehicles_by_member[mid] = []
        vehicles_by_member[mid].append(v)
    
    # Apply filters
    if filter_type == "unfinancial":
        members = [m for m in members if not m.get("financial")]
    elif filter_type == "with_vehicle":
        members = [m for m in members if m.get("member_id") in members_with_vehicles]
    elif filter_type == "unfinancial_with_vehicle":
        members = [m for m in members if not m.get("financial") and m.get("member_id") in members_with_vehicles]
    elif filter_type == "expiring_soon":
        # Members whose expiry date is within 2 months
        filtered = []
        for m in members:
            expiry = m.get("expiry_date")
            if expiry:
                try:
                    if isinstance(expiry, str):
                        expiry_date = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
                    else:
                        expiry_date = expiry
                    # Make timezone aware if not
                    if expiry_date.tzinfo is None:
                        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
                    if today <= expiry_date <= two_months_ahead:
                        filtered.append(m)
                except:
                    pass
        members = filtered
    elif filter_type == "vehicles_expiring_soon":
        # Members with at least one active vehicle expiring within 2 months
        members_with_expiring = set()
        for v in vehicles:
            # Only check vehicles with Active status
            if v.get("status") != "Active":
                continue
            expiry = v.get("expiry_date")
            if expiry:
                try:
                    if isinstance(expiry, str):
                        expiry_date = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
                    else:
                        expiry_date = expiry
                    if expiry_date.tzinfo is None:
                        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
                    if today <= expiry_date <= two_months_ahead:
                        members_with_expiring.add(v.get("member_id"))
                except:
                    pass
        members = [m for m in members if m.get("member_id") in members_with_expiring]
    elif filter_type == "expired_vehicles":
        # Members with at least one expired vehicle (only active status vehicles)
        members_with_expired = set()
        for v in vehicles:
            # Only check vehicles with Active status
            if v.get("status") != "Active":
                continue
            expiry = v.get("expiry_date")
            if expiry:
                try:
                    if isinstance(expiry, str):
                        expiry_date = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
                    else:
                        expiry_date = expiry
                    if expiry_date.tzinfo is None:
                        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
                    if expiry_date < today:
                        members_with_expired.add(v.get("member_id"))
                except:
                    pass
        members = [m for m in members if m.get("member_id") in members_with_expired]
    
    # Build report data
    report = []
    for m in members:
        has_vehicle = m.get("member_id") in members_with_vehicles
        
        # Concatenate phones with ; separator if both exist
        phone1 = m.get("phone1") or ""
        phone2 = m.get("phone2") or ""
        if phone1 and phone2:
            phone = f"{phone1}; {phone2}"
        else:
            phone = phone1 or phone2
        
        # Concatenate emails with ; separator if both exist
        email1 = m.get("email1") or ""
        email2 = m.get("email2") or ""
        if email1 and email2:
            email = f"{email1}; {email2}"
        else:
            email = email1 or email2
        
        # Get expiry date for display
        expiry = m.get("expiry_date")
        expiry_str = ""
        if expiry:
            try:
                if isinstance(expiry, str):
                    expiry_str = expiry.split('T')[0]
                else:
                    expiry_str = expiry.strftime('%Y-%m-%d')
            except:
                expiry_str = str(expiry)
        
        report.append({
            "member_id": m.get("member_id"),
            "member_number": m.get("member_number"),
            "name": m.get("name"),
            "phone": phone,
            "email": email,
            "financial": m.get("financial", False),
            "inactive": m.get("inactive", False),
            "has_vehicle": has_vehicle,
            "expiry_date": expiry_str
        })
    
    # Sort by member number
    report = sorted(report, key=lambda x: sort_member_number_key(x))
    
    return report


@api_router.get("/contact-lists")
async def get_contact_lists(
    list_type: str = "email",
    interest: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get contact lists for email or SMS campaigns.
    list_type: 'email' or 'sms'
    interest: None (all), 'Both', 'Drag Racing', 'Car Enthusiast'
    Returns only active members (not inactive) who have opted in.
    """
    
    # Build query - exclude inactive members
    query = {"inactive": {"$ne": True}}
    
    # Filter by opt-in preference
    if list_type == "email":
        query["receive_emails"] = True
    else:  # sms
        query["receive_sms"] = True
    
    # Filter by interest if specified
    if interest and interest in ['Both', 'Drag Racing', 'Car Enthusiast']:
        query["interest"] = interest
    
    # Get matching members
    members = await db.members.find(query, {"_id": 0, "email1": 1, "email2": 1, "phone1": 1, "phone2": 1}).to_list(10000)
    
    if list_type == "email":
        # Collect all non-empty emails
        emails = []
        for m in members:
            if m.get("email1") and m["email1"].strip():
                emails.append(m["email1"].strip())
            if m.get("email2") and m["email2"].strip():
                emails.append(m["email2"].strip())
        # Remove duplicates and join with semicolon
        unique_emails = list(dict.fromkeys(emails))  # Preserves order, removes duplicates
        return {"contacts": ";".join(unique_emails), "count": len(unique_emails)}
    else:
        # Collect all non-empty phone numbers
        phones = []
        for m in members:
            if m.get("phone1") and m["phone1"].strip():
                phones.append(m["phone1"].strip())
            if m.get("phone2") and m["phone2"].strip():
                phones.append(m["phone2"].strip())
        # Remove duplicates and join with semicolon
        unique_phones = list(dict.fromkeys(phones))
        return {"contacts": ";".join(unique_phones), "count": len(unique_phones)}


@api_router.post("/admin/mark-expired-unfinancial")
async def mark_expired_members_unfinancial(current_user: User = Depends(get_current_user)):
    """
    Mark all members whose expiry date has passed as unfinancial.
    Any authenticated user can run this.
    """
    today = datetime.now(timezone.utc)
    
    # Get all financial members
    members = await db.members.find({"financial": True}, {"_id": 0}).to_list(10000)
    
    updated_count = 0
    for m in members:
        expiry = m.get("expiry_date")
        if expiry:
            try:
                if isinstance(expiry, str):
                    expiry_date = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
                else:
                    expiry_date = expiry
                
                if expiry_date.tzinfo is None:
                    expiry_date = expiry_date.replace(tzinfo=timezone.utc)
                
                if expiry_date < today:
                    # Mark as unfinancial
                    await db.members.update_one(
                        {"member_id": m.get("member_id")},
                        {"$set": {"financial": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    updated_count += 1
            except Exception as e:
                logging.error(f"Error processing member {m.get('member_id')}: {e}")
                continue
    
    return {"message": f"Marked {updated_count} expired members as unfinancial"}

@api_router.get("/members/printable-list")
async def get_printable_member_list(current_user: User = Depends(get_current_user)):
    """
    Get a printable list of members sorted by member number.
    Returns member_number and name in two columns.
    Any authenticated user can access this endpoint.
    """
    members = await db.members.find({}, {"_id": 0, "member_number": 1, "name": 1}).to_list(10000)
    
    # Sort by member number treating alphanumeric properly
    sorted_members = sorted(members, key=sort_member_number_key)
    
    return sorted_members

@api_router.get("/members/{member_id}", response_model=Member)
async def get_member(member_id: str, current_user: User = Depends(get_current_user)):
    
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    for field in ['created_at', 'updated_at', 'date_paid', 'expiry_date']:
        if field in member and isinstance(member[field], str) and member[field]:
            try:
                member[field] = datetime.fromisoformat(member[field])
            except ValueError:
                member[field] = None
        elif field in member and member[field] == '':
            member[field] = None
    return Member(**member)

@api_router.post("/members", response_model=Member)
async def create_member(member_data: MemberCreate, current_user: User = Depends(get_current_user)):
    
    # Get the highest numeric member number for auto-generation
    all_members = await db.members.find({}, {"_id": 0, "member_number": 1}).to_list(10000)
    numeric_numbers = []
    for m in all_members:
        try:
            numeric_numbers.append(int(m.get("member_number", 0)))
        except (ValueError, TypeError):
            pass
    next_number = str(max(numeric_numbers) + 1) if numeric_numbers else "1"
    
    member_id = f"member_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    member_dict = member_data.model_dump()
    if member_dict.get('date_paid'):
        member_dict['date_paid'] = datetime.fromisoformat(member_dict['date_paid']).isoformat()
    if member_dict.get('expiry_date'):
        member_dict['expiry_date'] = datetime.fromisoformat(member_dict['expiry_date']).isoformat()
    
    new_member = {
        "member_id": member_id,
        "member_number": next_number,
        **member_dict,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    await db.members.insert_one(new_member)
    
    return await get_member(member_id)

@api_router.put("/members/{member_id}", response_model=Member)
async def update_member(member_id: str, member_data: MemberUpdate, current_user: User = Depends(get_current_user)):
    
    logging.info(f"Updating member {member_id} with data: {member_data.model_dump()}")
    
    # Build update dict, including fields that can be set to null/empty
    raw_data = member_data.model_dump()
    update_dict = {}
    
    for k, v in raw_data.items():
        # Include None values for optional string fields to allow clearing them
        if k in ['phone1', 'phone2', 'email1', 'email2', 'comments', 'state', 'date_paid', 'expiry_date']:
            # Convert empty strings to None for date fields
            if k in ['date_paid', 'expiry_date'] and v == '':
                update_dict[k] = None
            else:
                update_dict[k] = v  # Include None values to allow clearing
        elif v is not None:
            update_dict[k] = v
    
    if 'date_paid' in update_dict and update_dict['date_paid']:
        update_dict['date_paid'] = datetime.fromisoformat(update_dict['date_paid']).isoformat()
    if 'expiry_date' in update_dict and update_dict['expiry_date']:
        update_dict['expiry_date'] = datetime.fromisoformat(update_dict['expiry_date']).isoformat()
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    logging.info(f"Final update dict for {member_id}: {update_dict}")
    
    result = await db.members.update_one(
        {"member_id": member_id},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return await get_member(member_id)

@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.vehicles.delete_many({"member_id": member_id})
    
    result = await db.members.delete_one({"member_id": member_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted"}

@api_router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(
    member_id: Optional[str] = None,
    registration: Optional[str] = None,
    include_archived: bool = False,
    current_user: User = Depends(get_current_user)
):
    
    query = {}
    if member_id:
        query["member_id"] = member_id
    if registration:
        query["registration"] = {"$regex": registration, "$options": "i"}
    if not include_archived:
        query["archived"] = False
    
    vehicles = await db.vehicles.find(query, {"_id": 0}).to_list(1000)
    for v in vehicles:
        for field in ['created_at', 'updated_at', 'entry_date', 'expiry_date']:
            if field in v and isinstance(v[field], str):
                v[field] = datetime.fromisoformat(v[field])
    return vehicles

@api_router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, current_user: User = Depends(get_current_user)):
    if current_user.role == "member_editor":
        raise HTTPException(status_code=403, detail="Full editor or admin access required")
    
    vehicle_id = f"vehicle_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    vehicle_dict = vehicle_data.model_dump()
    if vehicle_dict.get('entry_date'):
        vehicle_dict['entry_date'] = datetime.fromisoformat(vehicle_dict['entry_date']).isoformat()
    if vehicle_dict.get('expiry_date'):
        vehicle_dict['expiry_date'] = datetime.fromisoformat(vehicle_dict['expiry_date']).isoformat()
    
    new_vehicle = {
        "vehicle_id": vehicle_id,
        **vehicle_dict,
        "archived": False,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    await db.vehicles.insert_one(new_vehicle)
    
    vehicle = await db.vehicles.find_one({"vehicle_id": vehicle_id}, {"_id": 0})
    for field in ['created_at', 'updated_at', 'entry_date', 'expiry_date']:
        if field in vehicle and isinstance(vehicle[field], str):
            vehicle[field] = datetime.fromisoformat(vehicle[field])
    return Vehicle(**vehicle)

@api_router.put("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role == "member_editor":
        raise HTTPException(status_code=403, detail="Full editor or admin access required")
    
    update_dict = {k: v for k, v in vehicle_data.model_dump().items() if v is not None}
    if 'entry_date' in update_dict and update_dict['entry_date']:
        update_dict['entry_date'] = datetime.fromisoformat(update_dict['entry_date']).isoformat()
    if 'expiry_date' in update_dict and update_dict['expiry_date']:
        update_dict['expiry_date'] = datetime.fromisoformat(update_dict['expiry_date']).isoformat()
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.vehicles.update_one(
        {"vehicle_id": vehicle_id},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vehicle = await db.vehicles.find_one({"vehicle_id": vehicle_id}, {"_id": 0})
    for field in ['created_at', 'updated_at', 'entry_date', 'expiry_date']:
        if field in vehicle and isinstance(vehicle[field], str):
            vehicle[field] = datetime.fromisoformat(vehicle[field])
    return Vehicle(**vehicle)

@api_router.delete("/vehicles/{vehicle_id}")
async def archive_vehicle(vehicle_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role == "member_editor":
        raise HTTPException(status_code=403, detail="Full editor or admin access required")
    
    result = await db.vehicles.update_one(
        {"vehicle_id": vehicle_id},
        {"$set": {"archived": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle archived"}

@api_router.post("/vehicles/{vehicle_id}/restore")
async def restore_vehicle(vehicle_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.vehicles.update_one(
        {"vehicle_id": vehicle_id},
        {"$set": {"archived": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle restored"}

@api_router.delete("/vehicles/{vehicle_id}/permanent")
async def delete_vehicle_permanent(vehicle_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.vehicles.delete_one({"vehicle_id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle permanently deleted"}

@api_router.get("/vehicle-options", response_model=List[VehicleOption])
async def get_vehicle_options(type: Optional[str] = None, current_user: User = Depends(get_current_user)):
    
    query = {}
    if type:
        query["type"] = type
    
    options = await db.vehicle_options.find(query, {"_id": 0}).to_list(1000)
    for opt in options:
        if isinstance(opt['created_at'], str):
            opt['created_at'] = datetime.fromisoformat(opt['created_at'])
    return options

@api_router.post("/vehicle-options", response_model=VehicleOption)
async def create_vehicle_option(option_data: VehicleOptionCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    option_id = f"option_{uuid.uuid4().hex[:12]}"
    new_option = {
        "option_id": option_id,
        "type": option_data.type,
        "value": option_data.value,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vehicle_options.insert_one(new_option)
    
    option = await db.vehicle_options.find_one({"option_id": option_id}, {"_id": 0})
    if isinstance(option['created_at'], str):
        option['created_at'] = datetime.fromisoformat(option['created_at'])
    return VehicleOption(**option)

@api_router.delete("/vehicle-options/{option_id}")
async def delete_vehicle_option(option_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.vehicle_options.delete_one({"option_id": option_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Option not found")
    return {"message": "Option deleted"}

@api_router.post("/members/bulk-upload")
async def bulk_upload_members(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    
    content = await file.read()
    
    # Try different encodings - Excel often uses cp1252 or latin-1
    csv_data = None
    for encoding in ['utf-8', 'utf-8-sig', 'cp1252', 'latin-1']:
        try:
            csv_data = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    
    if csv_data is None:
        raise HTTPException(status_code=400, detail="Could not decode CSV file. Please save it as UTF-8 encoding.")
    
    reader = csv.DictReader(io.StringIO(csv_data))
    
    # Get the highest numeric member number for auto-generation
    all_members = await db.members.find({}, {"_id": 0, "member_number": 1}).to_list(10000)
    numeric_numbers = []
    for m in all_members:
        try:
            numeric_numbers.append(int(m.get("member_number", 0)))
        except (ValueError, TypeError):
            pass
    next_auto_number = max(numeric_numbers) + 1 if numeric_numbers else 1
    
    count = 0
    skipped = 0
    errors = []
    for idx, row in enumerate(reader, start=2):
        try:
            member_id = f"member_{uuid.uuid4().hex[:12]}"
            now = datetime.now(timezone.utc)
            
            # Use member_number from CSV if provided (supports alphanumeric), otherwise auto-generate
            if row.get('member_number') and row.get('member_number').strip():
                member_number = str(row.get('member_number').strip())
            else:
                member_number = str(next_auto_number)
                next_auto_number += 1
            
            # Check if member_number already exists (prevent duplicates)
            existing = await db.members.find_one({"member_number": member_number}, {"_id": 0})
            if existing:
                skipped += 1
                print(f"Skipping duplicate member_number: {member_number}")
                continue
            
            # Parse family members if present
            family_members = None
            if row.get('family_members'):
                family_members = [m.strip() for m in row.get('family_members').split(';') if m.strip()]
            
            # Clean up email fields - convert empty strings to None
            email1 = row.get('email1', '').strip() if row.get('email1') else None
            email1 = email1 if email1 and '@' in email1 else None
            
            email2 = row.get('email2', '').strip() if row.get('email2') else None
            email2 = email2 if email2 and '@' in email2 else None
            
            # Clean up membership_type - default to 'Full' if empty
            membership_type = row.get('membership_type', '').strip()
            if membership_type not in ['Full', 'Family', 'Junior']:
                membership_type = 'Full'
            
            # Clean up interest - default to 'Both' if empty
            interest = row.get('interest', '').strip()
            if interest not in ['Drag Racing', 'Car Enthusiast', 'Both']:
                interest = 'Both'
            
            new_member = {
                "member_id": member_id,
                "member_number": member_number,
                "name": row.get('name', ''),
                "address": row.get('address', ''),
                "suburb": row.get('suburb', ''),
                "postcode": row.get('postcode', ''),
                "state": row.get('state', ''),
                "phone1": row.get('phone1', '').strip() if row.get('phone1') else None,
                "phone2": row.get('phone2', '').strip() if row.get('phone2') else None,
                "email1": email1,
                "email2": email2,
                "life_member": row.get('life_member', '').lower() in ['true', 'yes', '1'],
                "financial": row.get('financial', '').lower() in ['true', 'yes', '1'],
                "inactive": row.get('inactive', '').lower() in ['true', 'yes', '1'],
                "membership_type": membership_type,
                "family_members": family_members,
                "interest": interest,
                "date_paid": datetime.fromisoformat(row['date_paid']).isoformat() if row.get('date_paid') and row.get('date_paid').strip() else None,
                "expiry_date": datetime.fromisoformat(row['expiry_date']).isoformat() if row.get('expiry_date') and row.get('expiry_date').strip() else None,
                "comments": row.get('comments', '').strip() if row.get('comments') else None,
                "receive_emails": row.get('receive_emails', '').lower() not in ['false', 'no', '0'],
                "receive_sms": row.get('receive_sms', '').lower() not in ['false', 'no', '0'],
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.members.insert_one(new_member)
            count += 1
        except Exception as e:
            member_name = row.get('name', 'Unknown')
            member_num = row.get('member_number', 'N/A')
            error_msg = str(e)
            # Simplify error message
            if 'duplicate key' in error_msg.lower():
                errors.append(f"Row {idx} ({member_num} - {member_name}): Duplicate member_number")
            else:
                errors.append(f"Row {idx} ({member_num} - {member_name}): {error_msg[:100]}")
            continue
    
    message_parts = [f"{count} members uploaded"]
    if skipped > 0:
        message_parts.append(f"{skipped} duplicates skipped")
    if errors:
        message_parts.append(f"{len(errors)} failed")
        error_summary = "; ".join(errors[:5])
        if len(errors) > 5:
            error_summary += f" ... and {len(errors) - 5} more errors"
        return {"message": ", ".join(message_parts), "errors": error_summary}
    
    return {"message": ", ".join(message_parts) if skipped > 0 else f"{count} members uploaded successfully"}

@api_router.post("/vehicles/bulk-upload")
async def bulk_upload_vehicles(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if current_user.role == "member_editor":
        raise HTTPException(status_code=403, detail="Full editor or admin access required")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    
    content = await file.read()
    csv_data = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(csv_data))
    
    count = 0
    skipped = 0
    errors = []
    
    for idx, row in enumerate(reader, start=2):
        try:
            vehicle_id = f"vehicle_{uuid.uuid4().hex[:12]}"
            now = datetime.now(timezone.utc)
            
            registration = row.get('registration', '').strip()
            
            # Check if registration already exists (prevent duplicates)
            if registration:
                existing = await db.vehicles.find_one({"registration": registration, "archived": False}, {"_id": 0})
                if existing:
                    skipped += 1
                    print(f"Skipping duplicate registration: {registration}")
                    continue
            
            new_vehicle = {
                "vehicle_id": vehicle_id,
                "member_id": row.get('member_id', ''),
                "log_book_number": row.get('log_book_number', ''),
                "entry_date": datetime.fromisoformat(row['entry_date']).isoformat() if row.get('entry_date') and row.get('entry_date').strip() else None,
                "expiry_date": datetime.fromisoformat(row['expiry_date']).isoformat() if row.get('expiry_date') and row.get('expiry_date').strip() else None,
                "make": row.get('make', ''),
                "body_style": row.get('body_style', ''),
                "model": row.get('model', ''),
                "year": int(row.get('year', 0)) if row.get('year') else 0,
                "registration": registration,
                "status": row.get('status', 'Active'),
                "reason": row.get('reason', ''),
                "archived": False,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.vehicles.insert_one(new_vehicle)
            count += 1
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
            continue
    
    message_parts = [f"{count} vehicles uploaded"]
    if skipped > 0:
        message_parts.append(f"{skipped} duplicates skipped")
    if errors:
        message_parts.append(f"{len(errors)} failed")
        error_summary = "; ".join(errors[:5])
        if len(errors) > 5:
            error_summary += f" ... and {len(errors) - 5} more errors"
        return {"message": ", ".join(message_parts), "errors": error_summary}
    
    return {"message": ", ".join(message_parts) if skipped > 0 else f"{count} vehicles uploaded successfully"}

@api_router.post("/members/export")
async def export_members(filters: ExportFilters, current_user: User = Depends(get_current_user)):
    
    query = {}
    if filters.receive_emails is not None:
        query["receive_emails"] = filters.receive_emails
    if filters.receive_sms is not None:
        query["receive_sms"] = filters.receive_sms
    if filters.interest:
        query["interest"] = filters.interest
    
    members = await db.members.find(query, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    if members:
        writer = csv.DictWriter(output, fieldnames=members[0].keys())
        writer.writeheader()
        for member in members:
            for key, value in member.items():
                if isinstance(value, datetime):
                    member[key] = value.isoformat()
            writer.writerow(member)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=members_export.csv"}
    )

import re

def sort_member_number_key(member):
    """
    Sort function to handle alphanumeric member numbers.
    Treats 1, 2, 3...9, 10A, 10B, 11...99, 100 as numeric with optional letter suffix.
    """
    num_str = member.get('member_number', '0')
    # Extract numeric part and optional letter suffix
    match = re.match(r'^(\d+)([A-Za-z]*)$', str(num_str))
    if match:
        num_part = int(match.group(1))
        letter_part = match.group(2).upper() if match.group(2) else ''
        return (num_part, letter_part)
    # Fallback for non-standard formats
    return (float('inf'), str(num_str))

@api_router.post("/admin/clear-all-data")
async def clear_all_data(
    request: Request,
    confirm: str = Query(...),
    session_token: Optional[str] = Cookie(None)
):
    current_user = await get_current_user(request, session_token)
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if confirm != "DELETE_ALL_DATA":
        raise HTTPException(status_code=400, detail="Confirmation text must be 'DELETE_ALL_DATA'")
    
    # Count before deletion
    member_count = await db.members.count_documents({})
    vehicle_count = await db.vehicles.count_documents({})
    
    # Delete all members and vehicles
    await db.members.delete_many({})
    await db.vehicles.delete_many({})
    
    return {
        "message": "All data cleared successfully",
        "deleted_members": member_count,
        "deleted_vehicles": vehicle_count
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def init_default_options():
    existing_statuses = await db.vehicle_options.count_documents({"type": "status"})
    if existing_statuses == 0:
        default_statuses = ["Active", "Cancelled", "Inactive"]
        for status in default_statuses:
            await db.vehicle_options.insert_one({
                "option_id": f"option_{uuid.uuid4().hex[:12]}",
                "type": "status",
                "value": status,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    existing_reasons = await db.vehicle_options.count_documents({"type": "reason"})
    if existing_reasons == 0:
        default_reasons = ["Blank", "Sold Vehicle", "No Longer Financial", "Lost Log Book"]
        for reason in default_reasons:
            await db.vehicle_options.insert_one({
                "option_id": f"option_{uuid.uuid4().hex[:12]}",
                "type": "reason",
                "value": reason,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
