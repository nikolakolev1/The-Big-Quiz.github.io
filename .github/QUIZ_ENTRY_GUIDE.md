# Quiz Entry Guide

## 🎯 Quick Start (Mobile-Friendly!)

The easiest way to add a new quiz entry is through GitHub Issues:

1. Open GitHub on your phone
2. Go to **Issues** → **New Issue**
3. Select **"Add Quiz Entry"** template
4. Fill out the form and attach photos
5. Submit!

The automation will handle everything else.

## 📋 What You Need to Provide

### Required Information
- **Quiz Date**: In DD.MM.YYYY format (e.g., 20.10.2025)
- **Notes**: Brief description or notes about the quiz
- **Points**: How many points we scored (typically 2-5)
- **Total Teams**: Number of teams competing
- **Our Place**: What position we finished in
- **Attendance**: Check boxes for who was present

### Optional
- **Photos**: Attach photos by dragging/dropping or pasting them into the Photos field

## 🔄 What Happens Automatically

When you submit the issue, a GitHub Action will:

1. **Parse your entry** from the issue form
2. **Download any attached photos** from GitHub
3. **Create a photos folder** named `photos/YYYY-MM-DD/` with your photos
4. **Update `data/season-2025.csv`** with a new row containing:
   - Date (in DD.MM.YYYY format to match existing entries)
   - Notes (in quotes to handle special characters)
   - Points
   - Total teams
   - Our place
   - Photo filenames (semicolon-separated)
5. **Update `data/presence.csv`** with a new row containing:
   - Date (in DD.MM.YYYY format)
   - Yes/no for each of the 9 team members (in order)
6. **Commit the changes** to the repository
7. **Close the issue** with a success message

The website will automatically update within a few minutes as GitHub Pages rebuilds.

## 📝 CSV Format Details

### season-2025.csv Format
```
date,notes,points,teams,place,photos
20.10.2025,"Notes about the quiz",2,18,15,photos/2025-10-20/photo-1.jpg; photos/2025-10-20/photo-2.jpg
```

### presence.csv Format
```
,Nikola K,Asya R,Radi R,Niki G,Kris V,Desi D,Georgi B,Kati B,Tedi S
20.10.2025,yes,yes,no,yes,yes,no,no,yes,yes
```

## 🐛 Troubleshooting

### Issue not processing
- Check that the issue has the `quiz-entry` label
- Check the **Actions** tab to see if the workflow ran
- Look at the workflow logs for error messages

### Photos not appearing
- Make sure photos were attached in the "Photos" section of the issue
- Check that photos are in standard formats (JPG, PNG, GIF, WebP)
- GitHub supports pasting images directly - try that if drag-and-drop doesn't work

### Date format issues
- Use DD.MM.YYYY format (e.g., 20.10.2025)
- Make sure to use periods (.) not slashes or dashes
- Pad single digits with zero (e.g., 05.10.2025 not 5.10.2025)

### Attendance not recorded correctly
- Make sure to check the boxes for team members who were present
- Leave unchecked for those who were absent

### Website not updating
- GitHub Pages can take 2-5 minutes to rebuild
- Try force-refreshing your browser (Ctrl+F5 or Cmd+Shift+R)
- Check that the CSV files were actually updated in the repository

## 🔧 Manual Entry (Fallback)

If the automated workflow fails, you can still add entries manually:

1. **Create photo folder**: `photos/YYYY-MM-DD/`
2. **Upload photos** to that folder
3. **Edit `data/season-2025.csv`**: Add a new row after the header with your data
4. **Edit `data/presence.csv`**: Add a new row after the header with attendance
5. **Commit and push** the changes

## 📱 Tips for Mobile Use

- **Pasting photos**: On mobile, take photos with your camera app, then paste them directly into the Photos field in the issue
- **Save drafts**: GitHub saves your issue draft automatically, so you can fill it out over time
- **One-handed mode**: The form is designed to work well with one hand on a phone
- **No need to wait**: Submit and go - the automation handles the rest

## 🔐 Permissions

The GitHub Action requires:
- **Contents: write** - To commit CSV and photo changes
- **Issues: write** - To close the issue and add comments

These are already configured in the workflow file.

## 📊 Data Validation

The workflow validates:
- ✅ All required fields are present
- ✅ Date is in correct format
- ✅ Points, teams, and place are numbers
- ✅ Attendance has exactly 9 values (one per team member)

If validation fails, the workflow will error and the issue will stay open with error details in the Actions log.

## 🎉 Success Indicators

You'll know it worked when:
1. The issue gets automatically closed
2. A success comment appears on the issue
3. You see a new commit in the repository (within 1-2 minutes)
4. The website updates with your entry (within 5 minutes)

## ❓ Questions?

If you encounter any issues not covered here:
1. Check the **Actions** tab for workflow run details
2. Look at the workflow logs for specific error messages
3. Create a regular issue (not using the quiz entry template) describing the problem
