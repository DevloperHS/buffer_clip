# Buffer Clip

Turn screen recordings into polished product demos. You record a tab or an area of it, and Buffer Clip captures your mouse, clicks, keys and scrolls. The editor then turns the recording into a demo with smooth zooms, cuts, trimmed idle time and a styled frame, and exports it as an MP4.

Everything runs locally in the browser. Recordings never leave your machine.

## Features

- **Record:** a Chrome extension records the current tab or a dragged area. It shows a countdown and a live timer, and has a stop shortcut (`Alt+Shift+S`).
- **Auto-polish:** zooms are generated from your clicks and typing, idle stretches are trimmed or sped up, and the cursor movement is smoothed.
- **Timeline:**
  - Clips show frame thumbnails.
  - Trim from either edge and split at the playhead.
  - Sped-up idle sections and cut gaps can be restored with one click.
  - Full undo and redo.
- **Zooms:**
  - Add zooms, move and resize them, and set scale and ease, or make a zoom follow the cursor.
  - **Draw zoom area:** drag a box on the preview to choose exactly what a zoom shows.
- **Style:**
  - Abstract (mesh), gradient and solid backgrounds, plus a gradient editor.
  - Padding, corner radius, shadow and cursor size.
  - Aspect ratios 16:9, 9:16 and 1:1.
- **Export:** MP4 at 1080p or 4K, 30 or 60fps, encoded in the browser with WebCodecs. The export matches the preview frame for frame.
- **Extras:** a ⌘K / Ctrl+K command palette, keyboard shortcuts, light, dark and system themes, and a guided hands-on tutorial ("How to use").

## Repository layout

| Path | What |
|---|---|
| `packages/core` | Engine in pure TypeScript: time mapping, clips, idle detection, zoom suggestions, camera, cursor smoothing and frame rendering. |
| `apps/web` | Next.js app: the projects library and the editor. |
| `apps/extension` | Chrome extension (Manifest V3) that records and hands recordings to the editor. |
| `demo` | Scripts that produce the launch demo video from the real app. |

## Getting started

Requirements: Node 20+, pnpm 9+, and Chrome or Edge.

Install the dependencies:

```bash
pnpm install
```

Start the web app on http://localhost:3000:

```bash
pnpm dev
```

Build the extension:

```bash
pnpm --filter @buffer-clip/extension build
```

Then load the extension:
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose `apps/extension/dist`.
3. Pin Buffer Clip.

Open any website and click the Buffer Clip icon to record. To try the editor without the extension, click **How to use** in the app; it generates a demo recording and starts the guided tour.

To build the extension for a deployed copy of the app instead of localhost:

```bash
APP_ORIGIN=https://your-app.example pnpm --filter @buffer-clip/extension build
```

## Tests

Run the unit tests (core, extension and web):

```bash
pnpm test
```

Run the type check:

```bash
pnpm typecheck
```

Run the end-to-end tests with Playwright (they start the dev server if it isn't running):

```bash
pnpm --filter @buffer-clip/web e2e
```

## License

See [LICENSE](LICENSE).
