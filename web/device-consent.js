const STORAGE_KEY = 'clipai-device-consent-v1';
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
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
