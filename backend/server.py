from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, UploadFile, File, Query, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

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

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Member(BaseModel):
    member_id: str
    member_number: int
    name: str
    address: str
    suburb: str
    postcode: str
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    email1: Optional[EmailStr] = None
    email2: Optional[EmailStr] = None
    life_member: bool = False
    financial: bool = False
    membership_type: Literal['Full', 'Family', 'Junior']
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
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    email1: Optional[EmailStr] = None
    email2: Optional[EmailStr] = None
    life_member: bool = False
    financial: bool = False
    membership_type: Literal['Full', 'Family', 'Junior']
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
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    email1: Optional[EmailStr] = None
    email2: Optional[EmailStr] = None
    life_member: Optional[bool] = None
    financial: Optional[bool] = None
    membership_type: Optional[Literal['Full', 'Family', 'Junior']] = None
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

async def get_current_user(session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None) -> User:
    token = session_token
    if not token and authorization:
        if authorization.startswith('Bearer '):
            token = authorization[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
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
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            
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
                max_age=7*24*60*60
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
async def get_me(session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    return await get_current_user(session_token, authorization)

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
    member_number: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    
    query = {}
    if member_number:
        query["member_number"] = member_number
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

@api_router.get("/members/{member_id}", response_model=Member)
async def get_member(member_id: str, current_user: User = Depends(get_current_user)):
    
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    for field in ['created_at', 'updated_at', 'date_paid', 'expiry_date']:
        if field in member and isinstance(member[field], str):
            member[field] = datetime.fromisoformat(member[field])
    return Member(**member)

@api_router.post("/members", response_model=Member)
async def create_member(member_data: MemberCreate):
    await get_current_user()
    
    max_member = await db.members.find_one({}, {"_id": 0, "member_number": 1}, sort=[("member_number", -1)])
    next_number = (max_member["member_number"] + 1) if max_member else 1
    
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
async def update_member(member_id: str, member_data: MemberUpdate):
    await get_current_user()
    
    update_dict = {k: v for k, v in member_data.model_dump().items() if v is not None}
    if 'date_paid' in update_dict and update_dict['date_paid']:
        update_dict['date_paid'] = datetime.fromisoformat(update_dict['date_paid']).isoformat()
    if 'expiry_date' in update_dict and update_dict['expiry_date']:
        update_dict['expiry_date'] = datetime.fromisoformat(update_dict['expiry_date']).isoformat()
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.members.update_one(
        {"member_id": member_id},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return await get_member(member_id)

@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str):
    user = await get_current_user()
    if user.role != "admin":
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
    include_archived: bool = False
):
    user = await get_current_user()
    
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
async def create_vehicle(vehicle_data: VehicleCreate):
    user = await get_current_user()
    if user.role == "member_editor":
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
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleUpdate):
    user = await get_current_user()
    if user.role == "member_editor":
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
async def archive_vehicle(vehicle_id: str):
    user = await get_current_user()
    if user.role == "member_editor":
        raise HTTPException(status_code=403, detail="Full editor or admin access required")
    
    result = await db.vehicles.update_one(
        {"vehicle_id": vehicle_id},
        {"$set": {"archived": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle archived"}

@api_router.post("/vehicles/{vehicle_id}/restore")
async def restore_vehicle(vehicle_id: str):
    user = await get_current_user()
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.vehicles.update_one(
        {"vehicle_id": vehicle_id},
        {"$set": {"archived": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle restored"}

@api_router.delete("/vehicles/{vehicle_id}/permanent")
async def delete_vehicle_permanent(vehicle_id: str):
    user = await get_current_user()
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.vehicles.delete_one({"vehicle_id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle permanently deleted"}

@api_router.get("/vehicle-options", response_model=List[VehicleOption])
async def get_vehicle_options(type: Optional[str] = None):
    await get_current_user()
    
    query = {}
    if type:
        query["type"] = type
    
    options = await db.vehicle_options.find(query, {"_id": 0}).to_list(1000)
    for opt in options:
        if isinstance(opt['created_at'], str):
            opt['created_at'] = datetime.fromisoformat(opt['created_at'])
    return options

@api_router.post("/vehicle-options", response_model=VehicleOption)
async def create_vehicle_option(option_data: VehicleOptionCreate):
    user = await get_current_user()
    if user.role != "admin":
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
async def delete_vehicle_option(option_id: str):
    user = await get_current_user()
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.vehicle_options.delete_one({"option_id": option_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Option not found")
    return {"message": "Option deleted"}

@api_router.post("/members/bulk-upload")
async def bulk_upload_members(file: UploadFile = File(...)):
    await get_current_user()
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    
    content = await file.read()
    csv_data = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(csv_data))
    
    max_member = await db.members.find_one({}, {"_id": 0, "member_number": 1}, sort=[("member_number", -1)])
    next_number = (max_member["member_number"] + 1) if max_member else 1
    
    count = 0
    for row in reader:
        member_id = f"member_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        new_member = {
            "member_id": member_id,
            "member_number": next_number,
            "name": row.get('name', ''),
            "address": row.get('address', ''),
            "suburb": row.get('suburb', ''),
            "postcode": row.get('postcode', ''),
            "phone1": row.get('phone1'),
            "phone2": row.get('phone2'),
            "email1": row.get('email1'),
            "email2": row.get('email2'),
            "life_member": row.get('life_member', '').lower() in ['true', 'yes', '1'],
            "financial": row.get('financial', '').lower() in ['true', 'yes', '1'],
            "membership_type": row.get('membership_type', 'Full'),
            "interest": row.get('interest', 'Both'),
            "date_paid": datetime.fromisoformat(row['date_paid']).isoformat() if row.get('date_paid') else None,
            "expiry_date": datetime.fromisoformat(row['expiry_date']).isoformat() if row.get('expiry_date') else None,
            "comments": row.get('comments'),
            "receive_emails": row.get('receive_emails', '').lower() not in ['false', 'no', '0'],
            "receive_sms": row.get('receive_sms', '').lower() not in ['false', 'no', '0'],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await db.members.insert_one(new_member)
        next_number += 1
        count += 1
    
    return {"message": f"{count} members uploaded"}

@api_router.post("/vehicles/bulk-upload")
async def bulk_upload_vehicles(file: UploadFile = File(...)):
    user = await get_current_user()
    if user.role == "member_editor":
        raise HTTPException(status_code=403, detail="Full editor or admin access required")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    
    content = await file.read()
    csv_data = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(csv_data))
    
    count = 0
    for row in reader:
        vehicle_id = f"vehicle_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        new_vehicle = {
            "vehicle_id": vehicle_id,
            "member_id": row.get('member_id', ''),
            "log_book_number": row.get('log_book_number', ''),
            "entry_date": datetime.fromisoformat(row['entry_date']).isoformat() if row.get('entry_date') else None,
            "expiry_date": datetime.fromisoformat(row['expiry_date']).isoformat() if row.get('expiry_date') else None,
            "make": row.get('make', ''),
            "body_style": row.get('body_style', ''),
            "model": row.get('model', ''),
            "year": int(row.get('year', 0)),
            "registration": row.get('registration', ''),
            "status": row.get('status', 'Active'),
            "reason": row.get('reason', ''),
            "archived": False,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await db.vehicles.insert_one(new_vehicle)
        count += 1
    
    return {"message": f"{count} vehicles uploaded"}

@api_router.post("/members/export")
async def export_members(filters: ExportFilters):
    await get_current_user()
    
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
