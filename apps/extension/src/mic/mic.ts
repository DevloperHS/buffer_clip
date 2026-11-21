// Extension page that asks for microphone access once. The offscreen recorder can't show
// permission prompts itself, but it can use the microphone once the extension has been granted it.
const title = document.getElementById('title') as HTMLElement;
const msg = document.getElementById('msg') as HTMLElement;

(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    await chrome.storage.local.set({ mic: true });
    title.textContent = 'Microphone ready';
    msg.textContent = 'Your voice will be recorded with the tab. You can close this page and start recording.';
    setTimeout(() => window.close(), 1600);
  } catch {
    await chrome.storage.local.set({ mic: false });
    title.textContent = 'Microphone blocked';
    msg.textContent = 'Allow microphone access for Buffer Clip in Chrome\'s site settings, then turn the microphone on again.';
  }
})();
