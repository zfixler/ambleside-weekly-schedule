# Ambleside Weekly Schedule

A single-page web application for generating weekly homeschool reading schedules based on the [Ambleside Online](https://www.amblesideonline.org/) curriculum.

## Features

- **Multiple Students**: Create tabs for each student with individual schedules
- **Curriculum Integration**: Load readings by Ambleside year and week number
- **Custom Readings**: Add, edit, or remove readings from the default list
- **Subject Tracking**: Track daily completion for subjects with a clickable grid
- **Notes**: Add weekly notes for each student
- **Print-Ready**: Formatted print layout with auto-sized text areas
- **Offline-First**: Works entirely offline once loaded; data persists in browser storage
- **Single File Distribution**: Build outputs a single HTML file that works from `file://`

## Quick Start

### Using the Built File

1. Download `dist/index.html`
2. Open it directly in your browser (no server needed)
3. Start creating schedules

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

1. **Enter Student Name**: Type the student's name in the first field (tab title updates automatically)
2. **Select Year & Week**: Enter the Ambleside year (1-12) and week number (1-36)
3. **Load Readings**: Click "Load Readings" to populate the schedule with curriculum readings
4. **Customize**:
   - Edit any reading text directly
   - Remove readings with the trash icon
   - Add custom readings with "Add Row"
5. **Track Subjects**: Click day buttons (M/T/W/Th/F) to mark completion
6. **Add Notes**: Use the notes section for weekly observations
7. **Print**: Click "Print Form" for a formatted printout

### Multiple Students

- Click the **+** button to add a new student tab
- Double-click a tab to rename it
- Click **×** on a tab to close it (data is deleted)

## Data Storage

The app automatically saves all data to your browser:

- **IndexedDB** (primary): Transaction support, ~50MB+ storage quota
- **localStorage** (fallback): Used if IndexedDB unavailable

Data automatically migrates from localStorage to IndexedDB on first load if legacy data exists.

## Project Structure

```
ambleside-week/
  src/
    script.js           # Main application entry point
    storage/            # Storage backends (localStorage, IndexedDB)
    ui/                 # UI components (tabs, readings, subjects, print)
    utils/              # Utilities (debounce, DOM helpers)
  assets/
    style.css           # Styles including print rules
    readingLibrary.json # Ambleside curriculum data
  index.html            # HTML entry point
  vite.config.js        # Vite build configuration
```

## Build Output

The production build creates a single `dist/index.html` file (~35KB gzipped) containing:
- All JavaScript (bundled and minified)
- All CSS (inlined)
- Works when opened directly from filesystem (`file://` protocol)

## Browser Support

Modern browsers with ES modules support:
- Chrome/Edge 80+
- Firefox 80+
- Safari 14+

## License

MIT
