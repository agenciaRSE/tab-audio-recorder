document.addEventListener('DOMContentLoaded', async () => {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const finishedOptions = document.getElementById('finished-options');
    const saveWebmBtn = document.getElementById('save-webm-btn');
    const saveMp3Btn = document.getElementById('save-mp3-btn');
    const discardBtn = document.getElementById('discard-btn');

    const statusBadge = document.getElementById('status-badge');
    const timerElement = document.getElementById('timer');
    const statusText = document.getElementById('status-text');

    let timerInterval;

    // Check current status
    const { recordingState, startTime } = await chrome.storage.local.get(['recordingState', 'startTime']);

    updateUI(recordingState || 'idle');
    if (recordingState === 'recording' && startTime) {
        startTimer(startTime);
    }

    // --- Event Listeners ---

    startBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        chrome.runtime.sendMessage({ type: 'START_RECORDING', tabId: tab.id }, (response) => {
            if (response && response.success) {
                updateUI('recording');
                startTimer(Date.now());
            } else {
                console.error('Failed to start:', response?.error);
            }
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
            if (response && response.success) {
                updateUI('finished');
                stopTimer();
            }
        });
    });

    saveWebmBtn.addEventListener('click', () => {
        statusText.textContent = "Saving WebM...";
        chrome.runtime.sendMessage({ type: 'SAVE_WEBM' }, () => {
            updateUI('idle');
        });
    });

    saveMp3Btn.addEventListener('click', () => {
        statusText.textContent = "Converting to MP3... (This may take a moment)";
        saveMp3Btn.disabled = true;
        saveWebmBtn.disabled = true;

        chrome.runtime.sendMessage({ type: 'SAVE_MP3' }, () => {
            // We'll reset to idle when download starts (handled by background message or manually here)
            setTimeout(() => updateUI('idle'), 500);
        });
    });

    discardBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'DISCARD_RECORDING' }, () => {
            updateUI('idle');
        });
    });

    // --- Helper Functions ---

    function updateUI(state) {
        // Reset all visibility
        startBtn.classList.add('hidden');
        stopBtn.classList.add('hidden');
        finishedOptions.classList.add('hidden');
        statusBadge.classList.add('hidden');

        saveMp3Btn.disabled = false;
        saveWebmBtn.disabled = false;

        if (state === 'recording') {
            stopBtn.classList.remove('hidden');
            statusBadge.classList.remove('hidden');
            statusText.textContent = "Recording...";
        } else if (state === 'finished') {
            finishedOptions.classList.remove('hidden');
            finishedOptions.style.display = 'flex'; // override hidden class
            statusText.textContent = "Recording paused. Choose format:";
        } else {
            // Idle
            startBtn.classList.remove('hidden');
            timerElement.textContent = '00:00';
            statusText.textContent = "Capture audio from the current tab.";
        }
    }

    function startTimer(startTime) {
        stopTimer();
        const update = () => {
            const elapsed = Date.now() - startTime;
            const seconds = Math.floor((elapsed / 1000) % 60);
            const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
            timerElement.textContent = `${pad(minutes)}:${pad(seconds)}`;
        };
        update();
        timerInterval = setInterval(update, 1000);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
    }

    function pad(num) {
        return num.toString().padStart(2, '0');
    }

    // --- Link Handling ---
    document.getElementById('link-donate').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://agenciarse.com/stripe' });
    });

    document.getElementById('link-web').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://agenciarse.com' });
    });

    document.getElementById('link-email').addEventListener('click', () => {
        chrome.tabs.create({ url: 'mailto:dev@agenciarse.com' });
    });

    // Listen for state changes from background (e.g. shortcuts)
    chrome.runtime.onMessage.addListener(async (message) => {
        if (message.type === 'UI_UPDATE') {
            updateUI(message.state);
            if (message.state === 'recording') {
                const { startTime } = await chrome.storage.local.get('startTime');
                if (startTime) startTimer(startTime);
            } else {
                stopTimer();
            }
        }
    });
});
