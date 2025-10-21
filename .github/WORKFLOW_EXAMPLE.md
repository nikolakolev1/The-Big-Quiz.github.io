# Quiz Entry Workflow Example

## What You'll See

### Step 1: Navigate to Issues
On your phone or computer, go to the repository and click the **Issues** tab.

### Step 2: Click "New Issue"
You'll see a green button to create a new issue.

### Step 3: Select "Add Quiz Entry"
You'll see the template option **"Add Quiz Entry"** with description: "Add a new quiz result with photos and attendance"

### Step 4: Fill Out the Form

The form has these fields:

```
Quiz Date: [20.10.2025]
Notes: [Great quiz night! Without Niki and Kris]
Points: [2]
Total Teams: [18]
Our Place: [15]

Attendance:
☑ Nikola K
☑ Asya R
☐ Radi R
☐ Niki G
☐ Kris V
☐ Desi D
☐ Georgi B
☑ Kati B
☑ Tedi S

Photos:
[Drag photos here or paste from clipboard]
```

### Step 5: Submit
Click **"Submit new issue"**

## What Happens Next (Automatic)

Within 1-2 minutes:
1. ✅ GitHub Action starts processing
2. ✅ Photos are downloaded from the issue
3. ✅ Folder `photos/2025-10-20/` is created
4. ✅ Photos are saved as `photo-1.jpg`, `photo-2.jpg`, etc.
5. ✅ New row added to `data/season-2025.csv`:
   ```
   20.10.2025,"Great quiz night! Without Niki and Kris",2,18,15,photos/2025-10-20/photo-1.jpg; photos/2025-10-20/photo-2.jpg
   ```
6. ✅ New row added to `data/presence.csv`:
   ```
   20.10.2025,yes,yes,no,no,no,no,no,yes,yes
   ```
7. ✅ Changes committed to repository
8. ✅ Issue automatically closed with success message

Within 5 minutes:
9. ✅ GitHub Pages rebuilds the site
10. ✅ Your new quiz entry appears on the website!

## Mobile Experience

The form is optimized for mobile:
- **Large touch targets** - Easy to tap on phone
- **Auto-save** - Your draft is saved if you navigate away
- **Paste photos** - Take photos with camera, then paste directly
- **Simple checkboxes** - Easy to tap for attendance
- **One screen** - All fields visible without scrolling much

## Error Handling

If something goes wrong:
- The issue stays open
- A comment is added with error details
- Check the **Actions** tab for full logs
- You can edit the issue and someone can re-trigger the workflow

## Privacy & Security

- Only people with write access to the repository can create issues
- All data is committed to the public repository
- Photos are stored in the repository (public on GitHub Pages)
- No external services are used (everything stays in GitHub)

## Comparison: Old vs New Workflow

### Old Way (Manual)
1. Open `data/season-2025.csv` on phone
2. Add a new row with all data
3. Save and commit
4. Create folder `photos/YYYY-MM-DD/`
5. Upload each photo individually
6. Go back to CSV and add photo filenames
7. Save and commit again
8. Open `data/presence.csv`
9. Add attendance row
10. Save and commit

**Time: ~10-15 minutes** 😓

### New Way (Automated)
1. Open GitHub Issues
2. Click "New Issue" → "Add Quiz Entry"
3. Fill form and attach photos
4. Submit

**Time: ~2-3 minutes** 🎉

**And you can do it immediately after the quiz while memories are fresh!**
