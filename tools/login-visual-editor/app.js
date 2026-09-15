const DEFAULT_BACKGROUND = '../../public/login-background.png';
const STORAGE_KEY = 'job-login-visual-editor-v1';

const el = (id) => document.getElementById(id);

const refs = {
  preview: el('preview'),
  overlayEnabled: el('overlayEnabled'),
  overlayOpacity: el('overlayOpacity'),
  overlayOpacityValue: el('overlayOpacityValue'),
  backgroundFile: el('backgroundFile'),
  backgroundColor: el('backgroundColor'),
  positionX: el('positionX'),
  positionXValue: el('positionXValue'),
  positionY: el('positionY'),
  positionYValue: el('positionYValue'),
  useDefaultBackground: el('useDefaultBackground'),
  brandText: el('brandText'),
  eyebrowText: el('eyebrowText'),
  headlineText: el('headlineText'),
  leadText: el('leadText'),
  bullet1Text: el('bullet1Text'),
  bullet2Text: el('bullet2Text'),
  bullet3Text: el('bullet3Text'),
  tabText: el('tabText'),
  buttonText: el('buttonText'),
  previewBrand: el('previewBrand'),
  previewEyebrow: el('previewEyebrow'),
  previewHeadline: el('previewHeadline'),
  previewLead: el('previewLead'),
  previewBullet1: el('previewBullet1'),
  previewBullet2: el('previewBullet2'),
  previewBullet3: el('previewBullet3'),
  previewTab: el('previewTab'),
  previewButton: el('previewButton'),
  resetButton: el('resetButton'),
  saveButton: el('saveButton'),
  exportButton: el('exportButton'),
  status: el('status'),
};

const defaults = {
  backgroundUrl: DEFAULT_BACKGROUND,
  backgroundColor: '#0b1020',
  positionX: 50,
  positionY: 50,
  overlayEnabled: true,
  overlayOpacity: 46,
  texts: {
    brand: 'JOB',
    eyebrow: 'Twój inteligentny system kariery',
    headline: 'Nie szukaj pracy po omacku',
    lead: 'Porównamy oferty z Twoim doświadczeniem i warunkami, których szukasz.',
    bullet1: 'Najpierw fakty o Tobie, potem rekomendacja',
    bullet2: 'Zero wymyślonego doświadczenia',
    bullet3: 'Możesz zawsze podjąć własną decyzję',
    tab: 'Logowanie',
    button: 'Zaloguj się',
  },
};

let backgroundUrl = DEFAULT_BACKGROUND;
let uploadedObjectUrl = null;

function showStatus(message) {
  refs.status.textContent = message;
  window.clearTimeout(showStatus.timeout);
  showStatus.timeout = window.setTimeout(() => {
    refs.status.textContent = '';
  }, 2200);
}

function setBackground(url) {
  backgroundUrl = url || '';
  refs.preview.style.backgroundImage = url ? `url("${url}")` : 'none';
}

function currentState() {
  return {
    backgroundUrl: backgroundUrl === DEFAULT_BACKGROUND ? DEFAULT_BACKGROUND : null,
    backgroundColor: refs.backgroundColor.value,
    positionX: Number(refs.positionX.value),
    positionY: Number(refs.positionY.value),
    overlayEnabled: refs.overlayEnabled.checked,
    overlayOpacity: Number(refs.overlayOpacity.value),
    texts: {
      brand: refs.brandText.value,
      eyebrow: refs.eyebrowText.value,
      headline: refs.headlineText.value,
      lead: refs.leadText.value,
      bullet1: refs.bullet1Text.value,
      bullet2: refs.bullet2Text.value,
      bullet3: refs.bullet3Text.value,
      tab: refs.tabText.value,
      button: refs.buttonText.value,
    },
  };
}

function applyState(state) {
  const next = {
    ...defaults,
    ...state,
    texts: { ...defaults.texts, ...(state?.texts || {}) },
  };

  refs.backgroundColor.value = next.backgroundColor;
  refs.positionX.value = next.positionX;
  refs.positionY.value = next.positionY;
  refs.overlayEnabled.checked = next.overlayEnabled;
  refs.overlayOpacity.value = next.overlayOpacity;

  refs.brandText.value = next.texts.brand;
  refs.eyebrowText.value = next.texts.eyebrow;
  refs.headlineText.value = next.texts.headline;
  refs.leadText.value = next.texts.lead;
  refs.bullet1Text.value = next.texts.bullet1;
  refs.bullet2Text.value = next.texts.bullet2;
  refs.bullet3Text.value = next.texts.bullet3;
  refs.tabText.value = next.texts.tab;
  refs.buttonText.value = next.texts.button;

  if (next.backgroundUrl === DEFAULT_BACKGROUND || !next.backgroundUrl) {
    setBackground(DEFAULT_BACKGROUND);
  }

  render();
}

function render() {
  refs.preview.style.backgroundColor = refs.backgroundColor.value;
  refs.preview.style.backgroundPosition = `${refs.positionX.value}% ${refs.positionY.value}%`;
  refs.preview.style.setProperty('--overlay-opacity', String(Number(refs.overlayOpacity.value) / 100));
  refs.preview.classList.toggle('overlay-off', !refs.overlayEnabled.checked);

  refs.positionXValue.textContent = `${refs.positionX.value}%`;
  refs.positionYValue.textContent = `${refs.positionY.value}%`;
  refs.overlayOpacityValue.textContent = `${refs.overlayOpacity.value}%`;

  refs.previewBrand.textContent = refs.brandText.value;
  refs.previewEyebrow.textContent = refs.eyebrowText.value;
  refs.previewHeadline.textContent = refs.headlineText.value;
  refs.previewLead.textContent = refs.leadText.value;
  refs.previewBullet1.textContent = refs.bullet1Text.value;
  refs.previewBullet2.textContent = refs.bullet2Text.value;
  refs.previewBullet3.textContent = refs.bullet3Text.value;
  refs.previewTab.textContent = refs.tabText.value;
  refs.previewButton.textContent = refs.buttonText.value;
}

const liveInputs = [
  refs.backgroundColor,
  refs.positionX,
  refs.positionY,
  refs.overlayEnabled,
  refs.overlayOpacity,
  refs.brandText,
  refs.eyebrowText,
  refs.headlineText,
  refs.leadText,
  refs.bullet1Text,
  refs.bullet2Text,
  refs.bullet3Text,
  refs.tabText,
  refs.buttonText,
];

for (const input of liveInputs) {
  input.addEventListener('input', render);
  input.addEventListener('change', render);
}

refs.backgroundFile.addEventListener('change', () => {
  const file = refs.backgroundFile.files?.[0];
  if (!file) return;

  if (uploadedObjectUrl) URL.revokeObjectURL(uploadedObjectUrl);
  uploadedObjectUrl = URL.createObjectURL(file);
  setBackground(uploadedObjectUrl);
  render();
  showStatus(`Wczytano: ${file.name}`);
});

refs.useDefaultBackground.addEventListener('click', () => {
  if (uploadedObjectUrl) {
    URL.revokeObjectURL(uploadedObjectUrl);
    uploadedObjectUrl = null;
  }
  refs.backgroundFile.value = '';
  setBackground(DEFAULT_BACKGROUND);
  render();
  showStatus('Przywrócono domyślne tło.');
});

refs.saveButton.addEventListener('click', () => {
  const state = currentState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showStatus('Ustawienia zapisane lokalnie.');
});

refs.exportButton.addEventListener('click', () => {
  const state = currentState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'job-login-visual-settings.json';
  anchor.click();
  URL.revokeObjectURL(url);
  showStatus('Wyeksportowano JSON.');
});

refs.resetButton.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  refs.backgroundFile.value = '';
  if (uploadedObjectUrl) {
    URL.revokeObjectURL(uploadedObjectUrl);
    uploadedObjectUrl = null;
  }
  applyState(defaults);
  showStatus('Przywrócono wartości początkowe.');
});

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  applyState(saved || defaults);
} catch {
  applyState(defaults);
}
