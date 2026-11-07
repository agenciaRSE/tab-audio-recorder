# Changelog

## 1.1.0 (2026-11-08)

### New
- Pause and resume a recording.
- REC badge on the toolbar icon while recording (also shows when paused or waiting to be saved).
- Hands-free shortcut: choose to save straight away as MP3 or WebM when you stop with Alt+Shift+U.
- Option to save directly to the Downloads folder without the "Save as" dialog.
- Interface in English and Spanish.
- New icon, drawn for each size (16, 32, 48, 128 px).

### Fixed
- MP3 files were mono and lost the right channel. They are now stereo (192 kbps).
- Pressing the shortcut while a recording was waiting to be saved started a new one and lost the previous recording. It now opens the extension window instead.
- The recording stayed in memory after saving: the offscreen document is now closed when the download finishes.
- Cancelling the "Save as" dialog lost the recording. It is now kept so you can save it again.
- Long recordings could fail to save (they were sent as a data URL through a message). Files are now handed over as a blob URL.
- If recording could not start, the extension stayed in "recording" with no message. It now shows the reason and goes back to idle.
- Closing the recorded tab left the extension stuck in "recording". It now stops and keeps what was recorded.
- The timer went back to 00:00 after an hour. It now shows hours.
- File names used UTC time. They now use your local time.
- Accessibility: status announced to screen readers, visible keyboard focus, sufficient colour contrast, reduced motion respected, shortcut shown as actually configured.

## 1.0 

- First version published on the Chrome Web Store.
