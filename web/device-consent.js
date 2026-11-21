const STORAGE_KEY = 'clipai-device-consent-v1';
const POINTS_KEY = 'clipai-points-v1';
const OPT_IN_BONUS_KEY = 'clipai-optin-bonus-v1';
const OPT_IN_BONUS = 100;
const gate = document.getElementById('deviceConsentGate');
const optIn = document.getElementById('consentOptIn');
const localOnly = document.getElementById('consentContinueLocal');

function readChoice() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return value && ['opt-in-pending-task-confirmation', 'local-only'].includes(value.choice) ? value : null;
  } catch {
    return null;
  }
}

function saveChoice(choice) {
  if (choice === 'opt-in-pending-task-confirmation' && localStorage.getItem(OPT_IN_BONUS_KEY) !== 'awarded') {\n    const current = Number(localStorage.getItem(POINTS_KEY) || 0);\n    localStorage.setItem(POINTS_KEY, String(current + OPT_IN_BONUS));\n    localStorage.setItem(OPT_IN_BONUS_KEY, 'awarded');\n    window.dispatchEvent(new CustomEvent('clipai:points-updated', { detail: { points: current + OPT_IN_BONUS, bonus: OPT_IN_BONUS } }));\n  }\n  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    choice,
    savedAt: new Date().toISOString(),
    policyVersion: 1
  }));
  gate.hidden = true;
  document.documentElement.classList.remove('consent-open');
  window.dispatchEvent(new CustomEvent('clipai:device-consent-changed', { detail: { choice } }));
}

function openGate() {
  gate.hidden = false;
  document.documentElement.classList.add('consent-open');
}

optIn?.addEventListener('click', () => saveChoice('opt-in-pending-task-confirmation'));
localOnly?.addEventListener('click', () => saveChoice('local-only'));

if (!readChoice()) openGate();
else gate.hidden = true;

// Keep the preference accessible after onboarding, including withdrawal.
const settingsButton = document.createElement('button');
settingsButton.type = 'button';
settingsButton.className = 'secondary-btn';
settingsButton.textContent = 'إعدادات مشاركة الجهاز';
settingsButton.addEventListener('click', openGate);
document.querySelector('.local-compute-heading')?.append(settingsButton);

window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY && !event.newValue) openGate();
});

export function getDeviceConsent() {
  return readChoice()?.choice || 'not-set';
}
