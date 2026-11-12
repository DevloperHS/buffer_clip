# Buffer Clip — first peek demo

`buffer-clip-first-peek.mp4` is a 40-second launch video for X: 1920×1080, 60fps, H.264 + AAC.

It shows the whole loop on the real app:
1. Open Buffer Clip.
2. Record a session.
3. The recording lands in the editor with the magic-open intro.
4. Auto-zooms play back.
5. Trim and split on the frame timeline.
6. Draw a zoom area.
7. Pick abstract backgrounds.
8. Switch aspect ratios.
9. Export in 4K at 60fps.

Captions are white pills with black text, in the Buffer Clip style.

## How it's made

| Step | File | What it does |
|---|---|---|
| Capture | `capture.mjs` | Drives the real app in Chromium, described below. |
| Edit | `storyboard.js` | The cut: scene timing, speed, camera zoom and focus, and caption text. |
| Compose | `compose.js` / `compose.html` | Draws each output frame on a canvas, described below. |
| Music | `music.js` | An original 120 BPM track, described below. |
| Render | `render.mjs` | Runs the compositor and pipes the frames and music into ffmpeg. |

**What the capture does**
- **Seeds the library:** it makes recordings with the app's own demo recorder.
- **Real hand-off:** it delivers the hero recording through the real Chrome extension, so the editor opens it exactly as it would a fresh recording.
- **Recording:** it screencasts every frame at 1.5× pixel density and logs the scripted mouse path, clicks and scene marks.

**What each composed frame contains**
- an animated abstract background
- the app as a floating window, with a smooth camera that zooms in and follows the cursor
- a macOS cursor with click ripples
- captions
- the hook and outro cards

The recording scene is a composed browser window. It plays the raw session that was captured, with Buffer Clip's countdown and REC badge drawn on top. Chrome's extension popup and tab capture can't be filmed headlessly.

**The music** is synthesised in code with Web Audio:
- **Groove:** Fmaj7 · G · Em7 · Am7, with a riser and a drop when the editor opens at 8.0s.
- **Click ticks:** soft ticks on every on-screen click.

It uses no samples or licensed material, so it's free to post anywhere.

## Rebuild it

Start the web app and build the extension first:

```bash
pnpm dev
```

```bash
pnpm --filter @buffer-clip/extension build
```

Then capture and render:

```bash
DPR=1.5 QUALITY=90 node demo/capture.mjs
```

```bash
node demo/render.mjs
```

Capture takes about 3 minutes and render about 5. Intermediate files go to `demo/build/` (git-ignored).

To check framing quickly, render stills at chosen seconds into `demo/build/stills/`:

```bash
node demo/render.mjs --stills 3,9.5,21,27.5,35
```

To change the cut, edit `storyboard.js`; no re-capture is needed. Re-capture only when the app's UI changes.
