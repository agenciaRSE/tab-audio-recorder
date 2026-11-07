// Tab Audio Recorder: service worker.
// Owns the recording state (chrome.storage.local) and talks to the offscreen document,
// which holds the MediaRecorder because service workers cannot use getUserMedia.
//
// States: idle -> recording <-> paused -> finished -> saving -> idle

const DEFAULTS = { shortcutSave: 'ask', askWhere: true };
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

chrome.runtime.onInstalled.addListener(resetState);
chrome.runtime.onStartup.addListener(resetState);

async function resetState() {
    await chrome.storage.local.set({ recordingState: 'idle', notice: null, downloadId: null });
    await updateBadge('idle');
}

async function getState() {
    const s = await chrome.storage.local.get(['recordingState', 'startTime', 'pausedAt', 'pausedTotal']);
    return { recordingState: 'idle', pausedTotal: 0, ...s };
}

async function setState(patch) {
    await chrome.storage.local.set(patch);
    if (patch.recordingState) await updateBadge(patch.recordingState);
}

async function getSettings() {
    const { settings } = await chrome.storage.local.get('settings');
    return { ...DEFAULTS, ...settings };
}

// --- Toolbar badge: the only recording indicator when the popup is closed ---
const BADGES = {
    recording: { text: 'REC', color: '#d92d20', title: 'badgeRecording' },
    paused: { text: '❚❚', color: '#52525b', title: 'badgePaused' },
    finished: { text: '1', color: '#b54708', title: 'badgeFinished' },
    saving: { text: '…', color: '#52525b', title: 'badgeSaving' },
};

async function updateBadge(state) {
    const b = BADGES[state];
    await chrome.action.setBadgeText({ text: b ? b.text : '' });
    if (b) await chrome.action.setBadgeBackgroundColor({ color: b.color });
    await chrome.action.setTitle({ title: b ? t(b.title) : t('actionTitle') });
}

// --- Offscreen document ---
async function hasOffscreen() {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    return contexts.length > 0;
}

async function ensureOffscreen() {
    if (await hasOffscreen()) return;
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Record the audio of the current tab',
    });
}

async function closeOffscreen() {
    if (await hasOffscreen()) await chrome.offscreen.closeDocument();
}

// Offscreen replies { ok: true, ... } or { ok: false, error }.
async function toOffscreen(type, data = {}) {
    const res = await chrome.runtime.sendMessage({ target: 'offscreen', type, ...data });
    if (!res || !res.ok) throw new Error(res?.error || 'No response from the recorder');
    return res;
}

// --- Actions ---
async function startRecording(tabId) {
    const { recordingState } = await getState();
    if (recordingState !== 'idle') throw new Error(t('errBusy'));
    try {
        await ensureOffscreen();
        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
        await toOffscreen('START_RECORDING', { streamId });
        await setState({ recordingState: 'recording', startTime: Date.now(), pausedAt: null, pausedTotal: 0, notice: null });
    } catch (err) {
        await closeOffscreen();
        await setState({ recordingState: 'idle' });
        throw new Error(t('errStart', err.message));
    }
}

async function pauseRecording() {
    await toOffscreen('PAUSE_RECORDING');
    await setState({ recordingState: 'paused', pausedAt: Date.now() });
}

async function resumeRecording() {
    const { pausedAt, pausedTotal } = await getState();
    await toOffscreen('RESUME_RECORDING');
    await setState({ recordingState: 'recording', pausedAt: null, pausedTotal: pausedTotal + (Date.now() - (pausedAt || Date.now())) });
}

async function stopRecording() {
    const { recordingState } = await getState();
    await toOffscreen('STOP_RECORDING');
    // Freeze the timer: if it was paused, keep the pause start.
    await setState({ recordingState: 'finished', ...(recordingState === 'paused' ? {} : { pausedAt: Date.now() }) });
}

async function saveRecording(format) {
    const { recordingState } = await getState();
    if (recordingState !== 'finished') throw new Error(t('errNothingToSave'));
    if (!(await hasOffscreen())) {
        await setState({ recordingState: 'idle', notice: { kind: 'error', text: t('errLost') } });
        throw new Error(t('errLost'));
    }
    await setState({ recordingState: 'saving', notice: null });
    try {
        const { url } = await toOffscreen('ENCODE', { format });
        const { askWhere } = await getSettings();
        const downloadId = await chrome.downloads.download({ url, filename: fileName(format), saveAs: askWhere });
        await chrome.storage.local.set({ downloadId });
    } catch (err) {
        // Keep the recording so the user can try again.
        await setState({ recordingState: 'finished', notice: { kind: 'error', text: t('errSave', err.message) } });
        throw err;
    }
}

async function discardRecording() {
    await closeOffscreen();
    await setState({ recordingState: 'idle', notice: null, downloadId: null });
}

function fileName(ext) {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    // Local time, not UTC, so the name matches the clock the user sees.
    return `recording-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.${ext}`;
}

// The blob URL lives in the offscreen document, so it must stay open until the download ends.
chrome.downloads.onChanged.addListener(async (delta) => {
    const { downloadId } = await chrome.storage.local.get('downloadId');
    if (delta.id !== downloadId || !delta.state) return;
    if (delta.state.current === 'complete') {
        const [item] = await chrome.downloads.search({ id: delta.id });
        const name = item ? item.filename.split(/[\\/]/).pop() : '';
        await closeOffscreen();
        await setState({ recordingState: 'idle', downloadId: null, notice: { kind: 'success', text: t('noticeSaved', name) } });
    } else if (delta.state.current === 'interrupted') {
        // Includes cancelling the "Save as" dialog: keep the recording.
        await setState({ recordingState: 'finished', downloadId: null, notice: { kind: 'info', text: t('noticeNotSaved') } });
    }
});

// --- Keyboard shortcut ---
chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'toggle-recording') return;
    try {
        await handleShortcut();
    } catch (err) {
        await chrome.storage.local.set({ notice: { kind: 'error', text: err.message } });
    }
});

async function handleShortcut() {
    const { recordingState } = await getState();
    if (recordingState === 'idle') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) await startRecording(tab.id);
    } else if (recordingState === 'recording' || recordingState === 'paused') {
        await stopRecording();
        const { shortcutSave } = await getSettings();
        if (shortcutSave === 'mp3' || shortcutSave === 'webm') await saveRecording(shortcutSave);
        else await openPopupSafely();
    } else if (recordingState === 'finished') {
        // A recording is waiting to be saved: never start a new one over it.
        await openPopupSafely();
    }
    // 'saving': ignore, a file is being written.
}

async function openPopupSafely() {
    try {
        await chrome.action.openPopup();
    } catch {
        // No focused browser window: the badge still shows that a recording is waiting.
    }
}

// --- Messages from the popup and the offscreen document ---
const ACTIONS = {
    START_RECORDING: (m) => startRecording(m.tabId),
    PAUSE_RECORDING: pauseRecording,
    RESUME_RECORDING: resumeRecording,
    STOP_RECORDING: stopRecording,
    SAVE: (m) => saveRecording(m.format),
    DISCARD_RECORDING: discardRecording,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target === 'offscreen') return false;

    if (message.type === 'CAPTURE_ENDED') {
        // The tab was closed or navigated to a page that cannot be captured.
        getState().then(({ recordingState }) => {
            if (recordingState === 'recording' || recordingState === 'paused') {
                setState({ recordingState: 'finished', pausedAt: Date.now(), notice: { kind: 'info', text: t('noticeTabClosed') } });
            }
        });
        return false;
    }

    const action = ACTIONS[message.type];
    if (!action) return false;
    Promise.resolve(action(message))
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
});
