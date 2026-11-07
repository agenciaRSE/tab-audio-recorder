# Tab Audio Recorder: privacy policy

*Last updated: 8 November 2026 (version 1.1.0)*

Tab Audio Recorder is a Chrome extension by AGENCIA RSE that records the audio of a browser tab and saves it as an MP3 or WebM file. This policy explains what data it uses and where that data stays.

## Summary

- We collect no data: the extension sends nothing to AGENCIA RSE or to anyone else.
- No accounts, analytics, advertising or cookies.
- The audio is recorded, converted and saved on your computer.

## What the extension uses and why

- **The audio of the tab you choose to record**, only while you are recording it. It is kept in your browser's memory until you save it or discard it, then released. It is never uploaded.
- **The files you save**, written through Chrome's downloads to the folder you pick (or to your Downloads folder if you turn off "Ask where to save each file").
- **Your settings** (what to do when you stop with the shortcut, and whether to ask where to save) and **the recording state** (whether it is recording, when it started, and the last status message), stored in the extension's local storage (`chrome.storage.local`).

## Who it is shared with

Nobody. The extension makes no network requests. The links in its window (Donate, AGENCIA RSE, Report a bug) only open a page or your email app when you click them.

## Permissions

- `tabCapture`: record the audio of the tab you start recording, and nothing else.
- `offscreen`: run the recorder and the MP3 conversion in a hidden extension page, because Chrome does not allow it in the background script.
- `downloads`: save the recording as a file.
- `storage`: remember your settings and the recording state.

## Deleting your data

Discard a recording from the extension window, or close the browser: unsaved audio only lives in memory. Uninstalling the extension deletes its settings. Saved files are yours and stay wherever you saved them.

## Changes and contact

If a future version ever needs to send data, this policy will be updated first and the feature will stay off until you turn it on. Questions: dev@agenciarse.com.
