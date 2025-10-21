# The Big Quiz Website

This repository hosts the Gorsko Slivovo team's quiz results website on GitHub Pages.

---

# 🚀 Quick Way to Add Quiz Entries (Mobile-Friendly!)

**NEW!** You can now add quiz entries directly from your phone using GitHub Issues:

## How to Add a Quiz Entry

1. **Go to the Issues tab** on GitHub (works great on mobile!)
2. **Click "New Issue"**
3. **Select "Add Quiz Entry"** template
4. **Fill out the form:**
   - Quiz date (DD.MM.YYYY format, e.g., 20.10.2025)
   - Notes about the quiz
   - Points scored (2-5)
   - Total number of teams
   - Our place/position
   - Check attendance for each team member
   - **Upload photos** by dragging/dropping or pasting them into the Photos field
5. **Submit the issue**

That's it! A GitHub Action will automatically:
- ✅ Create a `photos/YYYY-MM-DD/` folder with your photos
- ✅ Add a new row to `data/season-2025.csv`
- ✅ Add a new row to `data/presence.csv`
- ✅ Close the issue when done

The website will update within a few minutes!

### Direct Link
[**📝 Add Quiz Entry**](../../issues/new?template=add-quiz.yml) ← Click here to add a new quiz!

### Additional Resources
- [⚡ Quick Reference](.github/QUICK_REFERENCE.md) - Fast lookup for fields and tips
- [📖 Complete Guide](.github/QUIZ_ENTRY_GUIDE.md) - Detailed instructions and troubleshooting
- [📋 Workflow Example](.github/WORKFLOW_EXAMPLE.md) - See exactly what happens step-by-step
- [📊 Implementation Details](.github/IMPLEMENTATION_SUMMARY.md) - Technical documentation

---

# Quick Access to Important Files

The dashboard includes a "Quick Access to Important Files" section that displays helpful links and resources.

## Customizing Quick Access Items

To customize the items shown in the Quick Access section, edit the `renderQuickAccess()` function in `index.html` (around line 820).

The `quickAccessItems` array accepts objects with these properties:
- `type`: Either `'link'` or `'photo'`
- `name`: Display name for the item
- `url`: Target URL (external link or path to file)
- `icon`: (optional) Emoji icon for links (default: 🔗)
- `thumbnail`: (optional) Thumbnail image path for photos

### Example:

```javascript
const quickAccessItems = [
  { type: 'link', name: 'The Big Quiz @ The Academy', url: 'https://www.facebook.com/TheBigQuizUK', icon: '🔗' },
  { type: 'link', name: 'Quiz Rules & Format', url: 'https://www.thebigquiz.co.uk/', icon: '📋' },
  { type: 'photo', name: 'Team Photo Album', url: 'photos/2025-10-20/IMG_2821.jpeg', thumbnail: 'photos/2025-10-20/IMG_2821.jpeg' }
];
```

**Notes:**
- All items are directly clickable (no separate "Open" button)
- External links open in a new tab with `target="_blank" rel="noopener noreferrer"`
- Photos can be relative paths or absolute URLs
- The section is automatically responsive and compact

---

# Photos per quiz — how to add

You can attach photos to each quiz by adding a Photos column in your season CSV and placing the image files in your repo.

## 1) Put images in the repo
- Create a folder like `photos/2025-10-06/` and drop your images there.
- You can organize per date or all in one folder — it's up to you. Use web‑friendly sizes (under ~2–3 MB per file).

## 2) Reference them from CSV
Add a new column to `data/season-YYYY.csv` named `Photos` (case‑insensitive). For each row you can use: Semicolon or pipe separated list: `photos/2025-10-06/img1.jpg; photos/2025-10-06/img2.jpg`

Example:

```
Date,Notes,Points,Teams,Photos
2025-10-06,General Knowledge,4,18,photos/2025-10-06/1.jpg; photos/2025-10-06/2.jpg
```

Note: Paths are interpreted relative to the site root. For GitHub Pages, make sure the files are committed under the repo.

## 3) View in the site
- Thumbnails render under each quiz in the "Quiz History" list.
- Click any thumbnail to open a lightbox. Use arrow keys or on‑screen arrows to navigate. Press Escape or click outside to close.

