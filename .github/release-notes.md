## 🎬 Buffer Clip: early preview

Record a browser tab, and Buffer Clip turns it into a polished product demo with smooth zooms on your clicks, idle time trimmed, a styled background and a crisp MP4 export.

> [!IMPORTANT]
> **Buffer Clip has two parts that work together:**
> 1. **The extension** (the zip below) records your tab.
> 2. **The editor** is a web app that runs on your own computer at `http://localhost:3000`.
>
> When you stop a recording, it **opens in the editor at `http://localhost:3000`**, so the editor must be running first.

### 1️⃣ Start the editor on your computer

You'll need [Node.js](https://nodejs.org) 20 or newer, and pnpm (after installing Node.js, run `npm install -g pnpm`).

```bash
git clone https://github.com/DevloperHS/buffer_clip.git
cd buffer_clip
pnpm install
pnpm dev
```

Leave that window open. The editor is now running at http://localhost:3000.

### 2️⃣ Install the extension

1. Download **`buffer-clip-extension-….zip`** from the **Assets** list below.
2. Unzip it. You'll get a folder with a `manifest.json` file inside.
3. In Chrome or Edge, open `chrome://extensions` (`edge://extensions` in Edge).
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked** and choose the unzipped folder.
6. Click the 🧩 puzzle icon in the toolbar and pin **Buffer Clip**.

### 3️⃣ Record

1. Open any website and click the **Buffer Clip** icon.
2. Choose **Full tab** or **Select area**, and turn on **tab audio** or the **microphone** if you want sound.
3. Click the record button. After a 3-2-1 countdown, use the page as usual.
4. Click **Stop recording** in the popup (or press `Alt+Shift+S`).

The recording opens in the editor at http://localhost:3000, already polished. Adjust anything, then click **Export**.

> [!TIP]
> Forgot to start the editor? Your recording isn't lost. It waits in the extension popup under **Unsent recordings**. Start the editor (`pnpm dev`), then click **Open**.

### Known limits

- Works in **Chrome and Edge** only.
- Projects are saved **in your browser**, so they don't sync between browsers or computers.
- The editor must run on **port 3000**; the extension only talks to `http://localhost:3000`.
- Not in the Chrome Web Store yet: install it with **Load unpacked** as above.
- Microphone recording is new and hasn't been widely tested yet.

Found a problem? [Report a bug](https://github.com/DevloperHS/buffer_clip/issues/new/choose). Every report helps.

Buffer Clip is free for personal and non-commercial use under the [PolyForm Noncommercial License 1.0.0](https://github.com/DevloperHS/buffer_clip/blob/main/LICENSE).
