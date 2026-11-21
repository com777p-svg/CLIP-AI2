import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_CONSENT_CHOICES, canOfferDistributedTask } from './device-consent-policy.js';

test('only explicit opt-in allows a future per-task consent prompt', () => {
  assert.equal(canOfferDistributedTask('opt-in-pending-task-confirmation'), true);
  assert.equal(canOfferDistributedTask('local-only'), false);
  assert.equal(canOfferDistributedTask('not-set'), false);
});

test('consent choices are explicit and limited', () => {
  assert.deepEqual(DEVICE_CONSENT_CHOICES, ['opt-in-pending-task-confirmation', 'local-only']);
});
