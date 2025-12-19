import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def migrate():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    members = await db.members.find({}).to_list(10000)
    fixed_count = 0
    
    print(f"Found {len(members)} members to check")
    
    for member in members:
        updates = {}
        
        # Fix member_number if it's an integer
        if isinstance(member.get("member_number"), int):
            updates["member_number"] = str(member["member_number"])
            print(f"  Fixing member_number {member['member_number']} -> '{member['member_number']}'")
        
        # Add state field if missing
        if "state" not in member or member.get("state") is None:
            updates["state"] = ""
            print(f"  Adding state field for member {member.get('name', 'Unknown')}")
        
        # Add family_members field if missing
        if "family_members" not in member:
            updates["family_members"] = None
        
        if updates:
            await db.members.update_one(
                {"member_id": member["member_id"]},
                {"$set": updates}
            )
            fixed_count += 1
    
    print(f"\nMigration complete! Fixed {fixed_count} members")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())
