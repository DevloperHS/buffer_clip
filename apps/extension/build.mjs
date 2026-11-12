import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const APP_ORIGIN = (process.env.APP_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
const out = 'dist';
const common = {
  bundle: true,
  target: 'chrome116',
  sourcemap: true,
  logLevel: 'info',
  define: { __APP_ORIGIN__: JSON.stringify(APP_ORIGIN) },
};

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({ ...common, entryPoints: { background: 'src/background.ts' }, outdir: out, format: 'esm' });
await build({
  ...common,
  format: 'iife',
  outdir: out,
  entryPoints: {
    'recorder-content': 'src/content/recorder.ts',
    'bridge-content': 'src/content/bridge.ts',
    offscreen: 'src/offscreen/offscreen.ts',
    popup: 'src/popup/popup.ts',
    'bridge-page': 'src/bridge/bridge-page.ts',
  },
});

for (const file of ['popup.html', 'popup.css', 'offscreen.html', 'bridge.html']) {
  await cp(`static/${file}`, `${out}/${file}`);
}

const manifest = JSON.parse(await readFile('static/manifest.json', 'utf8'));
const match = `${APP_ORIGIN}/*`;
manifest.host_permissions = [match];
manifest.content_scripts[0].matches = [match];
manifest.web_accessible_resources[0].matches = [match];
await writeFile(`${out}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`Built extension for ${APP_ORIGIN} → ${out}/`);
