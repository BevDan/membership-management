import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv('/app/backend/.env')

async def remove_duplicates():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Get all members
    members = await db.members.find({}).to_list(10000)
    print(f"Total members: {len(members)}")
    
    # Group by member_number to find duplicates
    by_number = defaultdict(list)
    for member in members:
        by_number[member['member_number']].append(member)
    
    # Keep track of deletions
    deleted = 0
    empty_deleted = 0
    
    # Delete empty members (no name)
    for member in members:
        if not member.get('name') or member.get('name').strip() == '':
            await db.members.delete_one({"member_id": member["member_id"]})
            empty_deleted += 1
            print(f"  Deleted empty member #{member.get('member_number')}")
    
    # For duplicates, keep the newest one (latest created_at)
    for number, dups in by_number.items():
        if len(dups) > 1:
            # Sort by created_at, keep the newest
            dups.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            keep = dups[0]
            
            for dup in dups[1:]:
                await db.members.delete_one({"member_id": dup["member_id"]})
                deleted += 1
                print(f"  Deleted duplicate member #{number} - {dup.get('name', 'No name')}")
    
    print(f"\nCleanup complete!")
    print(f"  Deleted {empty_deleted} empty members")
    print(f"  Deleted {deleted} duplicate members")
    
    remaining = await db.members.count_documents({})
    print(f"  Remaining members: {remaining}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(remove_duplicates())
