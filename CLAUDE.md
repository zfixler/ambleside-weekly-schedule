# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ambleside Weekly Schedule is a single-page web application for generating weekly homeschool reading schedules based on the Ambleside Online curriculum. Users can create multiple student tabs, load readings by year/week, track subjects with daily completion, and print formatted schedules.

## Build Commands

- `npm run dev` - Start Vite development server with hot reload
- `npm run build` - Build production bundle to `dist/` (outputs a single self-contained HTML file)
- `npm run preview` - Preview production build locally

## Architecture

The application is a vanilla JavaScript SPA with no framework, organized into modules:

```
src/
  script.js              # Main entry point and application logic
  storage/
    interface.js         # StorageBackend base class (contract)
    localStorage.js      # LocalStorageBackend implementation
    indexedDB.js         # IndexedDBBackend implementation
    migration.js         # localStorage → IndexedDB migration
    index.js             # Barrel exports
  ui/
    print.js             # Print preparation and handlers
    readings.js          # Readings table rendering
    subjects.js          # Subjects table rendering
    tabs.js              # Tab creation, switching, structure
    index.js             # Barrel exports
  utils/
    debounce.js          # Debounce utility and DebounceManager
    dom.js               # DOM helpers (autoSize, slugify, etc.)
    index.js             # Barrel exports
assets/
  style.css              # Styling including print-specific rules
  readingLibrary.json    # Curriculum data (year_N.week_N format)
index.html               # Entry point with initial tab structure
```

### Key Patterns

**Tab System**: Each student gets a tab with a unique `storageKey` derived from the tab title. Tab state persists with keys like `ambleside_tab_v1:{storageKey}`. A master list at `ambleside_tabs_v1` tracks all tabs.

**Storage Abstraction**: The app uses a `StorageBackend` interface with two implementations:
- `LocalStorageBackend` - Original localStorage-based storage (backward compatible)
- `IndexedDBBackend` - New IndexedDB-based storage with transaction support and larger quota

On first load, the app checks for legacy localStorage data and automatically migrates to IndexedDB if available.

**Readings Population**: `populateReadings(year, week, tabId)` builds the readings table dynamically. It merges default readings from the JSON library with custom readings, while respecting removed indices.

**Auto-persistence**: Form inputs use `DebounceManager` for 300ms debounced saves. The `persistTab()` function captures all state including readings edits, subject completion marks, and notes.

**Print Flow**: Print button triggers `autoSizeTextareasInTab()` to resize textareas based on content before calling `window.print()`. CSS has dedicated `@media print` rules.

### Build Configuration

Vite with `vite-plugin-singlefile` inlines all assets into a single HTML file for easy distribution. The built file works when opened directly from the filesystem (no server required).

### Storage Keys

- `ambleside_tabs_v1` - JSON array of `{title, storageKey}` for all tabs
- `ambleside_tab_v1:{storageKey}` - Full tab data (year, week, subjects, notes, etc.)
- `ambleside_migrated_to_idb` - Flag indicating IndexedDB migration complete

### IndexedDB Structure

Database: `ambleside_weekly` (version 1)
- `students` store: `{id, name, storageKey, displayOrder, createdAt}`
- `schedules` store: `{storageKey, year, week, notes, subjects, removedIndices, customReadings, updatedAt}`
