# Three.js Docset Generator

This project generates a Dash docset for Three.js documentation using jsdom for high-performance HTML processing.

## Commands

- `npm run dev` - Generate docset
- `npm start` - Generate docset and create tgz archive

## Prerequisites

- Node.js ≥16.0.0
- `three.js` submodule in project root (for source documentation and version detection)

## Architecture & Performance

**Processing Scale:**
- ~287 API docs + 61 manual pages = 2,892 total searchable entries

## Development Notes

### threejs.docset structure

Structure inside `threejs.docset` directory can be broken down to:

- `threejs.docset/Contents/Info.plist`: XML file with docset properties (dynamically versioned)
- `threejs.docset/Contents/Resources/docSet.dsidx`: SQLite database with search index
- `threejs.docset/Contents/Resources/Documents`: Static content directory

Refer to <https://kapeli.com/docsets> for latest detailed docset specification.

### Version Management

**Automatic Version Detection:**
- Uses `getThreeJSVersion()` function with `git describe --tags` from three.js submodule
- Expects r-format tags (e.g., r179)
- Template `Info.plist` uses `{{VERSION}}` placeholder (no hardcoded versions)
- Updates `CFBundleName` to `three.js r179` format automatically

### Script Injection System

**Offline.js Injection:**
The default page behavior attempts redirect to `index.html` and uses child frames, which breaks in Dash. This is prevented by injecting `injections/offline.js` before the controlling scripts:

- **Docs pages**: `<script src="offline.js"></script><script src="page.js"></script>`
- **Manual pages**: `<script src="../offline.js"></script><script src="../resources/lesson.js"></script>`

**Implementation via `copyWithTransformation()` function:**
- Processes HTML files during copy operations
- Uses different relative paths for docs vs manual directories
- Maintains all other files as-is

### Hash Generation & Navigation

**Member Link Processing:**
- Follows Three.js page.js regex pattern: `/\[(?:property|method):(?:[\w]+\s+)?([\w\.]+)\]/`
- Extracts proper member names for hash navigation (e.g., `Object3D.position` → `#position`)
- Enables direct navigation to properties and methods in Dash

### Three.js documentation structure

Three.js documentation consists of two main parts:

**Source Directories:**
- `three.js/docs` → `threejs.docset/Contents/Resources/Documents/docs`
- `three.js/manual` → `threejs.docset/Contents/Resources/Documents/manual`

**Control Files:**
- Each part has page index in `list.json` (e.g., `docs/list.json`)
- `docs` behavior controlled by `docs/page.js`
- `manual` behavior controlled by `manual/resources/lesson.js`

### Key Implementation Functions

**Core Functions:**
- `getThreeJSVersion()`: Git tag-based version detection
- `copyWithTransformation()`: Reusable HTML processing with script injection
- `getData()`: jsdom-based content extraction and member processing
- `writeSQLite()`: Search index database generation

**Dependencies:**
- `jsdom`: HTML parsing and DOM manipulation
- `sqlite3`: Search index database
- `fs-extra`: Enhanced file operations
- `glob`: File pattern matching
- `connect` + `serve-static`: Local development server

### Upload Generated Docset to Kapeli/Dash-User-Contributions

Refer to: https://github.com/Kapeli/Dash-User-Contributions


