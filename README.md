# Photos per quiz — how to add

You can attach photos to each quiz by adding a Photos column in your season CSV and placing the image files in your repo.

## 1) Put images in the repo
- Create a folder like `photos/2025-10-06/` and drop your images there.
- You can organize per date or all in one folder — it's up to you. Use web‑friendly sizes (under ~2–3 MB per file).
- Supported formats: jpg, jpeg, png, webp, gif (animated gifs will show but not autoplay controls).

## 2) Reference them from CSV
Add a new column to `data/season-YYYY.csv` named `Photos` (case‑insensitive). For each row you can use:
- Semicolon or pipe separated list: `photos/2025-10-06/img1.jpg; photos/2025-10-06/img2.jpg`
- JSON array: `["photos/2025-10-06/img1.jpg", "photos/2025-10-06/img2.jpg"]`
- A single path: `photos/2025-10-06/img1.jpg`
- Absolute URLs also work: `https://i.imgur.com/abc123.jpg`

Example:

```
Date,Notes,Points,Teams,Photos
2025-10-06,General Knowledge,4,18,photos/2025-10-06/1.jpg; photos/2025-10-06/2.jpg
```

Notes:
- The Photos column is optional. If missing or empty, the page works as before.
- Paths are interpreted relative to the site root. For GitHub Pages, make sure the files are committed under the repo.

## 3) View in the site
- Thumbnails render under each quiz in the "Quiz History" list.
- Click any thumbnail to open a lightbox. Use arrow keys or on‑screen arrows to navigate. Press Escape or click outside to close.

## Performance tips
- Resize images to around 1600px on the long edge for a good balance of quality/size.
- Prefer `webp` for smaller files if convenient.

