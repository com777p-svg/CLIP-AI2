# CLIP AI — Product Blueprint & AI Training Lab
Version: 1.0
Status: Product requirements baseline
Branch: feature/clip-ai-product-blueprint

## 1. Product vision
CLIP AI is a professional video-editing application for Android. Its usability and capability targets are informed by leading editors such as CapCut and Adobe Premiere, while its interface, branding, and implementation must remain original. The goal is a real, reliable editor—not a mockup or a collection of inactive buttons.

Two workstreams must progress together:
1. **Professional Editor:** a capable manual editing workspace.
2. **CLIP AI Auto Editor:** an assistant that understands footage, proposes an edit, renders it, and lets the user refine it.

## 2. Professional editor requirements
### Workspace and project management
- Import videos, images, and audio from device storage using Android's document picker.
- Create, save, reopen, rename, and safely delete projects.
- Preserve project state and source-media references; handle missing or moved files gracefully.
- Clear project settings: canvas ratio, frame rate, resolution, and export format.

### Timeline
- Multi-track timeline for video, overlays/images, titles, voice, music, and sound effects.
- Add, select, move, trim, split, duplicate, reorder, mute, lock, and delete clips.
- Accurate playhead, scrubbing, snapping, zooming, track scrolling, and undo/redo.
- Non-destructive editing: edits are stored as project decisions; source files are not overwritten.
- Preview must stay synchronized with the timeline and project settings.

### Editing tools
- Trim, split, crop, rotate, scale, position, speed control, and volume control.
- Aspect ratios: 9:16, 16:9, 1:1, plus custom canvas where feasible.
- Text and captions with font, size, color, outline, background, position, and timing controls.
- Transitions and effects with adjustable duration/intensity; avoid random effects by default.
- Audio fade in/out, clip volume, music and sound-effect tracks.
- Filters/color adjustments with reset and before/after preview.

### Export
- Export real MP4 files; do not show success until rendering and file writing finish.
- Initial targets: 720p and 1080p, with sensible quality presets and source-compatible frame rates.
- Show progress, estimated stage, cancel action, and useful error messages.
- Verify output existence, duration, dimensions, and playable video/audio streams.
- Never silently overwrite the user's source media.

## 3. CLIP AI Auto Editor requirements
The AI must make content-aware editing decisions rather than applying a fixed template blindly.

### Input understanding
- Accept local video and supported, permitted media sources.
- Inspect duration, dimensions, frame rate, audio presence, and orientation.
- Detect scene boundaries, visual changes, speech, pauses, and candidate highlights.
- Where semantic AI is available, identify high-level events and their context; do not claim understanding when confidence is low.

### Edit decision process
- Ask for or infer an editing goal: Gaming, Memes, Cinematic, Viral Shorts, or Custom.
- Respect target duration, aspect ratio, language, caption preference, and music preference.
- Rank candidate moments using relevance, clarity, pacing, repetition, and context—not just motion.
- Preserve causal/contextual continuity; avoid cutting off important speech or action.
- Produce an editable timeline/decision list before rendering.
- Explain key choices briefly and allow the user to accept, reject, or adjust them.

### Rendering and refinement
- Convert the edit decision list into actual timeline operations.
- Render through a dependable media engine and verify the final file.
- Keep all AI edits editable manually.
- If a step fails, preserve the project and report the failed stage; do not pretend the export succeeded.

## 4. Supervised virtual AI practice lab
Build a separate, isolated test harness for evaluating editing strategies before they are shipped in the app.

### Lab workflow
1. Load only sample footage that is synthetic, user-authorized, or appropriately licensed.
2. Create benchmark tasks with a clear editing brief and expected constraints.
3. Let the candidate editing planner generate an edit decision list (EDL); it must not directly change production code or user files.
4. Render the proposed edit in a disposable workspace.
5. Run automated checks: duration, valid media streams, black/frozen-frame detection where feasible, audio clipping/peak checks, caption timing, aspect ratio, and export integrity.
6. Score editorial quality using transparent criteria: relevance, continuity, pacing, audio fit, caption readability, and adherence to the brief.
7. Compare against a known baseline and retain the test report and sample output.
8. Require human review for subjective quality and approval before promoting a model, prompt, rule, or app change.

### Safety and control boundaries
- The lab is sandboxed and cannot access unrelated device files, accounts, credentials, or production secrets.
- No self-modifying production code, automatic deployment, or unrestricted online learning.
- Every experiment is logged, reproducible, and reversible.
- Do not upload private user footage for training without explicit, informed permission.
- Keep API credentials on a secure backend; never hard-code secrets in the Android app or public Git repository.
- Provide time, storage, and compute limits; allow cancellation and cleanup.
- Low-confidence results must be flagged for user review instead of presented as certain.

### Evaluation gates
A candidate is eligible for release only if:
- It passes build and automated tests.
- It does not regress core editing/export behavior.
- It meets the task constraints and media-integrity checks.
- A human reviewer approves the visual/audio result.
- The release can be rolled back.

## 5. Suggested technical architecture
- **Android UI:** Jetpack Compose, separated into screens, state, and reusable components.
- **Project model:** a versioned, serializable project document describing source assets, tracks, clips, transforms, effects, and export settings.
- **Playback:** Media3/ExoPlayer for preview.
- **Rendering:** evaluate Media3 Transformer versus an FFmpeg-based pipeline; select based on Android compatibility, licensing, codec support, performance, and maintenance. Do not assume preview playback means export is implemented.
- **Analysis:** metadata and keyframe extraction first; scene detection and audio transcription next; semantic event understanding as a later, replaceable service.
- **AI planner:** converts user intent and analysis into a validated EDL; it does not render by itself.
- **Renderer:** consumes the EDL and creates the output file.
- **Backend (optional, later):** handles remote AI inference and protected credentials. The app must remain usable for manual editing if the service is unavailable.
- **Testing:** unit tests for timeline math and EDL validation; instrumentation tests for import/preview/export; benchmark tests for the AI lab.

## 6. Delivery roadmap
### Phase 0 — Foundation
- Inspect the current app and preserve working behavior.
- Define project/timeline data models and architecture boundaries.
- Add this product blueprint as the source of truth.

### Phase 1 — Real editor MVP
- Reliable project state, timeline basics, trim/split, preview synchronization.
- Real MP4 export with progress, cancellation, and validation.
- Basic text and audio tracks.

### Phase 2 — First Auto Editor
- Media metadata, thumbnails/keyframes, scene segmentation.
- Rule-based highlight selection and editable EDL.
- Render selected segments into a real output.
- Benchmark it in the supervised lab.

### Phase 3 — Content-aware intelligence
- Speech transcription, caption timing, event understanding, and improved highlight ranking.
- Editing styles with explicit, testable behavior.
- Human feedback and offline benchmark evaluation.

### Phase 4 — Professional expansion
- More tracks, transitions, color tools, audio controls, reusable presets, and performance improvements.
- Optional account sync and publishing integrations only after secure authorization and clear user control.

## 7. Definition of done
A feature is not complete because a button or screen exists. It is complete only when:
- The user can perform the action end-to-end.
- The result is saved and survives app restart where applicable.
- Errors and cancellation are handled.
- Automated tests cover the important behavior.
- The feature is verified on a real Android device or emulator.
- Documentation accurately describes current capability.

## 8. Current known baseline
The existing app has been inspected previously: it supports selecting local videos and previewing a selected video with Media3, plus basic output setting choices. At that inspection point, actual timeline editing, rendering/export, AI auto-editing, and publishing were not implemented. Re-check the current branch before making implementation assumptions.
