# Chrome Web Store listing: Tab Audio Recorder 1.1.0

Everything below matches what the code does in 1.1.0. If the code changes, update this file, the web page
(agenciarse-web `src/data/extensions.ts`) and `PRIVACY.md` together.

- Package: `dist/tab-audio-recorder-1.1.0.zip` (`python tools/build-zip.py`)
- Graphics: `store-assets/en/` and `store-assets/es/` (4 screenshots 1280x800, small promo tile 440x280, marquee 1400x560)
- Icon 128x128: `icons/icon128.png`
- Category: Tools · Language: English (default) + Spanish
- Privacy policy URL: https://agenciarse.com/en/browser-extensions/tab-audio-recorder/privacy/ (Spanish: https://agenciarse.com/extensiones-navegador/tab-audio-recorder/privacidad/)
- Homepage URL: https://agenciarse.com/en/browser-extensions/tab-audio-recorder/
- Support URL: https://github.com/agenciaRSE/tab-audio-recorder/issues

---

## English

**Summary** (from `_locales/en`, 132 characters max)

Record the audio of the current tab and save it as MP3 or WebM. Everything stays in your browser.

**Description**

Tab Audio Recorder records the sound of one Chrome tab and saves it as an MP3 or WebM file on your computer.

It captures the tab's own audio stream, so your microphone, notification sounds and other apps are not recorded. You keep hearing the tab while it records.

WHAT IT DOES
• Record the current tab with one click or with Alt+Shift+U (Cmd+Shift+U on Mac).
• Pause and resume.
• Save as stereo MP3 (192 kbps) or WebM (Opus).
• Choose where to save each file, or send them straight to your Downloads folder.
• Hands-free: set it to save in MP3 or WebM as soon as you stop with the shortcut.
• A REC badge on the toolbar icon shows when a tab is being recorded.
• If you close the tab, recording stops and what was recorded is kept for you to save.
• Interface in English and Spanish.

PRIVATE BY DESIGN
• No account and no sign-up.
• Recording and MP3 conversion happen in your browser. Nothing is uploaded.
• No analytics, no ads. Free.

GOOD FOR
Online lessons and webinars you want to listen to again, language practice, pronunciation examples, and sound snippets from web tools.

Only record what you have the right to record, and check the platform's terms and the law where you live.

Chrome does not allow recording its own pages (settings, the Web Store, the new tab page). You can change the shortcut in chrome://extensions/shortcuts.

Open source: https://github.com/agenciaRSE/tab-audio-recorder

**What's new in 1.1.0** (if the dashboard asks for it)

Pause and resume, REC badge, hands-free saving with the shortcut, option to save without the "Save as" dialog, Spanish interface and a new icon. MP3 is now stereo, and a recording waiting to be saved is no longer lost if you press the shortcut or cancel the save dialog.

---

## Español

**Resumen** (de `_locales/es`, 132 caracteres como máximo)

Graba el audio de la pestaña actual y guárdalo en MP3 o WebM. Todo se queda en tu navegador.

**Descripción**

Tab Audio Recorder graba el sonido de una pestaña de Chrome y lo guarda en un archivo MP3 o WebM en tu ordenador.

Capta el audio de la propia pestaña, así que no se graban tu micrófono, los sonidos de notificaciones ni otras aplicaciones. Mientras graba, sigues oyendo la pestaña.

QUÉ HACE
• Graba la pestaña actual con un clic o con Alt+Mayús+U (Cmd+Mayús+U en Mac).
• Pausa y reanuda.
• Guarda en MP3 estéreo (192 kbps) o en WebM (Opus).
• Elige dónde guardar cada archivo o mándalos directamente a Descargas.
• Sin manos: configúrala para que guarde en MP3 o WebM en cuanto pares con el atajo.
• Un distintivo REC en el icono de la barra avisa de que se está grabando una pestaña.
• Si cierras la pestaña, la grabación se para y lo grabado se conserva para que lo guardes.
• Interfaz en español e inglés.

PRIVADA DESDE EL DISEÑO
• Sin cuenta ni registro.
• La grabación y la conversión a MP3 se hacen en tu navegador. No se sube nada.
• Sin analítica ni anuncios. Gratis.

PARA QUÉ SE USA
Clases online y webinars que quieres volver a escuchar, práctica de idiomas, ejemplos de pronunciación y fragmentos de sonido de herramientas web.

Graba solo lo que tengas derecho a grabar y revisa las condiciones de la plataforma y la ley de tu país.

Chrome no deja grabar sus propias páginas (ajustes, la Web Store, la página de nueva pestaña). El atajo se cambia en chrome://extensions/shortcuts.

Código abierto: https://github.com/agenciaRSE/tab-audio-recorder

---

## Privacy practices tab

**Single purpose**

Record the audio of the browser tab the user chooses and save it as an MP3 or WebM file on the user's computer.

**Permission justifications**

- `tabCapture`: Captures the audio of the tab the user starts recording (from the toolbar button or the keyboard shortcut). No other tab is captured.
- `offscreen`: Runs the MediaRecorder and the MP3 conversion in an offscreen document, because Manifest V3 service workers cannot use getUserMedia or Web Audio.
- `downloads`: Saves the finished recording as a file, with or without the "Save as" dialog depending on the user's setting.
- `storage`: Stores the user's two settings and the recording state (recording, paused, stopped, start time) locally, so the popup and the badge stay in sync.

**Remote code**: No, I am not using remote code. (`lame.min.js` is bundled in the package.)

**Data usage**: the extension does not collect or transmit any of the listed data types. Tick none.
Certify: not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used to determine creditworthiness or for lending.
