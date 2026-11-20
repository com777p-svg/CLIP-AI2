# CLIP AI Product Architecture

## Product operating decision

CLIP AI uses **two operating modes together**. This is a permanent product-design requirement, not a temporary experiment. The user can switch modes per project or task without creating a second app.

### 1. Automatic mode
The system takes the lead and performs supported steps with minimal user input:
- inspect and import supported source media;
- analyze the media and identify useful moments;
- propose or create a sequence of clips;
- apply supported editing choices such as framing, captions, titles, audio and transitions;
- prepare an export and, when publishing integration is configured, a publishing draft or scheduled post.

The interface must show progress and explain what the system is doing. Before destructive changes, overwriting a project, or publishing externally, ask for confirmation.

### 2. Assisted-control mode
The user stays in charge while AI provides suggestions and editable results:
- show detected highlights and let the user accept, reject, or adjust them;
- allow manual clip selection, trimming, ordering, captions, framing and audio adjustments;
- make AI-generated changes reversible and preserve the original media;
- clearly distinguish suggestions from actions already applied.

### Shared foundations
- One editor, one project format, one media pipeline and one export pipeline serve both modes.
- Mode is a workflow preference, not a separate product or separate project type.
- The selected mode should persist with project settings and be changeable at any time.
- Both modes must use the same security checks, media compatibility checks and privacy controls.
- Keep source media local by default where practical; disclose clearly whenever a feature requires server processing or third-party services.
- Never claim a URL has been imported when only its format or platform has been checked.
- Do not bypass DRM, authentication, or platform access controls. Retrieval is available only through supported, permitted methods.
- Ask for explicit confirmation before publishing or scheduling content to a social account.

## Product engine

The shared **CLIP AI Engine** is organized as connected capabilities:
1. Smart Import — local files and supported URL-based sources.
2. Media Analysis — scene/content understanding, speech/transcript analysis where available, and highlight detection.
3. AI Editing — clip selection, ordering, reframing, captions, titles, audio and transitions.
4. Editor & Review — manual refinement and reversible AI suggestions.
5. Export — render settings and downloadable output.
6. Publishing — manual and scheduled workflows through a configured provider such as Upload-Post.
7. AI Lab — optional tools and experiments that can feed results into the same project/editor.

## UX requirements

- Provide an obvious mode switch labelled **تلقائي** and **تحكم** (or equivalent clear Arabic labels).
- Explain the active mode in plain Arabic.
- Automatic mode should expose progress, pause/cancel where technically possible, and a review step before external publishing.
- Assisted-control mode should keep AI actions optional and editable.
- Preserve project state when switching modes.
- On phones, prioritize a simple workflow and avoid hiding essential actions behind dense panels.

## Current implementation status (baseline)

The existing web app is an early editor with local video selection, a simple single-sequence timeline, trimming, splitting, reordering, basic visual adjustments, background audio and browser-side MP4 export.

The URL panel currently checks URL/platform validity only; it is **not a downloader and does not import remote media**. The Auto Editing and AI Lab navigation entries are placeholders and are not yet connected to real AI services. Social publishing is not yet integrated into the CLIP AI app.

Do not describe these capabilities as complete until end-to-end implementation and testing have succeeded.

## Development sequence

1. Establish the shared project/mode model and the two-mode UX.
2. Build secure Smart Import with honest per-platform support and clear progress states.
3. Connect Media Analysis and highlight detection.
4. Build AI Editing with editable/reversible results.
5. Strengthen the editor, timeline and export pipeline.
6. Integrate manual and scheduled publishing with explicit user confirmation.
7. Build AI Lab on top of the shared engine.

## Definition of done for dual-mode support

- The user can switch between both modes without losing project state.
- Both modes use the same project and media pipeline.
- Automatic mode can complete only capabilities that are actually integrated.
- Assisted-control mode lets the user inspect and modify AI suggestions.
- Errors, unsupported sources and unavailable services are reported accurately.
- No feature is marked complete based only on a UI placeholder or URL validation.
