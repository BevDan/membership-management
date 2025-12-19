# Duplicate Prevention in Bulk Uploads

## Overview

The system now **automatically detects and skips duplicate records** during CSV bulk uploads, preventing data duplication issues.

## How It Works

### Members Upload
**Duplicate Detection:** By `member_number`

When you upload a CSV:
1. System checks if each `member_number` already exists in database
2. If exists → **SKIPS** that row (no error, just skipped)
3. If new → **ADDS** the member
4. Final message shows: `"X members uploaded, Y duplicates skipped"`

**Example:**
```
CSV contains:
- Member #99 (already exists in database)
- Member #NEW-001 (new)
- Member #102 (already exists)

Result: "1 members uploaded, 2 duplicates skipped"
Only NEW-001 is added, 99 and 102 are skipped.
```

### Vehicles Upload
**Duplicate Detection:** By `registration` number

When you upload vehicles CSV:
1. System checks if each `registration` already exists (non-archived vehicles)
2. If exists → **SKIPS** that vehicle
3. If new → **ADDS** the vehicle
4. Final message shows: `"X vehicles uploaded, Y duplicates skipped"`

**Example:**
```
CSV contains:
- Registration ABC123 (already exists)
- Registration XYZ789 (new)

Result: "1 vehicles uploaded, 1 duplicates skipped"
Only XYZ789 is added.
```

---

## Benefits

### 1. Safe Re-uploads
You can safely upload the same CSV multiple times:
- First upload: Adds all records
- Second upload: Skips all (all duplicates)
- Result: No duplicate data!

### 2. Partial Upload Recovery
If upload partially fails:
1. Fix the CSV errors
2. Re-upload the entire file
3. Successfully uploaded members are skipped
4. Only new/fixed members are added

### 3. Data Integrity
- No more duplicate member numbers
- No more duplicate vehicle registrations
- Clean, consistent database

---

## Upload Messages Explained

### Members Upload Messages

**Success (All New):**
```
"5 members uploaded successfully"
```
All 5 members were new and added.

**Success (Some Duplicates):**
```
"3 members uploaded, 2 duplicates skipped"
```
3 new members added, 2 were already in database.

**Partial Failure:**
```
"3 members uploaded, 2 duplicates skipped, 1 failed"
Errors: "Row 4: Missing required field 'name'"
```
3 added, 2 skipped, 1 had an error (shown in details).

**All Duplicates:**
```
"0 members uploaded, 5 duplicates skipped"
```
All members in CSV already exist in database.

### Vehicles Upload Messages

Same format as members, but based on registration numbers.

---

## Testing Duplicate Prevention

### Test File Available
`/app/test_duplicate_upload.csv`

This file contains:
- Member #99 (exists in your database - will be skipped)
- Member #NEW-001 (new - will be added)

**To Test:**
1. Go to Bulk Upload page
2. Upload `/app/test_duplicate_upload.csv`
3. Expected result: `"1 members uploaded, 1 duplicates skipped"`
4. Verify: Only NEW-001 appears in members list, #99 unchanged

---

## Common Scenarios

### Scenario 1: Correcting Member Data
**Problem:** Member #50 has wrong address, already uploaded

**Solution:**
1. Delete member #50 from Members page (Admin only)
2. Upload CSV with corrected member #50
3. New data is added

**Alternative (No Delete):**
Edit the member directly in the Members page instead of re-uploading.

### Scenario 2: Adding New Members to Existing List
**Problem:** Need to add 10 new members, already have 344 in system

**Solution:**
1. Create CSV with ONLY the 10 new members
2. Upload - all 10 added
3. No duplicates, no issues

**OR:**
Export all members → Add 10 new rows → Upload entire CSV → Only new 10 added.

### Scenario 3: Migration from Another System
**Problem:** Moving from Sheets, want to ensure clean import

**Solution:**
1. Export from Sheets to CSV
2. Upload to system
3. If you accidentally upload twice, second upload skips all (safe!)

---

## Important Notes

### Member Numbers
- Duplicates detected by **exact match** on member_number
- `99` ≠ `099` (string comparison)
- `M-101` ≠ `M101` (case and hyphen matter)
- Keep your format consistent!

### Vehicle Registration
- Duplicates detected by **exact match** on registration
- Case-sensitive: `ABC123` ≠ `abc123`
- Whitespace matters: `ABC123` ≠ `ABC 123`
- Only checks non-archived vehicles

### Empty Member Numbers
If member_number is blank in CSV:
- Auto-generates next number (1, 2, 3...)
- Could create unintentional duplicates if you upload twice
- **Best Practice:** Always include member numbers in CSV

---

## Best Practices

### ✓ DO:
- Export current members before uploading updates
- Use consistent member number format (M-001, M-002...)
- Include member_number for ALL rows in CSV
- Test with small CSV first (5-10 records)
- Check upload message for skipped count

### ✗ DON'T:
- Upload the same file multiple times (wastes time, all skipped)
- Mix member number formats (99, M-99, 099 are different)
- Leave member_number blank unless creating truly new members
- Ignore the upload message (tells you what happened)

---

## Troubleshooting

**Q: I uploaded but message says "0 uploaded, 50 skipped"**  
A: All 50 members already exist in database. No action needed.

**Q: I want to update existing member data**  
A: Delete the old member first, then upload new data. OR edit directly in Members page.

**Q: Can I force re-upload/overwrite?**  
A: No. Duplicates are always skipped. Delete existing record first if you need to replace it.

**Q: What if I upload same CSV to vehicles?**  
A: Same behavior - duplicates skipped based on registration number.

**Q: Does this work for manual member creation?**  
A: No. Manual creation UI allows duplicate member numbers (for flexibility). Duplicate prevention only applies to bulk CSV uploads.

---

## Technical Details

### Detection Query (Members)
```javascript
await db.members.find_one({"member_number": member_number})
```
If found → Skip. If not found → Insert.

### Detection Query (Vehicles)
```javascript
await db.vehicles.find_one({
  "registration": registration,
  "archived": false
})
```
Allows same registration if previous vehicle is archived.

---

## Summary

✓ **Duplicate prevention active for bulk uploads**  
✓ **Members: Detected by member_number**  
✓ **Vehicles: Detected by registration**  
✓ **Safe to re-upload CSVs**  
✓ **Clear messaging about skipped records**  
✓ **No more database bloat from accidental re-uploads**

Your data integrity is now protected! 🏁
