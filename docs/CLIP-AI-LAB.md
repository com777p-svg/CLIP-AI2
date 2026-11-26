# CLIP AI Lab (مختبر CLIP AI)

The Lab is a dedicated, isolated workspace for experimenting with CLIP AI's AI Brain and editing pipeline before features are promoted to the main user workflow.

## Goals
- Test AI-provider integrations (OpenAI and other providers such as Anthropic) behind a provider-neutral interface.
- Compare model outputs on the same candidate moments and evaluate usefulness, context completeness, duplicate detection, and editing decisions.
- Inspect the evidence behind decisions: transcript excerpts, timestamps, scene-change signals, and model reasoning summaries (not hidden chain-of-thought).
- Test edit plans and exports on sample clips without affecting users' projects.
- Keep experiments separate from production defaults; promote only after tests and quality checks pass.
- Track latency, token/API usage, errors, and estimated costs. Never silently switch to a paid provider or exceed configured budget.
- Test local/free processing paths and report device limitations clearly.

## Planned Lab areas
1. **AI Brain sandbox** — configurable provider/model, prompts and structured output schemas; API credentials stored server-side only.
2. **Moment evaluation bench** — compare candidate clips, scores, evidence, and overlap/context warnings.
3. **Editing-plan preview** — inspect proposed cuts, sequence, subtitles, framing, and effects before rendering.
4. **Test cases & regression suite** — saved anonymized/sample scenarios, expected outcomes, and checks to detect regressions.
5. **Provider & cost monitor** — usage, latency, failures, quotas, and hard budget controls.
6. **Experiment history** — versioned configurations and results; no automatic production promotion.

## Safety, privacy, and boundaries
- Use only video/audio the tester is authorized to process.
- Do not bypass platform access controls, DRM, login restrictions, or download restrictions.
- Keep experiments opt-in; show what media and metadata are sent to external providers before cloud processing.
- Do not store user media or API keys in public logs or client-side code.
- Test environment must be isolated from publishing accounts and production projects.
- Any device-participation experiment requires explicit consent, task-level consent, and a stop/withdraw control.

## Promotion gate
An experiment can be promoted only after unit tests, integration checks, sample-quality review, privacy review, and cost-limit checks pass. The Lab should never label heuristic output as semantic AI understanding.
