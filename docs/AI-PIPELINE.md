# CLIP AI Engine — AI editing pipeline

## Approved product rules
- Auto Mode and Pro Mode share one project/media engine.
- Analyze a source video once and reuse its transcript, timestamps, scene metadata and candidate moments.
- A long source (including a 60-minute video) can yield multiple independent short clips.
- Select moments using measured editorial signals: hook strength, story clarity, curiosity, emotional impact, standalone context, audio clarity and visual quality. Penalize duplicate moments and missing context.
- Produce two subtitle versions from the same analysis: source-language captions preserving the words as spoken, and translated captions in the other language (Arabic ↔ English).
- Both outputs use the same selected video ranges and preserve the original audio.
- Current default: preserve the original audio and provide written captions/translation only. Dubbing, voice synthesis or voice replacement are not part of the current workflow. A future optional dubbing feature may be considered only as a separate user-controlled feature; it must never activate automatically.
- Scores estimate editorial potential only. Never promise virality, reach or views.

## Processing architecture
1. Netlify hosts the web UI and lightweight request validation only.
2. An import service stores source media temporarily in private object storage.
3. A queue creates a durable job; the browser does not need to remain open.
4. A GPU/CPU worker performs one media analysis pass and returns language detection, timestamped original transcript, scene boundaries, candidate ranges and measured editorial metrics.
5. Translation runs on extracted transcript text only, not on the video/audio again.
6. The shared engine builds one project manifest with two subtitle tracks/outputs and unchanged source audio.
7. Auto Mode assembles selected clips; Pro Mode receives the same ranges and transcript for manual refinement.
8. Publishing remains separate and requires user configuration.

## Free-tier and cost guardrails
- Start with free-tier resources only. Do not silently upgrade, attach paid GPUs, or create billable resources.
- Enforce provider quotas, job duration, maximum file size and concurrency.
- When free quota is exhausted, queue or pause jobs and explain the limit. Never auto-charge.
- Keep source media in private temporary storage with expiry and deletion controls.
- Keep provider tokens out of browser code and Git; use deployment environment variables.
- A free tier cannot be assumed to handle unlimited one-hour videos or concurrent users. Measure throughput before promising service levels.

## Current implementation boundary
web/ai-pipeline.js contains deterministic utilities for normalizing one transcript, ranking worker-scored candidates, and creating the bilingual manifest. It is not a translation model, downloader or GPU worker. A local Whisper transcription prototype now extracts five-minute audio chunks in the browser and runs an on-demand multilingual model; it has not yet been validated across mobile devices and is limited to files up to 250 MB and one hour. A real worker plus storage and queue are still required before end-to-end AI processing can be enabled.


## Local-first device processing (new foundation)
- The browser checks WebGPU, WebAssembly, Web Workers, WebCodecs, hardware concurrency and approximate device memory.
- Device classification is advisory only; it does not claim a model is loaded or that the phone can run a particular model.
- A lightweight scene pre-scan samples downscaled video frames locally and uses a Web Worker to flag large visual changes. It does not upload the media.
- Visual transitions are only technical scene-boundary hints. They are not semantic understanding and must never be treated as proof that a moment is funny, exciting, coherent or likely to perform.
- Next local stages can reuse these boundaries to avoid redundant decoding, then run speech recognition and semantic ranking with a suitable on-device model when device resources permit.
- On weaker devices, local preprocessing should remain optional and a queued free-tier worker can be used when available. No automatic paid fallback.
- Mobile browsers may throttle or suspend long-running tabs, so long jobs need checkpoints, progress reporting and resumable chunks.
