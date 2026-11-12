# Buffer Clip — Chrome extension

Records the current tab (or a dragged area), captures mouse, click, key and scroll
events, and opens the recording in the Buffer Clip editor.

## Build and load

```bash
pnpm --filter @buffer-clip/extension build          # targets http://localhost:3000
APP_ORIGIN=https://your-app.example pnpm --filter @buffer-clip/extension build
```

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose `apps/extension/dist`.
3. Pin Buffer Clip from the puzzle-piece menu.
4. Start the web app (`pnpm dev`), open any regular website and click the Buffer Clip icon.

After rebuilding, press the reload icon on the extension card.

## Manual QA checklist

- [ ] Full tab: Record → 3-2-1 countdown → badge timer counts → interact (move, click, type, scroll) → Stop in popup → editor opens with the recording, zooms on the clicks, idle trimmed.
- [ ] Select area: drag a rectangle (live W × H) → Record area → countdown inside the area → stop → editor preview is cropped to the area.
- [ ] Esc during area select cancels; nothing is recorded; popup returns to idle.
- [ ] `Alt+Shift+S` stops the recording.
- [ ] Closing the recorded tab stops and opens the partial recording.
- [ ] Tab audio on: page audio stays audible while recording.
- [ ] Typing in a password field records `•` keys only (check `events` in the editor's IndexedDB entry).
- [ ] `chrome://extensions` and the Chrome Web Store show "This page can't be recorded".
- [ ] With the web app stopped, stop a recording → it appears under "Unsent recordings" in the popup → start the app → Open → editor receives it and the popup list empties.
- [ ] The overlay and countdown never appear in the recorded video.
