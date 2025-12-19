# Fresh Import Guide - Clear & Reload Data

## When to Use This

Use the "Clear All Data" feature when you need to:
- Start completely fresh with a clean database
- Fix multiple import errors by re-importing from scratch
- Migrate from your old system with a single clean import
- Remove all test data and start with production data

---

## Step-by-Step Process

### Step 1: Prepare Your CSV File

**Before clearing data, make sure your CSV is ready!**

1. Export your current data from Google Sheets or other system
2. Verify CSV has all required columns:
   ```
   member_number, name, address, suburb, postcode, state,
   phone1, phone2, email1, email2, life_member, financial,
   membership_type, family_members, interest, date_paid,
   expiry_date, comments, receive_emails, receive_sms
   ```

3. **Check for common issues:**
   - ✓ All names filled in (no empty names)
   - ✓ membership_type is: Full, Family, or Junior
   - ✓ interest is: Drag Racing, Car Enthusiast, or Both
   - ✓ Dates in YYYY-MM-DD format (or leave blank)
   - ✓ Empty emails should be truly blank (not "" quotes)
   - ✓ Member numbers are unique (no duplicates)

### Step 2: Clear Existing Data

**⚠️ DANGER: This deletes ALL members and vehicles permanently!**

1. Login as Admin
2. Go to **Admin Panel** (from dashboard)
3. Click **"Data Management"** tab
4. Read the warnings carefully
5. Click **"Clear All Members & Vehicles"** button
6. Type exactly: `DELETE_ALL_DATA`
7. Press Enter/OK
8. Wait for success message

**What Gets Deleted:**
- ✗ All member records
- ✗ All vehicle records

**What Stays Safe:**
- ✓ User accounts (admins, editors)
- ✓ Vehicle options (statuses, reasons)
- ✓ Your authentication/login

### Step 3: Import Fresh Data

1. Go to **Bulk Upload** page (from dashboard)
2. Click **"Download Template"** to verify format
3. Click **"Select CSV File"** under Members Upload
4. Choose your prepared CSV file
5. Click **"Upload Members"**
6. Wait for upload to complete

**Success Message Examples:**
```
✓ "344 members uploaded successfully"
✓ "300 members uploaded, 44 duplicates skipped, 0 failed"
✓ "250 members uploaded, 94 failed"
   Errors: Row 45: Missing name; Row 67: Invalid email...
```

### Step 4: Review Import Results

**If Some Rows Failed:**
1. Note the error messages (which rows/what errors)
2. Fix those rows in your CSV
3. Upload again (duplicates will be skipped automatically)
4. Only fixed rows will be imported

**If All Succeeded:**
1. Go to Members page
2. Verify member count matches your CSV
3. Spot-check a few members for correct data
4. You're done! ✓

### Step 5: Import Vehicles (Optional)

If you have vehicles data:
1. Stay on Bulk Upload page
2. Upload vehicles CSV (requires member_id from export)
3. Same process as members

---

## Common Import Errors & Fixes

### Error: "500+ records failing"

**Cause:** CSV has data quality issues

**Fix:**
1. Check for empty names
2. Verify membership_type values
3. Verify interest values
4. Check date formats
5. Remove any weird characters

### Error: "All rows skipped as duplicates"

**Cause:** Data already in database

**Solution:**
- This is actually GOOD if you're re-uploading
- If you want fresh import, use "Clear All Data" first

### Error: "Row X: Missing name"

**Cause:** Member has no name in CSV

**Fix:**
- Add name to that row, or
- Remove that row from CSV

### Error: "Row X: Invalid email"

**Cause:** Email field has invalid format

**Fix:**
- Correct the email address, or
- Leave email field completely blank (not "")

### Error: "Membership_type must be Full, Family, or Junior"

**Cause:** Invalid value in membership_type column

**Fix:**
- Change to one of: Full, Family, Junior
- Or leave blank (defaults to Full)

---

## CSV Format Checklist

Use this before importing:

**Required Fields (Must Have Values):**
- [ ] name
- [ ] address
- [ ] suburb
- [ ] postcode

**Optional But Should Be Consistent:**
- [ ] state (SA, NSW, VIC, etc.)
- [ ] membership_type (Full/Family/Junior or blank)
- [ ] interest (Drag Racing/Car Enthusiast/Both or blank)

**Truly Optional (Can Be Blank):**
- [ ] member_number (auto-generates if blank)
- [ ] phone1, phone2
- [ ] email1, email2
- [ ] date_paid, expiry_date
- [ ] comments
- [ ] family_members (semicolon separated)

**Boolean Fields (true/false or yes/no):**
- [ ] life_member
- [ ] financial
- [ ] receive_emails
- [ ] receive_sms

---

## Testing Your CSV Before Full Import

**Best Practice: Test with 5 rows first!**

1. Copy first 5 rows from your CSV (plus header)
2. Save as `test_import.csv`
3. Upload test file
4. If all 5 succeed, upload the full file
5. If errors, fix and repeat

---

## Backup Strategy

**Before clearing data:**

1. Export current members:
   - Go to Export page
   - Don't apply any filters
   - Download CSV
   - Save as `backup_members_YYYYMMDD.csv`

2. Keep your original CSV from Sheets

3. Now you can safely clear and re-import

---

## Example: Complete Fresh Import

**Scenario:** You have 400 members in Google Sheets, want to import fresh

**Process:**

1. **Prepare:**
   - Export from Sheets → `steel_city_members.csv`
   - Open in Excel/Sheets, verify columns match template
   - Check for blanks in name, address, suburb, postcode
   - Save fixed version

2. **Backup Current Data:**
   - Login to system
   - Export → Download CSV → Save as backup

3. **Clear:**
   - Admin Panel → Data Management tab
   - Clear All Members & Vehicles
   - Type: DELETE_ALL_DATA
   - Confirm

4. **Import:**
   - Bulk Upload → Upload Members
   - Select `steel_city_members.csv`
   - Wait for result

5. **Verify:**
   - Check message: "400 members uploaded successfully"
   - Go to Members page
   - Verify count shows 400
   - Spot check 5-10 members
   - Done!

**Time Required:** 5-10 minutes total

---

## Safety Features

**Multiple Safety Layers:**

1. **Confirmation Required:**
   - Must type exact text to clear data
   - Can't accidentally click and delete

2. **Admin Only:**
   - Only Admin role can clear data
   - Editors cannot access this feature

3. **Users Preserved:**
   - Your admin/editor accounts stay intact
   - No need to recreate accounts after clear

4. **Duplicate Protection:**
   - If you re-upload, duplicates are skipped
   - Safe to upload multiple times

5. **Detailed Error Messages:**
   - Shows exactly which rows failed
   - Shows why they failed
   - Easy to fix and re-upload

---

## Troubleshooting

**Q: I cleared data but Members page shows "Failed to load"**  
A: This is normal when database is empty. Upload your CSV and it will work.

**Q: Upload says "X uploaded" but Members page is empty**  
A: Refresh the page. Or logout and login again.

**Q: I cleared by accident, can I undo?**  
A: No. That's why confirmation is required. Use your backup CSV to restore.

**Q: Can I clear just members or just vehicles?**  
A: Currently no. It clears both. Future enhancement possible.

**Q: Does this delete my admin account?**  
A: No! User accounts are safe. Only member/vehicle records are deleted.

---

## Quick Reference

| Action | Location | Access Level |
|--------|----------|--------------|
| Clear Data | Admin Panel → Data Management | Admin Only |
| Upload CSV | Bulk Upload page | All Roles |
| Export CSV | Export page | All Roles |
| View Members | Members page | All Roles |

---

## Summary

**The Process:**
1. Prepare CSV file (clean & verified)
2. Clear all data (Admin Panel → Data Management)
3. Upload CSV (Bulk Upload page)
4. Verify results (Members page)

**Remember:**
- ⚠️ Clearing is permanent (use confirmation carefully)
- ✓ Duplicate protection is active
- ✓ Detailed error messages help fix issues
- ✓ Can re-upload fixed CSV safely
- ✓ User accounts stay safe

**Your database will be clean and accurate!** 🏁
