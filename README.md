<div align="center">

<img src="icons/icon128.png" width="88" alt="">

# Tab Audio Recorder

**Record the audio of any Chrome tab and save it as MP3 or WebM.**
A free Chrome extension that captures only the sound of the tab you choose: no microphone, no notifications, no account, nothing uploaded.

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Add_to_Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/tab-audio-recorder/fhbiepooinheoiehbneophblkkcombfa)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge)](manifest.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-a855f7?style=for-the-badge)](LICENSE)

<img src="store-assets/en/marquee-1400x560.png" width="100%" alt="Tab Audio Recorder: the extension window recording a tab, with a 12:48 timer and Pause and Stop buttons">

</div>

## ✨ Features

- 🎧 **Only the tab's sound.** It records the tab's audio stream directly, so there is no room noise, no microphone and no system sounds. You keep hearing the tab while it records.
- 💾 **MP3 or WebM.** Stereo MP3 (192 kbps) for any player, or WebM (Opus) for an instant save.
- ⏸️ **Pause and resume.**
- ⌨️ **Keyboard shortcut** <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd> (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd> on macOS) to start and stop. Optionally, save straight away in your favourite format when you stop.
- 🔴 **REC badge** on the toolbar icon while a tab is being recorded.
- 📁 **Ask where to save**, or send every file straight to your Downloads folder.
- 🌍 English and Spanish.
- 🔒 **Private.** No account, no analytics, no network requests. See [PRIVACY.md](PRIVACY.md).

<table>
  <tr>
    <td width="50%"><img src="store-assets/en/screenshot-2-formats-1280x800.png" alt="After stopping, the window offers Save as MP3, Save as WebM and Discard recording"></td>
    <td width="50%"><img src="store-assets/en/screenshot-3-shortcut-1280x800.png" alt="Settings: when you stop with the shortcut, save as MP3 straight away; ask where to save each file"></td>
  </tr>
</table>

## 🚀 How to use it

1. Open the tab with the audio you want: a course, a webinar, a video.
2. Click the extension icon and **Record this tab**, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd>.
3. Pause if you need to. Stop with the same button or shortcut.
4. Choose **Save as MP3** or **Save as WebM**. Or, in Settings, choose to save automatically when you stop with the shortcut.

Change the shortcut in `chrome://extensions/shortcuts`. Chrome does not allow recording its own pages (settings, the Web Store, new tab).

## 🛠️ Run from source

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.

Build the Chrome Web Store package (validates the manifest, locales and files):

```sh
python tools/build-zip.py
```

Store graphics are rendered from `store-assets/src/` with `sh store-assets/src/render.sh`.

## 🧩 How it works

- `background.js`: service worker. Keeps the state (`idle → recording ⇄ paused → finished → saving`), the badge, the shortcut and the downloads.
- `offscreen.js`: offscreen document that holds the tab stream and the `MediaRecorder`, and converts to MP3 with lamejs. Service workers cannot use `getUserMedia`.
- `popup.html` / `popup.js`: the window. It only renders the state stored in `chrome.storage.local`.

## 📄 License

MIT, see [LICENSE](LICENSE). `lame.min.js` is LGPL-3.0, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Made by [AGENCIA RSE](https://agenciarse.com).
