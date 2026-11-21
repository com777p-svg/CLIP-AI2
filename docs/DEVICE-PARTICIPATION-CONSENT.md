# Device participation and consent

CLIP AI may eventually support an opt-in distributed task network. A user's device must never be treated as an always-available server.

## Onboarding disclosure

Before entering the editor, users see a clear choice:
- **Opt in** to be asked about future participation. This is not blanket authorization.
- **Local only** to continue using CLIP AI without offering their device to other users.

Users who opt in receive a one-time 100-point welcome bonus in the current prototype. These points are stored in browser local storage, have no cash value, are not transferable or redeemable, and are not proof of actual device work. The bonus is granted once and is not clawed back if the user later switches to local-only. The choice can be changed later. A future implementation must ask for separate, informed consent before each task and explain the task, expected duration, data transferred, approximate resource use, and how to stop it.

## Non-negotiable safeguards

- No hidden/background participation and no participation before explicit consent.
- No access to a user's files, camera, microphone, or other device resources beyond what a clearly described task requires.
- Do not send private source media to another user's device by default. Prefer sending only the minimum necessary, privacy-reviewed task payload.
- Show a visible active-task indicator, progress, pause/stop controls, and a clear completion state.
- Users can decline, pause, or withdraw at any time without losing access to the editor.
- Never assume peers remain online. Jobs must tolerate disconnects, retries, and partial results.
- Explain battery, data, memory, heat, and performance impacts before consent.
- Keep auditable records of consent version and task authorization without collecting unnecessary personal data.
- Publish a privacy notice and terms appropriate to the actual data flows and jurisdictions before enabling the network.

## Current implementation status

The onboarding preference UI is implemented. The distributed processing network itself is **not enabled**. Opt-in currently records a preference only; it does not start a worker, transfer data, or run tasks for other users. A separate task-specific consent screen and a secure coordinator/worker protocol are required before any real peer processing is launched.

This disclosure is a product safeguard, not legal advice or a guarantee against legal claims. Have the final privacy notice and terms reviewed for the jurisdictions where CLIP AI is offered.
