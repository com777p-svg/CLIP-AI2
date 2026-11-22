const STORAGE_KEY = "clipai-device-consent-v1";
const POINTS_KEY = "clipai-points-v1";
const OPT_IN_BONUS_KEY = "clipai-optin-bonus-v1";
const OPT_IN_BONUS = 100;

const gate = document.getElementById("deviceConsentGate");
const optIn = document.getElementById("consentOptIn");
const localOnly = document.getElementById("consentContinueLocal");

function readChoice() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const allowed = ["opt-in-pending-task-confirmation", "local-only"];
    return saved && allowed.includes(saved.choice) ? saved : null;
  } catch {
    return null;
  }
}

function saveChoice(choice) {
  let receivedBonus = false;

  if (
    choice === "opt-in-pending-task-confirmation" &&
    localStorage.getItem(OPT_IN_BONUS_KEY) !== "awarded"
  ) {
    const currentPoints = Number(localStorage.getItem(POINTS_KEY) || 0);
    const nextPoints = currentPoints + OPT_IN_BONUS;

    localStorage.setItem(POINTS_KEY, String(nextPoints));
    localStorage.setItem(OPT_IN_BONUS_KEY, "awarded");
    receivedBonus = true;

    window.dispatchEvent(
      new CustomEvent("clipai:points-updated", {
        detail: { points: nextPoints, bonus: OPT_IN_BONUS }
      })
    );
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      choice,
      savedAt: new Date().toISOString(),
      policyVersion: 1
    })
  );

  if (gate) {
    gate.hidden = true;
  }

  document.documentElement.classList.remove("consent-open");

  window.dispatchEvent(
    new CustomEvent("clipai:device-consent-changed", {
      detail: { choice }
    })
  );

  if (receivedBonus) {
    window.dispatchEvent(
      new CustomEvent("clipai:toast", {
        detail: {
          message: "حصلت على 100 نقطة ترحيبية تجريبية. لم تبدأ أي مشاركة فعلية."
        }
      })
    );
  }
}

function openGate() {
  if (gate) {
    gate.hidden = false;
  }
  document.documentElement.classList.add("consent-open");
}

if (optIn) {
  optIn.addEventListener("click", function () {
    saveChoice("opt-in-pending-task-confirmation");
  });
}

if (localOnly) {
  localOnly.addEventListener("click", function () {
    saveChoice("local-only");
  });
}

if (!readChoice()) {
  openGate();
} else if (gate) {
  gate.hidden = true;
}

const settingsButton = document.createElement("button");
settingsButton.type = "button";
settingsButton.className = "secondary-btn";
settingsButton.textContent = "إعدادات مشاركة الجهاز";
settingsButton.addEventListener("click", openGate);

const settingsHost = document.querySelector(".local-compute-heading");
if (settingsHost) {
  settingsHost.append(settingsButton);
}

window.addEventListener("storage", function (event) {
  if (event.key === STORAGE_KEY && !event.newValue) {
    openGate();
  }
});

export function getDeviceConsent() {
  const saved = readChoice();
  return saved ? saved.choice : "not-set";
}
