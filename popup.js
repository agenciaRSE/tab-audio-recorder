// Tab Audio Recorder: popup. Renders the state kept in chrome.storage.local by the service worker.

const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;
const $ = (id) => document.getElementById(id);

const ui = {
    badge: $('status-badge'), badgeText: $('badge-text'), timer: $('timer'), status: $('status-text'),
    start: $('start-btn'), recording: $('recording-controls'), pause: $('pause-btn'), stop: $('stop-btn'),
    finished: $('finished-controls'), saveMp3: $('save-mp3-btn'), saveWebm: $('save-webm-btn'), discard: $('discard-btn'),
    shortcut: $('shortcut'), shortcutSave: $('shortcut-save'), askWhere: $('ask-where'),
};

let timerInterval;
let discardArmed = false;
let state = {};

// --- i18n ---
document.documentElement.lang = chrome.i18n.getUILanguage();
document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });

// --- Links: popups cannot follow chrome:// or mailto: links on their own ---
document.querySelectorAll('a[href]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: a.href });
}));

// --- Actions ---
async function send(type, extra = {}) {
    setBusy(true);
    state.notice = null;
    try {
        const res = await chrome.runtime.sendMessage({ type, ...extra });
        if (!res?.ok) state.notice = { kind: 'error', text: res?.error || t('errGeneric') };
    } catch (err) {
        state.notice = { kind: 'error', text: err.message };
    } finally {
        setBusy(false);
        render();
    }
}

ui.start.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) send('START_RECORDING', { tabId: tab.id });
});
ui.pause.addEventListener('click', () => send(state.recordingState === 'paused' ? 'RESUME_RECORDING' : 'PAUSE_RECORDING'));
ui.stop.addEventListener('click', () => send('STOP_RECORDING'));
ui.saveMp3.addEventListener('click', () => send('SAVE', { format: 'mp3' }));
ui.saveWebm.addEventListener('click', () => send('SAVE', { format: 'webm' }));

// Discarding loses the recording: ask for a second click instead of a modal dialog.
ui.discard.addEventListener('click', () => {
    if (discardArmed) {
        disarmDiscard();
        send('DISCARD_RECORDING');
        return;
    }
    discardArmed = true;
    ui.discard.textContent = t('btnDiscardConfirm');
    setTimeout(disarmDiscard, 4000);
});

function disarmDiscard() {
    discardArmed = false;
    ui.discard.textContent = t('btnDiscard');
}

function setBusy(busy) {
    [ui.start, ui.pause, ui.stop, ui.saveMp3, ui.saveWebm, ui.discard].forEach((b) => { b.disabled = busy; });
}

// --- Rendering ---
function render() {
    const s = state.recordingState || 'idle';
    ui.start.classList.toggle('hidden', s !== 'idle');
    ui.recording.classList.toggle('hidden', s !== 'recording' && s !== 'paused');
    ui.finished.classList.toggle('hidden', s !== 'finished' && s !== 'saving');
    [ui.saveMp3, ui.saveWebm, ui.discard].forEach((b) => { b.disabled = s === 'saving'; });

    ui.pause.textContent = t(s === 'paused' ? 'btnResume' : 'btnPause');
    ui.badge.classList.toggle('hidden', s !== 'recording' && s !== 'paused');
    ui.badge.classList.toggle('paused', s === 'paused');
    ui.badgeText.textContent = t(s === 'paused' ? 'stateBadgePaused' : 'stateBadgeRecording');

    if (state.notice) showNotice(state.notice);
    else showNotice({ kind: 'info', text: t({ idle: 'statusIdle', recording: 'statusRecording', paused: 'statusPaused', finished: 'statusFinished', saving: 'statusSaving' }[s]) });

    clearInterval(timerInterval);
    if (s === 'idle') ui.timer.textContent = formatTime(0);
    else {
        updateTimer();
        if (s === 'recording') timerInterval = setInterval(updateTimer, 500);
    }
}

function showNotice({ kind, text }) {
    ui.status.textContent = text;
    ui.status.dataset.kind = kind;
}

function updateTimer() {
    const end = state.pausedAt || Date.now();
    ui.timer.textContent = formatTime(end - (state.startTime || end) - (state.pausedTotal || 0));
}

function formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    const p = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

// --- Settings ---
async function loadSettings() {
    const { settings } = await chrome.storage.local.get('settings');
    const s = { shortcutSave: 'ask', askWhere: true, ...settings };
    ui.shortcutSave.value = s.shortcutSave;
    ui.askWhere.checked = s.askWhere;
}

function saveSettings() {
    chrome.storage.local.set({ settings: { shortcutSave: ui.shortcutSave.value, askWhere: ui.askWhere.checked } });
}
ui.shortcutSave.addEventListener('change', saveSettings);
ui.askWhere.addEventListener('change', saveSettings);

// --- Init ---
(async () => {
    const [command] = (await chrome.commands.getAll()).filter((c) => c.name === 'toggle-recording');
    ui.shortcut.textContent = command?.shortcut || t('shortcutNone');

    state = await chrome.storage.local.get(['recordingState', 'startTime', 'pausedAt', 'pausedTotal', 'notice']);
    render();
    loadSettings();

    // A notice is shown once: clear it so the next opening shows the plain status.
    if (state.notice && state.recordingState === 'idle') chrome.storage.local.set({ notice: null });
})();

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const keys = ['recordingState', 'startTime', 'pausedAt', 'pausedTotal', 'notice'];
    if (!keys.some((k) => k in changes)) return;
    keys.forEach((k) => { if (k in changes) state[k] = changes[k].newValue; });
    render();
});
