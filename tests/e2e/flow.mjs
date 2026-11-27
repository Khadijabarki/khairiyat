// End-to-end test of the whole family flow in a real (headless) Chrome:
// sign up -> add a parent -> QR code and private link -> parent's talk page ->
// a finished call -> dashboard -> edit, plus security checks (another family is
// blocked, sign out, generic login errors, demo parents are read-only).
//
// Run:  npm run test:e2e                                   (against http://localhost:3000)
//       BASE_URL=https://khairiyat.vercel.app npm run test:e2e
//
// Needs Chrome installed (or CHROME_PATH), and .env.local with SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY: the test creates two throwaway accounts and deletes them at the end.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const slow = !base.includes("localhost"); // the live site needs a little more time per page
const PAGE_WAIT = slow ? 6000 : 3500;
const ACTION_WAIT = slow ? 7000 : 5000;

const admin = createClient(process.env.SUPABASE_URL.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), {
  auth: { persistSession: false },
});

const results = [];
const ok = (name, pass, extra = "") => {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};

// ---------- A tiny Chrome driver over the DevTools Protocol (no extra packages) ----------
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error("Chrome not found. Set CHROME_PATH.");
  return found;
}

const port = 9400 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "khairiyat-e2e-"));
const chrome = spawn(findChrome(), ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"]);

let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await new Promise((r) => setTimeout(r, 300));
  try {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    wsUrl = targets.find((t) => t.type === "page")?.webSocketDebuggerUrl;
  } catch {}
}
const ws = new WebSocket(wsUrl); // Node's built-in WebSocket
await new Promise((resolve) => ws.addEventListener("open", resolve));
let nextId = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (pending.has(msg.id)) {
    pending.get(msg.id)(msg.result ?? msg.error);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }))?.result?.value;
const go = async (p) => {
  await send("Page.navigate", { url: base + p });
  await wait(PAGE_WAIT);
};
const url = () => evaluate("location.pathname + location.search");
const text = () => evaluate("document.body.innerText");
// Sets an input's value the way React notices it.
const fill = (selector, value) =>
  evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
const clickButton = async (label) => {
  await evaluate(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes(${JSON.stringify(label)}))?.click()`);
  await wait(ACTION_WAIT);
};
const submit = async () => {
  await evaluate(`document.querySelector("form button[type=submit]").click()`);
  await wait(ACTION_WAIT);
};
const notFoundShown = async () => {
  const t = (await text()).toLowerCase();
  return t.includes("404") || t.includes("could not be found");
};

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1800, deviceScaleFactor: 1, mobile: false });

// ---------- The test ----------
const stamp = Date.now();
const userA = { email: `e2e-a-${stamp}@khairiyat.app`, password: `Test-${stamp}-a!` };
const userB = { email: `e2e-b-${stamp}@khairiyat.app`, password: `Test-${stamp}-b!` };
console.log(`Testing ${base}\n`);

try {
  await go("/family");
  ok("signed-out visitor is sent to /login", (await url()).startsWith("/login"));

  await go("/signup");
  await fill("#email", userA.email);
  await fill("#password", userA.password);
  await submit();
  ok("sign up lands on the family page", (await url()) === "/family", await url());
  ok("new family sees the empty state", (await text()).includes("Add Your First Family Member"));
  ok("family can turn on alerts for this device", (await text()).includes("Alerts on This Device") && (await text()).includes("Turn on alerts"));
  const session = (await send("Network.getAllCookies")).cookies.filter((c) => c.name.startsWith("sb-"));
  ok("sign-in cookie is hidden from page scripts (httpOnly)", session.length > 0 && session.every((c) => c.httpOnly));
  ok("page scripts can't read the sign-in cookie", !(await evaluate("document.cookie")).includes("sb-"));

  await go("/family/new");
  await fill("#name", "Test Ammi Begum");
  await fill("#nickname", "Ammi");
  await fill("#nickname_ur", "امی");
  await fill("#checkin_time", "08:30");
  await fill("#child_name", "Khadija");
  await fill("#child_phone", "0300-123 4567");
  await fill("input[name=med_name_0]", "BP ki goli");
  await fill("input[name=med_when_0]", "subah");
  await fill("#topics", "cricket, khana");
  await submit();
  ok("saving without consent shows an error", (await text()).includes("agrees to talk with Khairiyat"));
  ok("the typed values are kept after the error", (await evaluate(`document.querySelector("#name").value`)) === "Test Ammi Begum");
  await evaluate(`document.querySelector("input[name=consent]").click()`);
  await submit();
  await wait(slow ? 4000 : 0);
  const added = await url();
  const parentId = added.split("/")[2]?.split("?")[0];
  ok("parent saved, dashboard opens with a welcome note", added.includes("?added=1") && (await text()).includes("has been added"), added);
  ok("QR code and private link are shown", (await text()).includes("Set Up Ammi") && (await evaluate(`!!document.querySelector("[role=img] svg")`)));
  const talkPath = await evaluate(
    `[...document.querySelectorAll("code")].map((c) => c.textContent).find((t) => t.includes("/talk/"))?.replace(/^https?:\\/\\/[^/]+/, "")`,
  );
  ok("talk link has a long random token", /^\/talk\/[A-Za-z0-9_-]{32}$/.test(talkPath ?? ""));

  await go(talkPath);
  ok("talk page opens with the Urdu greeting", (await text()).includes("السلام علیکم امی"));
  // Streamed pages keep HTTP 200 (Next.js 16) but must show the 404 page, no talk button, and noindex.
  const fakeHtml = await (await fetch(`${base}/talk/abcdefghijklmnopqrstuvwxyz123456`)).text();
  ok("a made-up talk link shows 404 and no talk button", fakeHtml.includes("could not be found") && !fakeHtml.includes("بات کریں") && fakeHtml.includes("noindex"));

  const token = talkPath.split("/")[2];
  const finish = await fetch(`${base}/api/checkin/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      talkToken: token,
      turns: [
        { role: "khairiyat", text: "Assalam o alaikum Ammi!" },
        { role: "ammi", text: "Theek hoon beta, subah BP ki goli le li, neend achi aayi." },
      ],
      alerts: [],
    }),
  });
  ok("finished call is saved", finish.status === 200, String(finish.status));
  const noOrigin = await fetch(`${base}/api/checkin/finish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  ok("API refuses requests from outside our site", noOrigin.status === 403);
  await go(`/family/${parentId}`);
  ok("dashboard shows the new check-in", (await text()).includes("Latest Check-In"));

  await go(`/family/${parentId}/edit`);
  await fill("#nickname", "Ammi Jaan");
  await submit();
  ok("editing saves and returns to the dashboard", (await text()).includes("Ammi Jaan"));

  await send("Network.clearBrowserCookies");
  await go("/signup");
  await fill("#email", userB.email);
  await fill("#password", userB.password);
  await submit();
  await go(`/family/${parentId}`);
  ok("another family gets 'not found' for this parent", await notFoundShown());
  await go(`/family/${parentId}/edit`);
  ok("another family can't open the edit page", await notFoundShown());

  await go("/family");
  await clickButton("Sign out");
  await go("/family");
  ok("after sign out, family pages need sign-in again", (await url()).startsWith("/login"));
  await fill("#email", userA.email);
  await fill("#password", "wrong-password");
  await submit();
  ok("wrong password shows one generic message", (await text()).includes("Email or password is not correct"));
  await fill("#password", userA.password);
  await submit();
  ok("correct password signs in", (await url()) === "/family");

  await send("Network.clearBrowserCookies");
  await go("/login");
  await clickButton("Open the demo");
  ok("'Open the demo' opens the demo family", (await url()) === "/family" && (await text()).includes("Zubaida Begum"));
  ok("the shared demo never sends alerts to anyone", (await text()).includes("Alerts are switched off in the shared demo"));
  await go("/family/ammi/edit");
  ok("demo parents show the read-only note", (await text()).includes("demo parent"));
  await fill("#nickname", "Hacked");
  await submit();
  ok("demo parents can't be changed", (await text()).includes("can't be changed"));
} catch (error) {
  ok("test run finished without crashing", false, error.message);
} finally {
  // Clean up: delete both test accounts (their parents and check-ins go with them, by database cascade).
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  for (const user of [userA, userB]) {
    const found = data?.users.find((u) => u.email === user.email);
    if (found) await admin.auth.admin.deleteUser(found.id);
  }
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed. Test accounts deleted.`);
  ws.close();
  chrome.kill();
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {}
  process.exitCode = passed === results.length ? 0 : 1;
}
