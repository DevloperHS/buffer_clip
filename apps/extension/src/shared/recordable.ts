export const RESTRICTED_MESSAGE = "This page can't be recorded. Open a regular website, then try again.";

const BLOCKED_PREFIXES = [
  'chrome://', 'edge://', 'about:', 'chrome-extension://', 'view-source:', 'devtools://',
  'https://chromewebstore.google.com', 'https://chrome.google.com/webstore',
];

export function isRecordable(url: string | undefined): boolean {
  if (!url) return false;
  if (BLOCKED_PREFIXES.some((p) => url.startsWith(p))) return false;
  return /^(https?|file):\/\//.test(url);
}
