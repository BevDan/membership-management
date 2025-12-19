# Role Testing Guide for Steel City Drag Club Management System

## User Roles Overview

The system has 3 role levels with different permissions:

### 1. **Admin** (Full Access)
- Manage members (create, edit, delete)
- Manage vehicles (create, edit, archive, restore, permanent delete)
- Access admin panel
- Manage users (create, edit, delete editors)
- Manage vehicle dropdown options (statuses & reasons)
- View archived vehicles
- Bulk upload/export
- **All features unlocked**

### 2. **Full Editor** (Members + Vehicles)
- Manage members (create, edit, delete - admin only)
- Manage vehicles (create, edit, archive)
- Bulk upload/export
- **Cannot access**: Admin panel, archived vehicles, permanent delete

### 3. **Member Editor** (Members Only)
- Manage members (create, edit, delete - admin only)
- Bulk upload members, export data
- **Cannot access**: Vehicles, Admin panel, archived vehicles

---

## How to Test Different Roles

### Step 1: Login as Admin (First User)
1. Go to the login page
2. Click "Login with Google"
3. The first user to login automatically becomes **Admin**

### Step 2: Create Additional Test Users in Admin Panel

1. Once logged in as Admin, navigate to **Admin Panel** from the dashboard
2. Click the **Users** tab
3. Click **"Add User"** button
4. Fill in the user details:
   - **Email**: The Gmail address of the person you want to test with
   - **Name**: Their display name
   - **Role**: Select from dropdown:
     - `Admin` - Full access
     - `Full Editor` - Members + Vehicles
     - `Member Editor` - Members only
5. Click **"Create"**

### Step 3: Login with Test User Accounts

**Option A: Use Different Google Accounts**
1. Logout from admin account
2. Login with the Google account you added as an editor
3. Test the permissions for that role

**Option B: Use Private/Incognito Windows**
1. Keep admin logged in main browser window
2. Open incognito/private window
3. Go to your app URL
4. Login with editor account
5. Test simultaneously in both windows

---

## Quick Permission Reference Table

| Feature | Member Editor | Full Editor | Admin |
|---------|--------------|-------------|-------|
| View Members | ✓ | ✓ | ✓ |
| Create/Edit Members | ✓ | ✓ | ✓ |
| Delete Members | ✗ | ✗ | ✓ |
| View Vehicles | ✗ | ✓ | ✓ |
| Create/Edit Vehicles | ✗ | ✓ | ✓ |
| Archive Vehicles | ✗ | ✓ | ✓ |
| View Archived Vehicles | ✗ | ✗ | ✓ |
| Restore Vehicles | ✗ | ✗ | ✓ |
| Permanent Delete | ✗ | ✗ | ✓ |
| Bulk Upload Members | ✓ | ✓ | ✓ |
| Bulk Upload Vehicles | ✗ | ✓ | ✓ |
| Export Data | ✓ | ✓ | ✓ |
| Admin Panel | ✗ | ✗ | ✓ |
| Manage Users | ✗ | ✗ | ✓ |
| Manage Vehicle Options | ✗ | ✗ | ✓ |

---

## What to Test for Each Role

### Testing Member Editor
1. Login and verify dashboard shows "MEMBER EDITOR" in header
2. Verify "Manage Members" button is visible
3. Verify "Manage Vehicles" button is NOT visible
4. Verify "Admin Panel" button is NOT visible
5. Test creating and editing members
6. Try to delete a member - should see 403 error or no delete button
7. Test bulk upload for members
8. Test export functionality

### Testing Full Editor
1. Login and verify dashboard shows "FULL EDITOR" in header
2. Verify both "Manage Members" and "Manage Vehicles" buttons are visible
3. Verify "Admin Panel" and "Archived Vehicles" buttons are NOT visible
4. Test creating, editing members
5. Test creating, editing, and archiving vehicles
6. Try to access /archived-vehicles URL directly - should redirect
7. Test bulk upload for both members and vehicles
8. Test export functionality

### Testing Admin
1. Verify all dashboard buttons are visible
2. Test all CRUD operations on members and vehicles
3. Test archiving and restoring vehicles
4. Test permanent deletion of vehicles
5. Test admin panel - creating, editing, deleting users
6. Test managing vehicle dropdown options
7. Verify access to all pages

---

## Testing with CSV Files

### Sample Member CSV (with existing member numbers)
```csv
member_number,name,address,suburb,postcode,phone1,email1,life_member,financial,membership_type,interest,receive_emails,receive_sms
101,John Smith,123 Main St,Adelaide,5000,0412345678,john@example.com,false,true,Full,Drag Racing,true,true
102,Jane Doe,456 Park Ave,Adelaide,5001,0423456789,jane@example.com,true,true,Family,Both,true,false
,Bob Wilson,789 King St,Adelaide,5002,0434567890,bob@example.com,false,false,Junior,Car Enthusiast,false,true
```

**Note**: The third row has no member_number, so it will auto-generate (103, 104, etc.)

---

## Troubleshooting Role Permissions

**Issue**: User sees features they shouldn't have access to
- **Solution**: Logout and login again to refresh permissions

**Issue**: Can't create new users in admin panel
- **Solution**: Only Admin role can create users. Check your role in the header.

**Issue**: Editor can't access a page
- **Solution**: This is expected! Editors have restricted access. Refer to the permission table above.

---

## Best Practice for Production

1. **Create one Admin account** for yourself
2. **Create Full Editor accounts** for trusted members who handle both memberships and vehicles
3. **Create Member Editor accounts** for general volunteers who only need to update member information
4. **Regularly review user list** in Admin Panel and remove inactive editors

---

## Need Help?

If you encounter any issues or unexpected behavior with role permissions, document:
- Which role you're testing
- What action you tried
- What happened vs what you expected
- Any error messages shown
