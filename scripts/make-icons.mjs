// Draws Khairiyat's app icons (the word "خیریت" in Nastaliq on green) with headless Chrome
// and saves them as PNG files in public/icons. Run once: node scripts/make-icons.mjs
// (Chrome is used because it renders the Urdu Nastaliq font correctly.)
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const outDir = path.resolve("public/icons");
const chromePath = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && fs.existsSync(p));

// size: image size in px. safe: how much of the image the word may use (maskable icons need padding).
// rounded: corner radius as a share of the size (Android crops "maskable" icons itself, so those are square).
const icons = [
  { file: "icon-192.png", size: 192, safe: 0.62, rounded: 0.22 },
  { file: "icon-512.png", size: 512, safe: 0.62, rounded: 0.22 },
  { file: "maskable-512.png", size: 512, safe: 0.58, rounded: 0 },
  { file: "apple-touch-icon.png", size: 180, safe: 0.62, rounded: 0 },
];

const html = (size, safe, rounded) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@700&display=block" rel="stylesheet">
<style>
  html, body { margin: 0; width: ${size}px; height: ${size}px; background: transparent; }
  .icon { width: ${size}px; height: ${size}px; border-radius: ${rounded * size}px;
    background: radial-gradient(circle at 30% 25%, #10b981, #047857 70%);
    display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .word { font-family: 'Noto Nastaliq Urdu', serif; font-weight: 700; color: #fff;
    font-size: ${size * safe * 0.42}px; line-height: 1; transform: translateY(-${size * 0.06}px);
    text-shadow: 0 ${size * 0.01}px ${size * 0.03}px rgba(0,0,0,.25); }
</style></head><body><div class="icon"><div class="word">خیریت</div></div></body></html>`;

const port = 9800 + Math.floor(Math.random() * 100);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "khairiyat-icons-"));
const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"]);
let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await new Promise((r) => setTimeout(r, 300));
  try {
    wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page")?.webSocketDebuggerUrl;
  } catch {}
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Page.enable");
for (const icon of icons) {
  await send("Emulation.setDeviceMetricsOverride", { width: icon.size, height: icon.size, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } }); // transparent corners
  await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html(icon.size, icon.safe, icon.rounded)) });
  await new Promise((r) => setTimeout(r, 3000)); // let the web font load
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(outDir, icon.file), Buffer.from(shot.data, "base64"));
  console.log("saved", icon.file);
}
ws.close();
chrome.kill();
