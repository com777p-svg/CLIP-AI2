export const DEVICE_CONSENT_CHOICES = Object.freeze([
  'opt-in-pending-task-confirmation',
  'local-only'
]);

// Opt-in only permits CLIP AI to ask for a separate, task-specific confirmation.
// It is not blanket permission to run jobs in the background.
export function canOfferDistributedTask(choice) {
  return choice === 'opt-in-pending-task-confirmation';
}
