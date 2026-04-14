# DWG Display & Comparison — Engineering Tooling Plan

> Prepared for the COBA project · April 2026  
> Stack: React 19 + Vite (frontend) · Node.js / Hono + tRPC (backend) · better-sqlite3

---

## 1. DWG Display Options

### 1.1 Autodesk APS (formerly Forge) Viewer

**What it is**  
APS is Autodesk's official cloud platform for working with design data. The Viewer SDK (`viewer3D.js`) is a JavaScript library that renders translated design files in the browser using WebGL. It does **not** read DWG directly — files must first be uploaded to Autodesk's Object Storage Service (OSS) and translated by the **Model Derivative API** (SVF2 format), which is a server-side cloud job.

**Cost / licensing**  
Autodesk introduced a new business model effective **December 8, 2025**. The Model Derivative API is now a "rated" API with a **Free tier monthly cap** — if you exceed it, usage is suspended until the next month (or you upgrade to a Paid tier). The Viewer SDK JavaScript library itself is free to use (no per-call charge). The paid tier pricing is consumption-based; exact current rates must be confirmed on [aps.autodesk.com/pricing](https://aps.autodesk.com/pricing). For a small engineering firm translating a modest number of DWGs per month, the free tier is expected to be sufficient, but this needs verification.

**React integration**  
The viewer JS is loaded from a CDN script tag (not an npm package), but community wrappers exist:
- `react-forge-viewer` — wraps the viewer in a React component (older, targets React 16+)
- `@contecht/react-adsk-forge-viewer` — TypeScript-ready wrapper
- `@lagarsoft/forge-viewer-react` — another lightweight wrapper

The APS Viewer can also be integrated manually without a wrapper: load the script, initialize `Autodesk.Viewing.Initializer`, and mount to a `<div>` ref from `useEffect`.

**Backend changes needed**  
- Register an APS application at [aps.autodesk.com](https://aps.autodesk.com) to get `CLIENT_ID` and `CLIENT_SECRET`.
- Store credentials in `backend/.env` alongside the existing `ANTHROPIC_API_KEY`.
- Add new Hono endpoints (or tRPC procedures) for:
  - `POST /api/aps/upload` — receive a DWG file, forward to APS OSS bucket.
  - `POST /api/aps/translate` — trigger Model Derivative translation job.
  - `GET /api/aps/status/:urn` — poll translation job status.
  - `GET /api/aps/token` — return a short-lived access token for the frontend viewer (2-legged OAuth).

**Pros**
- Official Autodesk solution — best DWG fidelity (the same rendering engine as AutoCAD Web).
- Handles extremely complex DWG files including xrefs, blocks, line types, and embedded fonts.
- Built-in support for DWG, DXF, Revit, IFC, and 50+ other formats.
- Extensions for measurement, markup, section analysis, and comparison (see §2).
- Actively maintained with commercial SLA.

**Cons**
- Files must be uploaded to Autodesk cloud — data leaves the server (potential sensitivity issue for engineering documents).
- Translation can take seconds to minutes for large files.
- Requires an Autodesk account and registered app.
- Free tier quota limits are not publicly documented with exact numbers; could be restrictive.
- The viewer JS library is not on npm — bundling is non-standard.

**Complexity: Medium**  
Most of the work is in the backend OAuth + upload pipeline. The React viewer component is straightforward once the access token flow is working.

---

### 1.2 Open Design Alliance (ODA) Web Viewer / inWEB SDK

**What it is**  
ODA is a consortium that reverse-engineers and documents the DWG format. Their **inWEB SDK** is a browser-based CAD/BIM viewer built on WebAssembly and WebGL. It reads DWG directly (no cloud translation needed) and supports rendering in the browser.

**Cost / licensing**  
ODA operates an annual membership / subscription model. There are six membership tiers:
- **Non-commercial** — free, not for production apps.
- **Commercial (limited)** — fixed annual fee, up to 100 copies.
- **Sustaining** — unlimited commercial use, includes web/SaaS usage rights.

Exact pricing is on [opendesign.com/pricing](https://www.opendesign.com/pricing). Based on typical ODA membership costs, the Sustaining tier required for a SaaS web app is likely **$3,000–$10,000+/year**. ODA does not publish prices publicly; a quote is required.

**React integration**  
ODA provides SDKs and sample applications but does not publish an npm package for the web viewer. Integration would involve loading their WASM module and connecting it to a canvas element via a `useEffect` hook. Community React wrappers do not exist; this would be custom integration work.

**Pros**
- No cloud dependency — files can be processed entirely on-premises.
- Accurate DWG rendering using ODA's own format knowledge.
- Supports a wide range of DWG versions.

**Cons**
- Expensive for a small company (requires sustaining membership for SaaS/web use).
- No npm package; custom WASM integration required.
- Limited community support and examples.
- Less actively documented for React compared to APS.

**Complexity: High** (licensing negotiation + custom WASM integration)

---

### 1.3 DXF Conversion Approach (Open Source Path)

**What it is**  
DWG is Autodesk's proprietary binary format; DXF is its open text-based sibling. The idea is to convert DWG → DXF server-side, then render the DXF in the browser using open-source JavaScript libraries.

**Conversion tools**

| Tool | Type | Notes |
|------|------|-------|
| **ODA File Converter** | Free CLI binary | Converts DWG ↔ DXF (and between DWG versions). Free for download from ODA. Not for redistribution in commercial products; must be run as a subprocess. |
| **LibreDWG** (`libredwg`) | Open source (GPLv3) | GNU C library that reads DWG and writes DXF/SVG. GPLv3 license — embedding in a non-GPL commercial product is problematic. Has a WASM port (`@mlightcad/libredwg-web`). |
| **`@mlightcad/libredwg-web`** | npm (WASM) | Browser-compatible DWG/DXF parser built on LibreDWG via WebAssembly. Can convert DWG → SVG client-side. |

**License note on LibreDWG**: The GPLv3 license means that if you use it server-side in a commercial product you must open-source the surrounding code, or obtain a commercial exception. This makes it unsuitable for most commercial backends without legal review.

**DXF rendering in the browser**

| Package | Stars | License | Notes |
|---------|-------|---------|-------|
| `dxf-viewer` | ~600 | MIT | WebGL-based 2D DXF renderer; performance-focused for large real-world files. Uses Three.js. |
| `three-dxf` | ~1,000 | MIT | Three.js-based DXF viewer; older but widely used. |
| `three-dxf-viewer` | ~200 | MIT | Adds layer toggling on top of Three.js. |
| `three-dxf-loader` | ~100 | MIT | URL-based loader for Three.js/react-three-fiber. |
| `dxf-parser` | ~700 | MIT | Parses DXF to JS object (no rendering — data only). |

**Recommended combo**: ODA File Converter (subprocess) on the backend to produce DXF, then `dxf-viewer` in the browser for WebGL rendering.

**Pros**
- Fully open-source rendering (MIT-licensed npm packages).
- No cloud dependency.
- No per-file cost.
- DXF is well-documented; entity-level data is accessible for comparison (§2).

**Cons**
- DXF conversion is lossy — some DWG features (OLE objects, certain entity types, complex linetypes, xrefs) may not survive the DXF round-trip.
- `dxf-viewer` and similar packages support 2D only; 3D DWG models are not supported.
- ODA File Converter subprocess adds infrastructure complexity and is not redistributable as part of an npm package — it must be installed separately on the server OS.
- LibreDWG's GPLv3 license is a legal risk for a commercial product.
- Open-source DXF renderers are community-maintained and may lag behind newer DXF features.

**Complexity: Medium** (subprocess management for conversion + React viewer component)

---

### 1.4 DWG → SVG Pipeline

**What it is**  
Convert DWG to SVG server-side, serve the SVG to the browser, and render with standard `<img>` or inline SVG + D3/pan-zoom.

**Tools**
- **LibreDWG** includes a `dwg2svg` CLI tool — it outputs a basic SVG.
- **`@mlightcad/libredwg-web`** (WASM, npm): can do DWG → SVG in the browser without a backend.
- **CloudConvert API** — paid cloud service that handles DWG → SVG (and many other formats). Well-documented REST API with a Node.js SDK.

**Pros**
- SVG is natively displayed in every browser.
- Infinitely zoomable (vector).
- Can be manipulated with CSS/JS for highlighting (useful for comparison).
- `@mlightcad/libredwg-web` enables fully client-side conversion — no backend needed.

**Cons**
- LibreDWG SVG output is rudimentary — missing fills, hatches, accurate font rendering, and many entity types.
- Large DWG files produce enormous SVG files that can crash browsers.
- Not suitable for complex real-world engineering drawings.
- GPLv3 concerns (same as §1.3).

**Complexity: Low** (for basic files) / **High** (for production-quality output)

---

### 1.5 DWG → PDF Conversion + PDF Viewer

**What it is**  
Convert DWG to PDF on the server; display the PDF in the browser with a PDF viewer component.

**Conversion tools**
- **ODA File Converter** — can output DWG to PDF (free utility, must be installed on server).
- **LibreCAD CLI** — limited PDF export capability; CLI batch mode is not reliably supported (multiple open GitHub issues confirm this is incomplete).
- **Aspose.CAD** (`aspose-cad` npm) — commercial library (~$799/developer license). High-fidelity DWG → PDF. Works in Node.js.
- **Apryse (formerly PDFTron) WebViewer** — includes CAD-to-PDF conversion; pricing starts ~$1,500. Supports DWG, DXF, Revit.
- **CloudConvert / ConvertAPI** — cloud APIs with pay-per-conversion pricing.

**Browser PDF display**
- `react-pdf` (MIT, wraps PDF.js)
- `@react-pdf-viewer/core` (MIT)
- Native browser PDF display via `<iframe src="...">` or `<embed>`

**Pros**
- PDF rendering is universally supported and very high fidelity.
- Simple to implement once conversion is working.
- Users are familiar with PDF viewers.
- Lossless from the viewing perspective (page-accurate rendering).

**Cons**
- PDF is a raster-ish format when viewed — not entity-aware. No layer control, no element selection.
- Comparison is limited to visual side-by-side (not entity-level diff).
- Requires either a paid library (Aspose, Apryse) or the ODA File Converter subprocess for reliable DWG → PDF.
- ODA File Converter is not an npm package.

**Complexity: Low–Medium** (mostly backend conversion setup)

---

### 1.6 Apryse WebViewer (Commercial All-in-One)

**What it is**  
Apryse's WebViewer is a client-side JavaScript SDK that views, annotates, and converts 30+ file formats including DWG, DXF, PDF, and Office formats. It renders CAD files natively in the browser using WASM/WebGL — no server-side conversion needed. Available as an npm package.

**Cost**  
Entry-level licensing starts at approximately **$1,500+** with modular add-ons. CAD support is a separate module. Not open source.

**React integration**  
Provides `@pdftron/webviewer` npm package with a React-friendly API. Initialization via a `useEffect` with a `<div>` ref.

**Pros**
- Commercial-grade, high-fidelity DWG rendering.
- All client-side (no cloud translation required).
- Active maintenance and commercial support.
- Includes annotation, measurement, and redaction tools out of the box.

**Cons**
- Significant licensing cost for a small company.
- WASM bundle is large (~50 MB+), impacting load time.
- Vendor lock-in.

**Complexity: Low** (integration is well-documented) / **Cost: High**

---

## 2. DWG Comparison Options

### 2.1 Visual Overlay / Toggle (APS PixelComparison Extension)

The APS Viewer includes a built-in **PixelComparison** extension that loads two translated DWG files (as separate Viewer models), then either:
- Shows a **split-screen** view with synchronized pan/zoom, or
- **Highlights differences** in red and blue pixel overlays.

Usage: after both models are loaded, call `pcExt.compareTwoModels(model1, model2)`. The extension is documented at [aps.autodesk.com/blog/pixelcompare-extension](https://aps.autodesk.com/blog/pixelcompare-extension).

This is the most production-ready comparison approach for the browser — but it requires both files to be translated through APS (Model Derivative API).

**Pros**: Built-in, no extra code. Works immediately if APS Viewer is already used.  
**Cons**: Both files need APS translation (API quota consumed per file). Pixel-level only — no semantic understanding of what changed.

---

### 2.2 Entity-Level Diff (DXF Parse + Structural Comparison)

Convert both DWG files to DXF, parse with `dxf-parser` or `dxf-viewer`, then compare the entity trees programmatically.

**Approach**:
1. Server converts DWG v1 and DWG v2 → DXF via ODA File Converter.
2. Backend parses both DXF files using `dxf-parser`.
3. Diff algorithm compares entities by type, position, and properties.
4. Frontend renders the result with added entities highlighted in green, removed in red, and modified in yellow.

**Entity types that can be compared**: LINE, ARC, CIRCLE, POLYLINE, TEXT, MTEXT, DIMENSION, INSERT (blocks), HATCH.

**Challenges**:
- Entity identity is unstable between DWG saves — Autodesk does not guarantee stable entity handles across all tools.
- Geometric tolerance handling (floating-point coordinates need epsilon comparison).
- Block insertions and xrefs complicate the entity tree.

**Pros**: Semantic diff — tells you *what* changed (e.g., "a wall line was moved 2m north").  
**Cons**: Complex to implement correctly; DXF fidelity issues carry over; entity identity is fragile.

**Complexity: High**

---

### 2.3 Raster Diff (Pixel-Level Image Comparison)

Convert both DWG files to PNG (via ODA File Converter or any DWG → image tool), then compare pixel-by-pixel using `pixelmatch` (MIT-licensed, ~150 LOC, no dependencies).

**Approach**:
1. Server converts DWG v1 and DWG v2 → PNG at a defined resolution (e.g., 2400 × 1800 px).
2. Backend runs `pixelmatch(img1, img2, output, width, height, { threshold: 0.1 })`.
3. Returns the diff image with changed pixels highlighted in red.
4. Frontend displays original, revised, and diff images side by side.

`pixelmatch` is used by industry tools (Percy, Chromatic visual testing) and handles anti-aliased edges well.

An alternative is `odiff` (also MIT, Rust-based WASM) for very large images.

**Pros**: Simple to implement; works regardless of DWG complexity; no entity parsing needed.  
**Cons**: Purely visual — cannot tell you *what* entity changed, only *where* pixels differ. Sensitive to scale/zoom differences between the two renders.

**Complexity: Low–Medium**

---

### 2.4 APS DiffTool Extension (3D / BIM Comparison)

For 3D models (Revit, IFC), the APS Viewer provides an **Autodesk.DiffTool** extension that compares object IDs between two model versions — highlighting added, removed, and modified elements with color coding. This is entity-aware and works at the BIM object level.

For 2D DWG files (2D sheets), this extension has limited applicability — it is primarily designed for 3D model versioning (BIM workflows). The PixelComparison extension (§2.1) is the correct choice for 2D DWG comparison.

---

### 2.5 Other Tools and Services

| Tool | Type | Notes |
|------|------|-------|
| GroupDocs Comparison (cloud API) | Paid SaaS | Supports DWG; REST API with a Node.js SDK. Pay-per-use. |
| ABViewer | Desktop app | Visual comparison, not embeddable. |
| CompareDWG (furix.com) | Web service | Upload-based, not embeddable. |
| AutoDWG DWGSee | Desktop / ActiveX | Not web-compatible. |

None of the standalone DWG comparison tools are embeddable in a React web app without significant custom work or a paid API integration.

---

## 3. Recommendation

> **Decision (April 2026):** Files must remain on own infrastructure. Autodesk APS is ruled out.

### Recommended Approach: ODA File Converter + dxf-viewer (Phase 1) + pixelmatch Diff (Phase 2)

Given the own-infrastructure requirement — no files leaving the server — the stack is:

| Layer | Tool | License | Notes |
|-------|------|---------|-------|
| DWG → DXF conversion | **ODA File Converter** (CLI binary) | Free (non-redistributable) | Install on server OS; spawn as subprocess |
| Browser rendering | **`dxf-viewer`** (npm) | MIT | WebGL-based, handles real-world DXF well |
| Raster comparison | **`pixelmatch`** (npm) | MIT | Pixel-level diff; returns highlighted PNG |
| Metadata + editing tools | **Python + ezdxf** | MIT | Reads DXF; quick-win mutation scripts |

**Why ODA File Converter**:
1. **Free** — available for download from opendesign.com at no cost.
2. **High DWG fidelity** — ODA has the best reverse-engineered DWG reader after Autodesk itself.
3. **Subprocess model** — Node.js spawns it as a child process; no npm package needed.
4. **Supports all versions** — R12 through AC1032 (2018+).

**Why dxf-viewer**:
1. **MIT license** — no legal risk.
2. **WebGL-based** — handles large DXF files without browser crashes.
3. **Layer toggling** — built-in support for showing/hiding DWG layers.
4. **Active maintenance** — regularly updated for real-world DXF compatibility.

**Why not LibreDWG**:
- GPLv3 license requires open-sourcing surrounding code if distributed commercially.
- SVG output quality is poor (missing hatches, fonts, many entity types).

**Setup requirement**: ODA File Converter must be downloaded and installed on the server.
- Download: https://www.opendesign.com/guestfiles/oda_file_converter
- Windows: installs to `C:\Program Files\ODA\ODAFileConverter\ODAFileConverter.exe`
- Linux/EC2: install `.deb` or `.rpm` package; binary at `/usr/bin/ODAFileConverter`

**Why not APS**:
- Files must go to Autodesk cloud for translation — ruled out by infrastructure requirement.

**Why not ODA inWEB / Apryse**:
- Both require $3,000–$10,000+/year licensing for production use.

**Phase 1**: ODA File Converter + dxf-viewer for DWG display.
**Phase 2**: pixelmatch raster diff for visual comparison.
**Phase 3**: ezdxf quick-win editing tools (layer rename, purge, unit conversion, etc.).

**Why APS Viewer was previously recommended**:

1. **Best DWG fidelity** — it uses Autodesk's own translation engine, which correctly handles xrefs, blocks, complex linetypes, embedded fonts, and other features that open-source DXF renderers routinely fail on.
2. **Free tier available** — for a small engineering company translating a moderate number of files, the free quota should be sufficient (exact limits to be confirmed with Autodesk).
3. **Built-in comparison** — the PixelComparison extension is ready to use once the viewer is integrated, requiring no additional library.
4. **React-friendly** — multiple npm wrappers exist; or easy manual integration via `useEffect`.
5. **Active ecosystem** — official tutorials, a large community, and GitHub sample repos.

**Why not the open-source DXF pipeline**:
- Open-source DXF renderers (`dxf-viewer`, `three-dxf`) routinely fail on complex real-world engineering drawings due to unsupported entity types and DXF conversion losiness.
- LibreDWG is GPLv3 — using it in a commercial backend requires legal review.
- The ODA File Converter is free but cannot be redistributed and must be manually installed on the server OS.

**Why not Apryse or ODA inWEB**:
- Both involve significant licensing costs ($1,500–$10,000+/year) that are disproportionate for a small engineering firm.

**Phase 1**: APS Viewer for DWG display.  
**Phase 2**: Add PixelComparison extension for visual diff. Optionally add raster diff (`pixelmatch`) as a lightweight fallback that runs entirely within the existing Node.js backend without depending on APS translation of both versions.

---

## 4. Implementation Outline

### 4.1 External Services and Packages

**Register / install**:
1. Create an APS application at [aps.autodesk.com](https://aps.autodesk.com) → obtain `APS_CLIENT_ID` and `APS_CLIENT_SECRET`.
2. Add to `backend/.env`:
   ```
   APS_CLIENT_ID=...
   APS_CLIENT_SECRET=...
   APS_BUCKET_KEY=coba-dwg-storage
   ```

**npm packages (backend)**:
```bash
npm install --prefix backend \
  @autodesk/autodesk-sdks-for-aps   # Official APS Node.js SDK (or use raw fetch)
npm install --prefix backend \
  multer                             # Multipart file upload middleware for Hono
npm install --prefix backend \
  pixelmatch pngjs                   # Raster diff (Phase 2)
npm install --prefix backend \
  sharp                              # Resize/normalize images before diff
```

> Note: The APS SDK (`@autodesk/autodesk-sdks-for-aps`) wraps the Model Derivative and OSS APIs. As an alternative, plain `fetch` against the APS REST API is sufficient.

**npm packages (frontend)**:
```bash
npm install --prefix frontend \
  @contecht/react-adsk-forge-viewer   # React wrapper for APS Viewer
# OR integrate viewer manually (no npm) by loading viewer3D.js from CDN
```

---

### 4.2 Backend Endpoints

Add a new `engineering` router at `backend/src/router/engineering.ts` and register it in `backend/src/index.ts`.

#### tRPC Procedures (new `engineering` router)

| Procedure | Type | Description |
|-----------|------|-------------|
| `engineering.uploadDwg` | mutation | Accepts a DWG file (base64 or multipart), uploads to APS OSS bucket, returns `objectId`. |
| `engineering.translateDwg` | mutation | Accepts `objectId`, submits Model Derivative translation job, returns `urn`. |
| `engineering.translationStatus` | query | Accepts `urn`, polls APS for job status (`pending`/`success`/`failed`). |
| `engineering.getViewerToken` | query | Issues a 2-legged APS access token scoped to `viewables:read`; returns it to the frontend (expires in 1 hour). |
| `engineering.compareDwg` | mutation | Phase 2: accepts two `urn`s, renders both to PNG via APS thumbnail endpoint, runs `pixelmatch`, returns diff image as base64 PNG. |

#### Hono file upload endpoint (outside tRPC)

tRPC does not handle binary file uploads well. Add a raw Hono route:

```
POST /api/engineering/upload   — multipart/form-data DWG file upload
```

This endpoint uses `multer` (or Hono's built-in body parser for blobs) to receive the file and then forwards it to APS OSS.

#### APS helper library

Create `backend/src/lib/aps.ts` following the pattern established by `parseCv.ts` and `generateCv.ts`:

```typescript
// backend/src/lib/aps.ts
// Wraps APS OAuth, OSS upload, and Model Derivative API calls
export async function getAccessToken(): Promise<string>
export async function uploadToOSS(fileBuffer: Buffer, fileName: string): Promise<string> // returns objectId
export async function startTranslation(objectId: string): Promise<string> // returns urn
export async function getTranslationStatus(urn: string): Promise<'pending' | 'success' | 'failed'>
```

---

### 4.3 Frontend Component Structure

#### New route

Add `/engineering` to the client-side router in `frontend/src/App.tsx`:

```typescript
// In the Page union type:
| { page: 'engineering' }
| { page: 'engineering-viewer'; fileUrn: string }

// In pageToPath():
'engineering' → '/engineering'
'engineering-viewer' → '/engineering/viewer'

// In pathToPage():
'/engineering' → { page: 'engineering' }
```

#### New view: `frontend/src/views/EngineeringTools.tsx`

This is the main landing page for the Engineering Tooling section. It contains:

```
EngineeringTools
├── DwgUploadPanel        — drag-and-drop upload; calls uploadDwg + translateDwg mutations
├── DwgFileList           — lists uploaded/translated DWGs (stored in local React state or SQLite)
└── [navigate to DwgViewer on file select]
```

#### New view: `frontend/src/views/DwgViewer.tsx`

Dedicated full-page viewer. Loads once a `urn` is known.

```
DwgViewer
├── ViewerToolbar         — zoom in/out, fit-to-page, layer toggle, measure mode
├── ApsViewerCanvas       — wraps the APS Viewer SDK (via useEffect mounting)
│   └── PixelCompareOverlay  — (Phase 2) loads second model + calls compareTwoModels()
└── DwgMetadataPanel      — shows file name, upload date, translation status
```

#### New component: `frontend/src/components/ApsViewerCanvas.tsx`

```typescript
// Loads viewer3D.js from CDN, initializes viewer, handles resize
interface Props {
  urn: string;           // base64-encoded URN of translated model
  accessToken: string;   // 2-legged token from getViewerToken
  compareUrn?: string;   // optional: second model for PixelComparison
}
```

#### Nav link

Add "Engineering" to the nav in `frontend/src/components/Layout.tsx`, alongside the existing links. Add an i18n key pair (`engineering` / `engenharia`) in `frontend/src/i18n/`.

#### Translation state persistence

Translated DWG `urn`s and metadata (file name, project association) should be stored in a new SQLite table so they survive a browser refresh (the server memory is reset on restart as per project design, but this is a practical concern for development):

```sql
-- Add to backend/src/db.ts
CREATE TABLE IF NOT EXISTS dwg_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER REFERENCES projects(id),
  file_name   TEXT NOT NULL,
  aps_urn     TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | success | failed
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### 4.4 Where It Fits in the App

The Engineering Tooling section is a **new top-level section** in the app, separate from the existing project-centric views. It can optionally be linked from the `ProjectDetail` view (to attach DWGs to a specific project) via the `project_id` column in `dwg_files`.

Navigation path: **Home → Engineering** (top-level nav) or **Project Detail → Engineering Files** (contextual link).

---

### 4.5 Effort Estimate

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 1a**: APS backend setup (OAuth, OSS upload, Model Derivative) | Medium | ~2–3 days |
| **Phase 1b**: React APS Viewer integration (`DwgViewer` component + token flow) | Medium | ~1–2 days |
| **Phase 1c**: Upload UI + file list (`EngineeringTools` view) | Small | ~1 day |
| **Phase 1d**: DB table, tRPC router wiring, nav/i18n | Small | ~0.5 day |
| **Phase 2a**: PixelComparison extension (APS-based visual diff) | Small | ~0.5 day |
| **Phase 2b**: Raster diff fallback (`pixelmatch` pipeline) | Medium | ~1–2 days |
| **Phase 3** (optional): Entity-level DXF diff | Large | ~1–2 weeks |

**Total for Phase 1 (viewer only)**: ~4–6 days of focused work.  
**Total for Phase 1 + 2 (viewer + comparison)**: ~6–9 days.

---

## 5. Open Questions

The following decisions require input before implementation can begin:

1. **APS free tier quota**: What is the actual monthly translation limit for the APS Free tier as of late 2025? Visit [aps.autodesk.com/pricing](https://aps.autodesk.com/pricing) to confirm. If the free quota is too low (e.g., fewer than 20–30 file translations/month), a paid plan must be budgeted.

2. **Willingness to create an Autodesk account**: APS requires registering an application with Autodesk and agreeing to their terms of service. Is the company comfortable using Autodesk's cloud infrastructure for file storage and translation?

3. **Data sensitivity**: DWG files contain proprietary engineering data. APS translates files by uploading them to Autodesk's OSS cloud buckets. Is this acceptable, or must files remain on-premises? If on-premises is required, the open-source DXF path (§1.3) or Apryse/ODA (§1.2, §1.6) must be evaluated despite their trade-offs.

4. **Budget for commercial options**: If Autodesk APS free tier is insufficient, the next options are:
   - Apryse WebViewer: ~$1,500+ one-time or subscription.
   - ODA Sustaining membership: ~$3,000–$10,000+/year.
   - Aspose.CAD: ~$799/developer.
   
   Is there a budget ceiling for DWG tooling?

5. **2D vs. 3D DWG files**: Are the DWG files used in this project primarily 2D (floor plans, sections, elevation drawings) or 3D models? This affects the choice significantly — 2D-only DWG files are well-handled by the DXF open-source path, while 3D models require APS or Apryse.

6. **Comparison granularity**: Is visual/pixel-level comparison (which areas changed?) sufficient, or is entity-level diff (which specific lines/dimensions/text changed?) a requirement? Entity-level diff is significantly more complex to implement.

7. **File storage**: Where should translated DWG files be stored long-term? APS OSS buckets have their own retention policies. Should the app also store the original DWG binary in the SQLite DB (as `member_cvs` does for CVs) or on disk?

8. **Project linkage**: Should DWG files be associated with specific projects in the DB (via `project_id`), or managed as a standalone library?

---

## Appendix: Quick Comparison Matrix

| Approach | DWG Fidelity | Cost | Cloud Dependency | Comparison Support | Complexity |
|----------|-------------|------|-------------------|-------------------|------------|
| APS Viewer (Recommended) | ★★★★★ | Free tier + paid overage | Yes (Autodesk) | ★★★★ (PixelCompare built-in) | Medium |
| ODA inWEB | ★★★★★ | $3,000–$10,000+/yr | No | Unknown | High |
| DXF pipeline (open source) | ★★★ | Free | No | ★★ (entity diff, complex) | Medium |
| DWG → SVG (LibreDWG) | ★★ | Free (GPLv3 risk) | No | ★ (SVG overlay) | Low–High |
| DWG → PDF | ★★★★ | Free (ODA CLI) or $799+ | Optional | ★ (visual only) | Low–Medium |
| Apryse WebViewer | ★★★★★ | $1,500+/yr | No | ★★ (annotation only) | Low |
| Aspose.CAD | ★★★★ | $799/developer | Optional | ✗ | Medium |

---

*Sources consulted during research (April 2026):*
- [APS Business Model Evolution](https://aps.autodesk.com/blog/aps-business-model-evolution)
- [APS Pricing](https://aps.autodesk.com/pricing)
- [APS PixelCompare Extension](https://aps.autodesk.com/blog/pixelcompare-extension)
- [APS Compare 2D Documents](https://aps.autodesk.com/blog/compare-two-2d-documents-using-aps-viewer)
- [APS DiffTool Extension](https://aps.autodesk.com/blog/difference-3d-models-autodeskdifftool-extension)
- [react-forge-viewer on npm](https://www.npmjs.com/package/react-forge-viewer)
- [dxf-viewer on npm](https://www.npmjs.com/package/dxf-viewer)
- [three-dxf on npm](https://www.npmjs.com/package/three-dxf)
- [dxf-parser on npm](https://www.npmjs.com/package/dxf-parser)
- [LibreDWG official site](https://www.gnu.org/software/libredwg/)
- [@mlightcad/libredwg-web on npm](https://www.npmjs.com/package/@mlightcad/libredwg-web)
- [ODA Pricing](https://www.opendesign.com/pricing)
- [ODA File Converter](https://www.opendesign.com/guestfiles/oda_file_converter)
- [Apryse WebViewer CAD](https://apryse.com/capabilities/formats/bim-3d)
- [Aspose.CAD JavaScript](https://purchase.aspose.com/pricing/cad/javascript-net/)
- [pixelmatch on npm](https://www.npmjs.com/package/pixelmatch)
- [GitHub: wallabyway/2DCompare](https://github.com/wallabyway/2DCompare)

---

## 6. DWG Editing Tools & Quick Wins

> Research appendix — April 2026  
> Focus: upload validation, metadata extraction, 10–15 quick-win editing tools, backend architecture, and open decisions.

---

### 6.A Upload & Validation Pipeline

#### 6.A.1 Magic-Byte Detection (Is It Really a DWG?)

Every DWG file begins with a 6-byte ASCII version string. Reading these bytes on the backend before any processing is the reliable way to confirm the file is actually a DWG — not a renamed PDF or ZIP archive.

| First 6 bytes (ASCII) | DWG AutoCAD version |
|----------------------|---------------------|
| `AC1009` | R11 / R12 (LT R1/R2) |
| `AC1012` | R13 (LT 95) |
| `AC1014` | R14 / 14.01 (LT 97/98) |
| `AC1015` | 2000 / 2000i / 2002 |
| `AC1018` | 2004 / 2005 / 2006 |
| `AC1021` | 2007 / 2008 / 2009 |
| `AC1024` | 2010 / 2011 / 2012 |
| `AC1027` | 2013 / 2014 / 2015 / 2016 / 2017 |
| `AC1032` | 2018 / 2019 / 2020 / 2021 / 2022 / 2023 |

**Implementation in Node.js (Hono upload handler):**

```typescript
// Read first 6 bytes of uploaded buffer
const header = buffer.slice(0, 6).toString('ascii');
if (!header.startsWith('AC')) {
  throw new Error('Not a valid DWG file');
}
const versionMap: Record<string, string> = {
  AC1009: 'R12', AC1015: '2000', AC1018: '2004',
  AC1021: '2007', AC1024: '2010', AC1027: '2013', AC1032: '2018+',
};
const dwgVersion = versionMap[header] ?? 'Unknown';
```

The `file-type` npm package (v21+, ESM) does not currently recognise DWG as a known type because DWG is not in its default signature database — manual byte-checking as above is required. The `magic-bytes` npm package is another option and supports a broader set of binary signatures, but DWG may also need to be added manually there.

**Recommended validation sequence on every upload:**

1. Check file extension is `.dwg` (client-side fast check).
2. Read first 6 bytes on the backend; reject if not `AC1xxx`.
3. Reject files larger than a configurable limit (e.g. 100 MB).
4. Optionally: pass the file through the ODA File Converter or ezdxf `odafc.readfile()` in a try/catch to confirm it can be opened — this catches truncated or corrupted files.

---

#### 6.A.2 DWG Version and Capability Matrix

Version detection matters for tool availability:

| DWG Version | ODA Converter | ezdxf (via DXF) | APS Viewer | Notes |
|-------------|:-------------:|:---------------:|:----------:|-------|
| R12 (AC1009) | Yes | Read-only | Yes | Old; attributes limited |
| R14 (AC1014) | Yes | Yes | Yes | Common legacy files |
| 2000 (AC1015) | Yes | Yes | Yes | Most common interchange format |
| 2004–2013 | Yes | Yes | Yes | Full feature set |
| 2018+ (AC1032) | Yes | Yes | Yes | Current default; most entities |

Files saved in AC1009 (R12) format lack many modern entities (MTEXT, LWPOLYLINE, HATCH) and title blocks may use older `TEXT` entities instead of `ATTRIB`-based blocks. Tool support should degrade gracefully for older versions.

---

#### 6.A.3 Fast Metadata Extraction (Header-Only, No Full Parse)

The DXF HEADER section (and by extension the DWG header after ODA conversion) contains immediately accessible metadata without loading the entire entity database:

- `$DWGCODEPAGE` — text encoding
- `$MEASUREMENT` — drawing units (0 = Imperial/inches, 1 = Metric/mm)
- `$INSUNITS` — insertion units (1 = inches, 4 = mm, 6 = metres, etc.)
- `$LASTSAVEDBY` — last saved by (user name string, R2004+)
- `$TDCREATE` — creation date/time (Julian date)
- `$TDUCREATE` — UTC creation date/time
- `$TDUPDATE` — last update date/time
- `$LIMMIN` / `$LIMMAX` — drawing limits (bounding box of defined drawing area)
- `$EXTMIN` / `$EXTMAX` — actual extents (bounding box of all entities)

Using ezdxf's `dxf_info()` function these variables can be read without loading the full document — making it suitable for fast summary display on upload.

---

### 6.B Drawing Summary / Metadata Extraction

After converting DWG → DXF (via ODA File Converter or APS), a Python/ezdxf worker can extract the following summary data and return it as JSON to the Node.js backend:

#### 6.B.1 Header Metadata

From `doc.header`:
- Drawing units and scale (`$INSUNITS`, `$MEASUREMENT`)
- Creation and last-modified timestamps (`$TDCREATE`, `$TDUPDATE`)
- Last saved by (`$LASTSAVEDBY`)
- Actual drawing extents in world coordinates (`$EXTMIN`, `$EXTMAX`)

#### 6.B.2 Layer List

```python
layers = [
  {
    "name": layer.dxf.name,
    "color": layer.dxf.color,
    "linetype": layer.dxf.linetype,
    "is_off": layer.is_off(),
    "is_frozen": layer.is_frozen(),
    "is_locked": layer.is_locked(),
  }
  for layer in doc.layers
]
```

This gives a complete layer table including colour indices, linetypes, and visibility state — the exact data users see in AutoCAD's Layer Manager.

#### 6.B.3 Entity Count by Type

```python
from collections import Counter
msp = doc.modelspace()
counts = Counter(e.dxftype() for e in msp)
# e.g. {"LINE": 1423, "ARC": 87, "TEXT": 34, "MTEXT": 12, ...}
```

Common entity types in civil/geotech drawings: LINE, ARC, CIRCLE, LWPOLYLINE, HATCH, TEXT, MTEXT, DIMENSION, INSERT (block references), LEADER, SPLINE.

#### 6.B.4 Title Block Attribute Extraction

AutoCAD title blocks are almost always implemented as `INSERT` entities (block references) containing `ATTRIB` child entities. Each `ATTRIB` has a `tag` (the field name, e.g. `DRWNO`, `DATE`, `SCALE`, `PROJ_NAME`, `DRAWN_BY`) and a `text` value.

```python
for insert in msp.query("INSERT"):
    if insert.dxf.name.upper() in KNOWN_TITLE_BLOCK_NAMES:
        for attrib in insert.attribs:
            yield {"tag": attrib.dxf.tag, "value": attrib.dxf.text}
```

`KNOWN_TITLE_BLOCK_NAMES` is a configurable list (`TITLEBLK`, `TB`, `TITLE_BLOCK`, etc.). Since every firm uses different block names, allowing user configuration of the title block name is recommended.

#### 6.B.5 Block / Symbol Library

```python
blocks = [b.name for b in doc.blocks if not b.name.startswith("*")]
# Filter out model space (*Model_Space) and paper space (*Paper_Space*)
```

#### 6.B.6 Layout (Paper Space) List

```python
layouts = [{"name": l.name, "is_modelspace": l.is_modelspace} for l in doc.layouts]
```

#### 6.B.7 XREF List

```python
xrefs = [
    b.name for b in doc.blocks
    if b.is_xref
]
```

XREF blocks have the `is_xref` flag set. The `b.xref_path` attribute contains the original file path. This list is critical for knowing if a DWG depends on other files.

---

### 6.C Quick Win Tools — Feasibility & Implementation

The following 14 tools are ordered roughly from easiest to hardest. All "DXF-path" tools share the same pipeline: DWG → DXF (ODA) → edit (ezdxf) → DXF → DWG (ODA, if write-back needed) → return file.

---

#### Tool 1: Convert to DXF

**User description:** Export the drawing as an open DXF file compatible with any CAD application.

**How it works:** The ODA File Converter CLI converts DWG → DXF directly. No Python/ezdxf is needed — just a subprocess call. Output is returned as a downloadable `.dxf` file.

```bash
ODAFileConverter /input_dir /output_dir ACAD2018 DXF 0 1
```

**Difficulty: Easy**  
**Write-back needed: No** (output is DXF, not DWG)  
**Tool: ODA File Converter**

---

#### Tool 2: Export Layer List as CSV

**User description:** Download a spreadsheet of all layers with their colour, linetype, and on/off/frozen/locked state.

**How it works:** After ODA converts DWG → DXF, a small Python/ezdxf script reads `doc.layers` and writes a CSV. The CSV is returned to the browser as a download.

```python
import csv, ezdxf
doc = ezdxf.readfile("input.dxf")
with open("layers.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["Name","Color","Linetype","Off","Frozen","Locked"])
    for l in doc.layers:
        w.writerow([l.dxf.name, l.dxf.color, l.dxf.linetype,
                    l.is_off(), l.is_frozen(), l.is_locked()])
```

**Difficulty: Easy**  
**Write-back needed: No**  
**Tool: ODA File Converter + ezdxf**

---

#### Tool 3: Extract Text Content

**User description:** Dump all text and annotation from the drawing to a plain-text or spreadsheet file. Useful for specification checking or searching note content.

**How it works:** ezdxf queries all `TEXT`, `MTEXT`, and `ATTRIB` entities from modelspace and all paper space layouts, extracts their string content, and returns a JSON array (entity type, layer, content, position).

```python
results = []
for entity in doc.modelspace().query("TEXT MTEXT ATTRIB"):
    text = entity.dxf.text if hasattr(entity.dxf, "text") else entity.plain_mtext()
    results.append({"type": entity.dxftype(), "layer": entity.dxf.layer, "text": text})
```

MTEXT content includes embedded formatting codes; `entity.plain_mtext()` strips them to give readable text.

**Difficulty: Easy**  
**Write-back needed: No**  
**Tool: ODA File Converter + ezdxf**

---

#### Tool 4: Convert to PNG / Thumbnail

**User description:** Render the drawing as a PNG image for preview, printing, or web display.

**How it works (two options):**

*Option A — ezdxf drawing add-on (DXF path, no ODA for output):*  
ezdxf v1.1+ includes a `drawing` add-on with a `PyMuPdfBackend` that renders DXF to PNG. Requires the `pymupdf` Python package. Quality is acceptable for 2D drawings but not production-grade for complex hatches or custom linetypes.

```python
from ezdxf.addons.drawing import RenderContext, Frontend
from ezdxf.addons.drawing.pymupdf import PyMuPdfBackend
backend = PyMuPdfBackend()
Frontend(RenderContext(doc), backend).draw_layout(doc.modelspace())
backend.get_pixmap_bytes("png", resolution=150)
```

*Option B — APS Model Derivative thumbnail endpoint:*  
If APS is already used for viewing, the Model Derivative API generates thumbnails (100×100, 200×200, 400×400 px) automatically after translation. No additional code needed.

**Difficulty: Easy** (APS thumbnail) / **Medium** (ezdxf rendering for complex drawings)  
**Write-back needed: No**  
**Tool: APS (easiest) or ezdxf + PyMuPDF**

---

#### Tool 5: Convert to PDF

**User description:** Export the drawing as a PDF for sharing, archiving, or plotting.

**How it works (three options):**

*Option A — APS Design Automation API:* Submit a job that runs a headless AutoCAD engine in Autodesk's cloud with an AutoLISP script calling `(command "_.PLOT" ...)`. Highest fidelity (same rendering as AutoCAD). Billed per job (Flex tokens).

*Option B — ezdxf drawing add-on:* Same pipeline as Tool 4 but targeting `PyMuPdfBackend` with PDF output. Simpler, free, but quality is limited for hatches and complex entities.

*Option C — ODA File Converter:* The ODA File Converter supports PDF output on some platforms (check the installed version's output type options). This is free but fidelity varies.

**Difficulty: Medium** (APS DA or ezdxf); **Hard** to achieve AutoCAD-quality output without APS  
**Write-back needed: No**  
**Tool: APS Design Automation (best), or ezdxf + PyMuPDF (free)**

---

#### Tool 6: Find & Replace Text

**User description:** Search for a text string across the entire drawing and replace it with a new string. Works across TEXT, MTEXT, and block attribute (ATTRIB) entities.

**How it works:** ezdxf queries all text-bearing entities and does a Python `str.replace()` on the content. The modified DXF is then reconverted to DWG via ODA if a DWG output is required.

```python
old, new = "REV A", "REV B"
for e in doc.modelspace().query("TEXT ATTRIB"):
    if old in e.dxf.text:
        e.dxf.text = e.dxf.text.replace(old, new)
for e in doc.modelspace().query("MTEXT"):
    if old in e.text:
        e.text = e.text.replace(old, new)
doc.saveas("output.dxf")
```

**Difficulty: Easy–Medium** (the replace itself is easy; writing back to DWG adds a step)  
**Write-back needed: Yes** (if DWG output expected)  
**Tool: ODA File Converter + ezdxf**

---

#### Tool 7: Update Title Block Date & Drawing Number

**User description:** Update specific fields in the title block (date, drawing number, revision) without opening AutoCAD.

**How it works:** Identifies the title block `INSERT` entity by block name, then updates specific `ATTRIB` entities by their `tag` value.

```python
for insert in doc.modelspace().query("INSERT"):
    if insert.dxf.name.upper() in TITLE_BLOCK_NAMES:
        for attrib in insert.attribs:
            if attrib.dxf.tag == "DATE":
                attrib.dxf.text = "2026-04-13"
            elif attrib.dxf.tag == "DRWNO":
                attrib.dxf.text = "COBA-GEO-001-Rev3"
doc.saveas("output.dxf")
```

The main challenge is knowing the correct `tag` values — these vary per company template. The Drawing Summary tool (§6.B.4) can be used first to discover the available tags.

**Difficulty: Medium** (depends on title block standardisation)  
**Write-back needed: Yes**  
**Tool: ODA File Converter + ezdxf**

---

#### Tool 8: Freeze / Thaw Layers by Pattern

**User description:** Toggle the visibility of layers whose names match a pattern (e.g. freeze all layers starting with `SURVEY-`). Returns a modified DWG or DXF.

**How it works:**

```python
import fnmatch
pattern = "SURVEY-*"
for layer in doc.layers:
    if fnmatch.fnmatch(layer.dxf.name, pattern):
        layer.freeze()   # or layer.thaw()
doc.saveas("output.dxf")
```

This is entirely within ezdxf and requires no additional libraries.

**Difficulty: Easy**  
**Write-back needed: Yes**  
**Tool: ODA File Converter + ezdxf**

---

#### Tool 9: Rename Layers by Pattern

**User description:** Batch rename layers matching a pattern — e.g. rename all layers starting with `0-` to start with `COBA-`. Useful when merging drawings from different firms with different layer standards.

**How it works:** ezdxf layer objects expose a `dxf.name` attribute. Renaming a layer also requires updating all entities that reference that layer by name. ezdxf's `doc.audit()` or entity queries can handle this.

```python
import re
old_prefix, new_prefix = "0-", "COBA-"
rename_map = {}
for layer in doc.layers:
    if layer.dxf.name.startswith(old_prefix):
        new_name = new_prefix + layer.dxf.name[len(old_prefix):]
        rename_map[layer.dxf.name] = new_name
        layer.dxf.name = new_name
# Update all entities referencing old layer names
for entity in doc.modelspace():
    if entity.dxf.layer in rename_map:
        entity.dxf.layer = rename_map[entity.dxf.layer]
doc.saveas("output.dxf")
```

**Difficulty: Medium** (entity update pass adds complexity)  
**Write-back needed: Yes**  
**Tool: ODA File Converter + ezdxf**

---

#### Tool 10: Purge Unused Elements

**User description:** Remove unused blocks, layers, linetypes, text styles, and dimension styles from the drawing — equivalent to AutoCAD's `PURGE` command. Reduces file size and cleans up legacy clutter.

**How it works:** ezdxf does not provide a single built-in `purge()` that mimics AutoCAD's full PURGE command. However, the recommended approach is to pass the DXF through the ODA File Converter with a script or to use the **APS Design Automation API** with an AutoLISP script that calls `(command "_.PURGE" "_All" "" "_No")`. This is the most reliable path because AutoCAD's own PURGE logic handles all edge cases (nested dependencies, anonymous blocks, etc.).

For a free alternative, `ezdxf.recover.readfile()` + `doc.audit()` cleans structural issues, and manually iterating unreferenced table entries can approximate PURGE for layers and blocks, but this will miss some edge cases.

**Difficulty: Medium** (via APS DA — straightforward LISP); **Hard** (full implementation in pure ezdxf)  
**Write-back needed: Yes**  
**Tool: APS Design Automation (best) or ODA File Converter + ezdxf (partial)**

---

#### Tool 11: Validate Drawing Standards

**User description:** Check a drawing against a configurable ruleset — e.g. verify that all layers follow the firm's naming convention, that text heights are within allowed values, that no entities are on Layer 0 except blocks, and that all dimensions use the correct style. Returns a report listing violations.

**How it works:** This is a pure read-only analysis tool — no write-back needed. A Python script applies a ruleset (expressed as a JSON/YAML config file) to the parsed DXF data:

```python
violations = []
allowed_layer_pattern = re.compile(r'^(COBA|SURVEY|STRUCT|GEOTECH)-[A-Z]+-\d{3}$')
for layer in doc.layers:
    if not allowed_layer_pattern.match(layer.dxf.name) and layer.dxf.name != "0":
        violations.append({"rule": "layer_naming", "value": layer.dxf.name})
for entity in doc.modelspace().query("TEXT MTEXT"):
    height = getattr(entity.dxf, "height", None)
    if height and (height < 2.0 or height > 10.0):
        violations.append({"rule": "text_height", "value": height, "layer": entity.dxf.layer})
```

The ruleset (allowed layer patterns, min/max text height, required dimension styles, etc.) should be stored in the database and editable from the UI.

**Difficulty: Medium** (the framework is straightforward; the rules are the bespoke work)  
**Write-back needed: No**  
**Tool: ODA File Converter + ezdxf**

---

#### Tool 12: Change Drawing Scale (Annotation Scale)

**User description:** Update the annotative scale of a drawing layout (e.g. change from 1:100 to 1:200). This affects how annotative dimensions, text, and hatches display in paper space.

**How it works:** In DXF, the annotation scale is stored as a `DIMSCALE` header variable and as individual viewport scale factors. ezdxf exposes these:

```python
doc.header["$DIMSCALE"] = 200.0  # for 1:200
# Update paper space viewport scale
for vp in doc.paperspace("Layout1").query("VIEWPORT"):
    vp.dxf.scale = 1.0 / 200.0
doc.saveas("output.dxf")
```

Note: changing annotation scale does not automatically rescale existing non-annotative entities. This tool is most useful for adjusting the *display* scale of annotative objects, not for rescaling geometry. Full geometry rescaling requires transforming coordinates (multiply all points by a scale factor) which is possible in ezdxf via `entity.transform(Matrix44.scale(factor))`.

**Difficulty: Medium–Hard** (annotation scale only = medium; geometry rescaling = hard)  
**Write-back needed: Yes**  
**Tool: ODA File Converter + ezdxf**

---

#### Tool 13: Revision Stamp

**User description:** Add a new revision entry to the revision table in the title block — updating the revision letter, date, and description. Optionally adds a revision cloud around a user-specified region.

**How it works (title block part):**  
Identify the revision table block (usually a series of sequential `INSERT` entities each representing one revision row, or a table implemented as a block with numbered attributes like `REV1_LTR`, `REV1_DATE`, `REV1_DESC`). Update the next empty row's attributes using the same ATTRIB technique as Tool 7.

**How it works (revision cloud — harder part):**  
A revision cloud in DXF is a `LWPOLYLINE` or a series of `ARC` entities forming a closed boundary. ezdxf can create these programmatically, but the user would need to specify the bounding box coordinates of the changed area. This is not practical without a drawing canvas UI (e.g. the APS Viewer where the user can click to define a region).

**Difficulty: Medium** (title block revision row only); **Hard** (full revision cloud with user interaction)  
**Write-back needed: Yes**  
**Tool: ODA File Converter + ezdxf; APS Viewer for coordinate input**

---

#### Tool 14: Drawing Health Report

**User description:** Generate a one-page summary report (HTML or PDF) about the drawing's structure: file size, DWG version, entity count by type, layer count, XREF list, any detected issues (entities on Layer 0, very large extents suggesting geometry far from origin, etc.). No editing — read-only analysis.

**How it works:** Combines all the metadata extraction techniques from §6.B into a single report document. The backend Python script runs all checks and returns a structured JSON object; the React frontend renders it as a styled panel.

Common "health" checks worth including:
- Entities on Layer 0 (usually bad practice — entities should have their own layers)
- Entities far from origin (extents larger than, say, 100 km — indicates stray geometry)
- Drawing has no title block found (no INSERT with a known title block name)
- Unresolved XREFs (listed but file path not found)
- Excessive entity count (>50,000 entities on a single layout may indicate unexploded imports)

**Difficulty: Easy** (pure read; no write-back)  
**Write-back needed: No**  
**Tool: ODA File Converter + ezdxf**

---

### 6.D Technical Architecture for the Tools

#### 6.D.1 Recommended Stack

The cleanest architecture for this stack (Hono/Node.js backend, React frontend, no Redis dependency today) is a **Node.js subprocess calling a Python/ezdxf script**, with ODA File Converter as the DWG↔DXF bridge.

```
Browser
  │  multipart/form-data (raw Hono endpoint — NOT tRPC, see §4.2)
  ▼
Hono /api/engineering/upload
  │  writes to os.tmpdir()/<uuid>/input.dwg
  │  validates magic bytes (6-byte header check)
  ▼
Node child_process.spawn("ODAFileConverter", [...])
  │  DWG → DXF in same temp dir
  ▼
Node child_process.spawn("python3", ["tools/dwg_tool.py", "--tool", "extract_summary", ...])
  │  ezdxf reads DXF, returns JSON via stdout
  ▼
Node parses stdout JSON → stores in SQLite dwg_files table → responds to browser
  │  (or streams modified DXF back as download)
  ▼
Browser receives JSON summary or file download
```

For tools that produce a **modified DWG** (Tools 6–13):
1. ODA converts upload DWG → DXF (temp dir).
2. Python/ezdxf edits the DXF, saves as `output.dxf` (same temp dir).
3. ODA converts `output.dxf` → `output.dwg`.
4. Node streams `output.dwg` back to browser as `Content-Disposition: attachment`.
5. Temp dir is cleaned up with `fs.rm(tmpDir, { recursive: true })`.

#### 6.D.2 Python Script Interface

Each tool is implemented as a Python CLI script that accepts arguments and writes results to stdout (JSON) or to a specified output file:

```
python3 dwg_tools.py \
  --tool extract_summary \
  --input /tmp/<uuid>/input.dxf \
  --output /tmp/<uuid>/result.json
```

A single `dwg_tools.py` entry point dispatches to tool-specific functions. This avoids Python interpreter startup overhead for multiple tool calls in one request.

#### 6.D.3 File Storage Approach

For this project's in-memory SQLite design, the appropriate storage approach is:

| Data | Storage |
|------|---------|
| Original uploaded DWG (binary) | Temporary disk (`os.tmpdir()`) — deleted after processing |
| Tool output DWG/DXF/PDF | Temporary disk — streamed back to browser, then deleted |
| Extracted metadata (JSON) | SQLite `dwg_files` table (text column) |
| APS URN (if APS viewer used) | SQLite `dwg_files` table |
| Layer list, entity counts | SQLite `dwg_files` table (JSON text column) |

There is no need for S3 or permanent binary storage unless the requirement is to keep uploaded DWGs for later re-processing. The current project stores CV PDFs in SQLite as BLOBs (`member_cvs` table) — the same pattern could be used for DWG originals if needed, but DWG files are typically 5–50 MB and storing many as SQLite BLOBs degrades performance; a temp-disk approach is better.

#### 6.D.4 Job Queue Consideration

For tools that complete in under ~10 seconds (most ezdxf operations on typical civil drawings), a job queue is **not needed** — a synchronous async/await chain with a generous timeout is sufficient. The Hono endpoint can hold the connection open.

For tools that may take longer (PDF export via APS Design Automation, large file conversion):

- **Short term (no Redis):** Respond immediately with a job ID, poll status via a tRPC query (`engineering.jobStatus`), store job state in SQLite. Run the conversion in a Node.js `Worker` thread or a detached `child_process`.
- **Long term (if scale grows):** Add BullMQ + Redis. BullMQ is the de-facto standard for Node.js background jobs (Redis-backed, retries, priorities, concurrency control). It integrates cleanly with an existing Node.js/Hono server and does not require a framework change.

#### 6.D.5 tRPC vs Raw Hono Endpoints

tRPC is JSON-only and does not natively support multipart form data or binary file streaming. The pattern already described in §4.2 applies here:

- **File upload:** Raw Hono `POST /api/engineering/upload` (multipart, returns JSON with job/file ID).
- **File download (tool output):** Raw Hono `GET /api/engineering/download/:jobId` (streams the output file with `Content-Disposition: attachment`).
- **All metadata queries and tool triggers (JSON only):** tRPC `engineering.*` procedures.

This is the established pattern in the existing codebase (`member_cvs` table stores binary content uploaded outside tRPC).

---

### 6.E Open Questions for the User

The following decisions are needed before implementation can begin for the editing tools section. They are separate from (but related to) the questions in §5.

1. **Python on the server.** The most practical free path for all 14 tools requires Python 3 and ezdxf installed on the server alongside Node.js. Is this acceptable? If the server is containerised (Docker), this is trivial (multi-stage build). If it is a managed PaaS (e.g. Vercel, Railway), Python subprocess availability must be confirmed.

2. **ODA File Converter installation.** The ODA File Converter must be downloaded and installed manually (not via npm or pip). It is available for Windows, macOS, and Linux (DEB/RPM). It is free but cannot be bundled or redistributed with the application. Is this acceptable for the deployment environment?

3. **DWG write-back vs DXF-only output.** Tools 6–13 produce modified drawings. Should the output be DWG (requiring ODA to convert back) or is DXF acceptable? If the firm's workflow always returns to AutoCAD, DWG output is strongly preferred. DXF output is fine for archiving or sharing with non-Autodesk users.

4. **Title block standardisation.** The title block attribute extraction and update tools (§6.B.4, Tool 7, Tool 13) depend on knowing the title block block name and attribute tag names used in the firm's templates. Are these standardised across all COBA projects? If yes, they can be hardcoded. If not, a configurable mapping table in the UI is needed.

5. **Acceptable processing time.** For a 20 MB DWG: ODA conversion takes ~5–15 seconds; ezdxf metadata extraction takes ~2–5 seconds; a round-trip edit (DWG→DXF→edit→DXF→DWG) takes ~15–30 seconds on a mid-range server. Is a 30-second wait with a progress indicator acceptable, or is a background job + email/notification approach needed?

6. **APS Design Automation budget.** Tools 5 (Convert to PDF) and 10 (Purge) benefit significantly from the APS Design Automation API (headless AutoCAD in the cloud). This is billed per job via Flex tokens. For a small firm running a few dozen operations per month the cost is modest, but it requires an APS subscription. Is this acceptable, or must all tools run on-premises?

7. **Drawing standards ruleset.** Tool 11 (Validate Drawing Standards) is only useful with a configured ruleset. Does the firm already have a documented CAD standards document (layer naming conventions, text heights, linetype standards, etc.) that can be encoded as rules? If so, who maintains the ruleset configuration?

8. **XREF handling.** Many real-world civil/geotech drawings use XREFs (external referenced drawings). XREFs cannot be resolved from a single uploaded DWG. Should the upload interface allow uploading a ZIP archive containing the DWG plus all its XREF dependencies? Or should tools simply warn "this drawing has unresolved XREFs" and proceed anyway?

---

*Sources consulted during research for §6 (April 2026):*
- [Open Design Specification for .dwg files — ODA](https://www.opendesign.com/files/guestdownloads/OpenDesign_Specification_for_.dwg_files.pdf)
- [DWG File Format — fileformat.com](https://docs.fileformat.com/cad/dwg/)
- [DWG version codes — Autodesk Support](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/drawing-version-codes-for-autocad.html)
- [ezdxf documentation — v1.4.3](https://ezdxf.readthedocs.io/)
- [ezdxf ODA File Converter addon](https://ezdxf.readthedocs.io/en/stable/addons/odafc.html)
- [ezdxf Drawing/Export add-on](https://ezdxf.readthedocs.io/en/stable/addons/drawing.html)
- [ezdxf Tutorial: Getting Data from DXF Files](https://ezdxf.readthedocs.io/en/stable/tutorials/getting_data.html)
- [ezdxf External References (XREF)](https://ezdxf.readthedocs.io/en/stable/xref.html)
- [ezdxf HEADER Section internals](https://ezdxf.readthedocs.io/en/stable/dxfinternals/sections/header_section.html)
- [APS Design Automation API — AutoCAD](https://aps.autodesk.com/apis-and-services/design-automation-api-autocad)
- [APS Model Derivative — Thumbnail Generation](https://aps.autodesk.com/en/docs/model-derivative/v2/developers_guide/basics/thumbnail_generation)
- [APS Convert DWG to PDF](https://aps.autodesk.com/en/docs/design-automation/v2/tutorials/convert-dwg-to-pdf)
- [AccoreConsole Guide — Headless CAD Automation](https://fdestech.com/resources/accoreconsole-guide-headless-cad-automation/)
- [file-type npm package](https://www.npmjs.com/package/file-type)
- [magic-bytes npm package](https://github.com/LarsKoelpin/magic-bytes)
- [BullMQ documentation](https://bullmq.io/)
- [tRPC file upload discussion](https://github.com/trpc/trpc/discussions/5479)
- [Hono file upload](https://hono.dev/examples/file-upload)
- [Node.js tmp package](https://www.npmjs.com/package/tmp)
- [GitHub: pfrap/Multiple-file-Autocad-data-extraction](https://github.com/pfrap/Multiple-file-Autocad-data-extraction)
- [GitHub: oddworldng/dwg_to_dxf](https://github.com/oddworldng/dwg_to_dxf)
