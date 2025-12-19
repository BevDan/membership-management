import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def cleanup():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    members = await db.members.find({}).to_list(10000)
    fixed_count = 0
    
    print(f"Checking {len(members)} members for bad data...")
    
    for member in members:
        updates = {}
        
        # Fix email1 - empty string to None
        if member.get('email1') == '' or (member.get('email1') and '@' not in str(member.get('email1'))):
            updates['email1'] = None
            print(f"  Fixing email1 for member {member.get('name', 'Unknown')}")
        
        # Fix email2 - empty string to None
        if member.get('email2') == '' or (member.get('email2') and '@' not in str(member.get('email2'))):
            updates['email2'] = None
        
        # Fix membership_type - empty to 'Full'
        if not member.get('membership_type') or member.get('membership_type') not in ['Full', 'Family', 'Junior']:
            updates['membership_type'] = 'Full'
            print(f"  Fixing membership_type for member {member.get('name', 'Unknown')}")
        
        # Fix interest - empty to 'Both'
        if not member.get('interest') or member.get('interest') not in ['Drag Racing', 'Car Enthusiast', 'Both']:
            updates['interest'] = 'Both'
            print(f"  Fixing interest for member {member.get('name', 'Unknown')}")
        
        if updates:
            await db.members.update_one(
                {"member_id": member["member_id"]},
                {"$set": updates}
            )
            fixed_count += 1
    
    print(f"\nCleanup complete! Fixed {fixed_count} members")
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup())
