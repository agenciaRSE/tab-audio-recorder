let recorder;
let audioCtx;
let recordedChunks = [];
let recordedBlob;
let stream;

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'START_RECORDING') {
        startRecording(message.data.streamId);
    }
    else if (message.type === 'STOP_RECORDING') {
        stopRecording();
    }
    else if (message.type === 'SAVE_WEBM') {
        handleSaveWebM();
    }
    else if (message.type === 'SAVE_MP3') {
        handleSaveMp3();
    }
});

async function startRecording(streamId) {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            },
            video: false
        });

        // AudioContext mostly for playback routing, not recording
        audioCtx = new AudioContext(); // Default rate is fine for now
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(audioCtx.destination); // Keep it audible

        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        recordedChunks = [];
        recordedBlob = null;

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        recorder.onstop = () => {
            recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });
            // Cleanup streams immediately to stop "red dot", but keep blob in memory
            stream.getTracks().forEach(t => t.stop());
            if (audioCtx.state !== 'closed') audioCtx.close();
        };

        recorder.start();
    } catch (error) {
        console.error('Error starting recording:', error);
    }
}

function stopRecording() {
    if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
    }
}

function handleSaveWebM() {
    if (!recordedBlob) return;

    // Convert to Data URL
    const reader = new FileReader();
    reader.readAsDataURL(recordedBlob);
    reader.onloadend = () => {
        chrome.runtime.sendMessage({
            type: 'DOWNLOAD_DATA',
            url: reader.result,
            extension: 'webm'
        });
    };
}

async function handleSaveMp3() {
    if (!recordedBlob) return;

    try {
        // 1. Decode WebM to AudioBuffer
        const arrayBuffer = await recordedBlob.arrayBuffer();
        // New context for decoding
        const offlineCtx = new AudioContext({ sampleRate: 44100 });
        const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

        // 2. Encode to MP3 using lamejs
        const mp3Encoder = new lamejs.Mp3Encoder(1, 44100, 128); // Force Mono for simplicity
        const samples = audioBuffer.getChannelData(0); // Take first channel
        const sampleBlockSize = 1152;
        const mp3Data = [];

        // Convert Float32 to Int16
        const data16 = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            data16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Encode blocks
        for (let i = 0; i < data16.length; i += sampleBlockSize) {
            const chunk = data16.subarray(i, i + sampleBlockSize);
            const mp3buf = mp3Encoder.encodeBuffer(chunk);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }

        // Flush
        const mp3buf = mp3Encoder.flush();
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }

        const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });

        // 3. Download
        const reader = new FileReader();
        reader.readAsDataURL(mp3Blob);
        reader.onloadend = () => {
            chrome.runtime.sendMessage({
                type: 'DOWNLOAD_DATA',
                url: reader.result,
                extension: 'mp3'
            });
            offlineCtx.close();
        };

    } catch (error) {
        console.error("MP3 Conversion failed:", error);
    }
}
