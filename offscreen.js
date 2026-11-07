// Tab Audio Recorder: offscreen document.
// Holds the tab's media stream and the MediaRecorder, and encodes the result to WebM or MP3.

let stream;
let audioCtx;
let recorder;
let chunks = [];
let recordedBlob = null;
let stopped = null; // Promise resolved when the recorder has flushed its last chunk.
let fileUrl = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return false;
    const handler = HANDLERS[message.type];
    if (!handler) return false;
    Promise.resolve(handler(message))
        .then((data) => sendResponse({ ok: true, ...data }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
});

const HANDLERS = {
    START_RECORDING: (m) => startRecording(m.streamId),
    PAUSE_RECORDING: () => { if (recorder?.state === 'recording') recorder.pause(); },
    RESUME_RECORDING: () => { if (recorder?.state === 'paused') recorder.resume(); },
    STOP_RECORDING: stopRecording,
    ENCODE: (m) => encode(m.format),
};

async function startRecording(streamId) {
    stream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
        video: false,
    });

    // Capturing a tab mutes it; route the stream back to the speakers so the user keeps hearing it.
    audioCtx = new AudioContext();
    audioCtx.createMediaStreamSource(stream).connect(audioCtx.destination);

    // The tab was closed or navigated to a page that cannot be captured.
    stream.getAudioTracks()[0].addEventListener('ended', async () => {
        await stopRecording();
        chrome.runtime.sendMessage({ type: 'CAPTURE_ENDED' });
    });

    chunks = [];
    recordedBlob = null;
    recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    stopped = new Promise((resolve) => {
        recorder.onstop = () => {
            recordedBlob = new Blob(chunks, { type: 'audio/webm' });
            chunks = [];
            releaseCapture();
            resolve();
        };
    });
    // No timeslice: with it Chrome writes a WebM without a readable duration.
    recorder.start();
}

async function stopRecording() {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    if (stopped) await stopped;
}

// Stop the capture (removes Chrome's "sharing this tab" indicator) but keep the blob.
function releaseCapture() {
    stream?.getTracks().forEach((track) => track.stop());
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
}

async function encode(format) {
    if (!recordedBlob) throw new Error('No recording in memory');
    const blob = format === 'mp3' ? await toMp3(recordedBlob) : recordedBlob;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    // A blob URL instead of a data URL: no size limit on runtime messages, no base64 copy.
    // It stays valid until the service worker closes this document after the download.
    fileUrl = URL.createObjectURL(blob);
    return { url: fileUrl };
}

async function toMp3(webm) {
    const decodeCtx = new AudioContext();
    let audio;
    try {
        audio = await decodeCtx.decodeAudioData(await webm.arrayBuffer());
    } finally {
        decodeCtx.close();
    }

    const channels = Math.min(audio.numberOfChannels, 2);
    const encoder = new lamejs.Mp3Encoder(channels, audio.sampleRate, channels === 2 ? 192 : 128);
    const left = audio.getChannelData(0);
    const right = channels === 2 ? audio.getChannelData(1) : null;
    const BLOCK = 1152 * 20;
    const parts = [];

    for (let i = 0; i < left.length; i += BLOCK) {
        const l = toInt16(left.subarray(i, i + BLOCK));
        const buf = right ? encoder.encodeBuffer(l, toInt16(right.subarray(i, i + BLOCK))) : encoder.encodeBuffer(l);
        if (buf.length) parts.push(buf);
    }
    const tail = encoder.flush();
    if (tail.length) parts.push(tail);
    return new Blob(parts, { type: 'audio/mpeg' });
}

function toInt16(floats) {
    const out = new Int16Array(floats.length);
    for (let i = 0; i < floats.length; i++) {
        const s = Math.max(-1, Math.min(1, floats[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
}
