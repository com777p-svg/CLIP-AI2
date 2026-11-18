# CLIP AI Web Studio

Browser-based Arabic RTL editor built with Vite and FFmpeg.wasm.

## Implemented in this milestone
- Import multiple local video files by file picker or drag-and-drop, then preview the selected clip.
- Timeline ordering, removal, splitting at the playhead, seeking within the selected clip, and per-clip in/out trimming.
- Import one background audio file, preview it, adjust its level, and mix it with source clip audio during MP4 export.
- Live brightness, contrast, and saturation adjustments, also applied during MP4 export.
- MP4 export in-browser with FFmpeg.wasm; output dimensions are even-numbered for H.264 compatibility, uses broadly supported yuv420p pixel format, and applies frame rate and encoding settings.
- Save/load a `.clipai` project metadata file, including clip trim points and export settings. Original video and audio media remain local and must be re-selected/re-imported when reopening a project.
- No video uploads or account credentials are sent to a server.
- Development and preview servers bind to localhost by default, rather than exposing the editor to the local network.

## Run
```bash
npm install
npm run dev
npm run build
npm run preview
```

## Limitations
- FFmpeg.wasm core is downloaded from unpkg on first export; internet is required for initial engine loading. Export can exceed available RAM on long/high-resolution videos, especially on phones.
- This milestone is a single video sequence with one background audio layer, not a full multi-track compositor. Audio preview is separate from video preview; final export mixes the imported background track with source audio when present.
- AI auto-editing, AI Lab execution, URL import, cloud accounts/projects, and social publishing are not active. They require authenticated backend services, provider credentials, security controls, and integration tests.
- HTTPS deployment still requires repository hosting configuration and a successful deployment run.
