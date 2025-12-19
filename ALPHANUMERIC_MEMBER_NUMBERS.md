# Alphanumeric Member Numbers Support

## What Changed?

Your Steel City Drag Club management system now **fully supports alphanumeric member numbers**!

## Supported Formats

You can now use ANY format for member numbers, including:

- **Simple numbers**: `101`, `102`, `103`
- **Prefixed**: `M-101`, `M-102`, `M-103`
- **Year-based**: `2024-001`, `2024-002`, `2025-001`
- **Category codes**: `FAM-50` (Family), `JNR-25` (Junior), `LIFE-10` (Life Member)
- **Custom codes**: `ABC123`, `SCDC-2024-001`, or any format you want

## How It Works

### Manual Entry
When creating a member manually through the UI:
- Auto-generates numeric IDs (1, 2, 3, etc.) if you don't specify
- You can edit the member after creation to change to alphanumeric

### CSV Bulk Upload
The system intelligently handles member numbers:

1. **Preserve existing numbers** - Any member_number in CSV is used as-is (text or numbers)
2. **Auto-generate when blank** - Empty member_number fields get the next numeric ID
3. **Mix and match** - You can have both alphanumeric and numeric in same upload

### Example CSV:
```csv
member_number,name,address,suburb,postcode,state...
M-101,John Smith,123 Main St,Adelaide,5000,SA...
2024-001,Jane Doe,456 Park Ave,Salisbury,5108,SA...
,Bob Wilson,789 King Rd,Elizabeth,5112,SA...
```

**Result:**
- John gets `M-101` (from CSV)
- Jane gets `2024-001` (from CSV)  
- Bob gets `1` (auto-generated because blank)

## Search Functionality

**Search by Member Number:**
1. Select "Member Number" from dropdown
2. Type your member number exactly as stored
3. Works with both numeric (`101`) and alphanumeric (`M-101`, `2024-001`)

**Examples:**
- Search: `M-101` → Finds member M-101
- Search: `2024-001` → Finds member 2024-001
- Search: `101` → Finds member 101

## Best Practices

### Consistent Formatting
Choose ONE format and stick with it:

**Option A: Prefixed Numbers**
```
M-001, M-002, M-003...
```

**Option B: Year-Based**
```
2024-001, 2024-002, 2025-001...
```

**Option C: Category Prefixes**
```
FAM-001 (Family)
FULL-001 (Full)
JNR-001 (Junior)
LIFE-001 (Life Member)
```

### Padding Numbers
Use leading zeros for better sorting:
- ✓ Good: `M-001`, `M-002`, `M-010`, `M-100`
- ✗ Bad: `M-1`, `M-2`, `M-10`, `M-100`

This ensures proper alphabetical sorting in lists.

## Sample Files

### Sample with Various Formats
`/app/sample_alphanumeric_members.csv`

This file includes examples of:
- `M-101` (Simple prefix)
- `2024-001` (Year-based)
- `FAM-50` (Category code)
- `JNR-25` (Junior code)
- Blank (auto-generates)

### Original Numeric Sample
`/app/sample_members_with_numbers.csv`

Still works! Pure numeric IDs (101, 102, 103...).

## Migration from Existing System

If you're moving from Google Sheets with existing member numbers:

### Step 1: Export from Sheets
Export your current member list with their numbers

### Step 2: Update CSV Headers
Make sure your CSV has `member_number` column (first column recommended)

### Step 3: Import
Upload via Bulk Upload page - all your existing numbers will be preserved exactly

### Example Migration:
**Your existing Sheets data:**
| Member ID | Name | Address |
|-----------|------|---------|
| M-101 | John | 123 Main |
| FAM-50 | Jane | 456 Park |

**Create CSV:**
```csv
member_number,name,address,suburb,postcode,state...
M-101,John Smith,123 Main St,Adelaide,5000,SA...
FAM-50,Jane Doe,456 Park Ave,Salisbury,5108,SA...
```

**Result:** Perfect preservation of your IDs!

## Error Handling

The bulk upload now provides detailed error reports:

**Success:**
```
"5 members uploaded successfully"
```

**Partial Success:**
```
"3 members uploaded, 2 failed"
Errors: "Row 4: Missing required field 'state'; Row 6: Invalid date format"
```

This helps you identify and fix issues in your CSV quickly.

## Testing

1. **Test with sample file:**
   - Download `/app/sample_alphanumeric_members.csv`
   - Go to Bulk Upload page
   - Upload the file
   - Verify members appear with correct numbers

2. **Test search:**
   - Search for `M-101` by member number
   - Search for `2024-001` by member number
   - Verify results

3. **Test your format:**
   - Create a small CSV with YOUR member number format
   - Upload it
   - Check if numbers preserved correctly

## FAQ

**Q: Can I mix numeric and alphanumeric?**  
A: Yes! The system handles both seamlessly.

**Q: What if I want to change format later?**  
A: Edit each member individually, or export → update CSV → re-import.

**Q: Is there a character limit?**  
A: Technically no, but keep it reasonable (under 50 characters).

**Q: Can I use spaces?**  
A: Yes, but hyphens are cleaner: `M 101` vs `M-101`

**Q: What about special characters?**  
A: Most work fine: `-`, `_`, `/`. Avoid quotes and commas in the number itself.

## Summary

✓ **Alphanumeric member numbers fully supported**  
✓ **CSV imports preserve your existing IDs**  
✓ **Search works with any format**  
✓ **Auto-generation for blank entries**  
✓ **Detailed error reporting for troubleshooting**  

Your existing member numbering system will work perfectly! 🏁
