// Reset state on startup/install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ recordingState: 'idle' });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.set({ recordingState: 'idle' });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_RECORDING') {
        handleStartRecording(message.tabId, sendResponse);
        return true;
    }
    else if (message.type === 'STOP_RECORDING') {
        handleStopRecording(sendResponse);
        return true;
    }
    else if (message.type === 'SAVE_WEBM') {
        sendMessageToOffscreen({ type: 'SAVE_WEBM' });
        chrome.storage.local.set({ recordingState: 'idle' });
        sendResponse({ success: true });
    }
    else if (message.type === 'SAVE_MP3') {
        sendMessageToOffscreen({ type: 'SAVE_MP3' });
        chrome.storage.local.set({ recordingState: 'idle' });
        sendResponse({ success: true });
    }
    else if (message.type === 'DISCARD_RECORDING') {
        chrome.offscreen.closeDocument();
        chrome.storage.local.set({ recordingState: 'idle' });
        sendResponse({ success: true });
    }
    else if (message.type === 'DOWNLOAD_DATA') {
        const ext = message.extension || 'webm';
        chrome.downloads.download({
            url: message.url,
            filename: `recording-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.${ext}`,
            saveAs: true
        }, () => {
            // Close after download is initiated
            chrome.runtime.sendMessage({ type: 'RECORDING_SAVED' });
        });
    }
});

function sendMessageToOffscreen(msg) {
    chrome.runtime.sendMessage({
        target: 'offscreen',
        ...msg
    });
}

async function handleStartRecording(tabId, sendResponse) {
    try {
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
        });

        if (existingContexts.length === 0) {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['USER_MEDIA'],
                justification: 'Recording tab audio'
            });
        }

        const streamId = await chrome.tabCapture.getMediaStreamId({
            targetTabId: tabId
        });

        chrome.runtime.sendMessage({
            type: 'START_RECORDING',
            target: 'offscreen',
            data: { streamId }
        });

        await chrome.storage.local.set({ recordingState: 'recording', startTime: Date.now() });
        chrome.runtime.sendMessage({ type: 'UI_UPDATE', state: 'recording' });
        sendResponse({ success: true });

    } catch (error) {
        console.error('Error starting recording:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function handleStopRecording(sendResponse) {
    try {
        chrome.runtime.sendMessage({
            type: 'STOP_RECORDING',
            target: 'offscreen'
        });

        // Transition to 'finished' state, keep offscreen open for conversion
        await chrome.storage.local.set({ recordingState: 'finished' });
        chrome.runtime.sendMessage({ type: 'UI_UPDATE', state: 'finished' });
        sendResponse({ success: true });

    } catch (error) {
        console.error('Error stopping recording:', error);
        sendResponse({ success: false, error: error.message });
    }
}

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'RECORDING_SAVED') {
        await chrome.offscreen.closeDocument();
    }
});

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-recording') {
        const { recordingState } = await chrome.storage.local.get('recordingState');
        if (!recordingState || recordingState === 'idle' || recordingState === 'finished') {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                handleStartRecording(tab.id, () => { });
            }
        } else if (recordingState === 'recording') {
            handleStopRecording(() => { });
        }
    }
});
