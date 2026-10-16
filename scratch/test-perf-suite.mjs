import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const chromeExe = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const tmpUserData = path.join(os.tmpdir(), "chrome-perf-" + Date.now());
fs.mkdirSync(tmpUserData, { recursive: true });

async function run() {
  console.log("Starting Chrome with Remote Debugging...");
  const chrome = spawn(chromeExe, [
    "--headless=new",
    "--disable-gpu",
    "--remote-debugging-port=9222",
    `--user-data-dir=${tmpUserData}`,
    "about:blank"
  ]);

  // Wait for remote debugging port to open
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch("http://localhost:9222/json/version");
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch {}
  }

  if (!wsUrl) {
    console.error("Failed to connect to Chrome debugging port!");
    chrome.kill();
    process.exit(1);
  }

  console.log("Connected to Chrome via WebSocket:", wsUrl);
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };

  function send(method, params = {}) {
    const id = msgId++;
    return new Promise(resolve => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Create a new target page
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const pageRes = await fetch("http://localhost:9222/json/list");
  const pages = await pageRes.json();
  const pageInfo = pages.find(p => p.id === targetId);

  const pageWs = new WebSocket(pageInfo.webSocketDebuggerUrl);
  await new Promise(r => pageWs.onopen = r);

  const pagePending = new Map();
  pageWs.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pagePending.has(msg.id)) {
      pagePending.get(msg.id)(msg.result);
      pagePending.delete(msg.id);
    }
  };

  function pageSend(method, params = {}) {
    const id = msgId++;
    return new Promise(resolve => {
      pagePending.set(id, resolve);
      pageWs.send(JSON.stringify({ id, method, params }));
    });
  }

  await pageSend("Page.enable");
  await pageSend("Runtime.enable");

  // 1. Cold Navigation Measurement
  console.log("\n=======================================================");
  console.log("TEST 1: Cold Navigation Performance on /outsoles/mx5");
  console.log("=======================================================");

  await pageSend("Page.navigate", { url: "http://localhost:8081/outsoles/mx5" });
  await new Promise(r => setTimeout(r, 2000));

  const coldMetrics = await pageSend("Runtime.evaluate", {
    expression: `(async () => {
      const navEntry = performance.getEntriesByType('navigation')[0];
      const imgElements = Array.from(document.querySelectorAll('img'));
      const hero = imgElements.find(i => i.classList.contains('aspect-[4/3]'));
      const thumbs = imgElements.filter(i => i.classList.contains('aspect-square'));

      // Measure total long task duration if any
      const longTasks = performance.getEntriesByType('longtask');
      const totalLongTaskDuration = longTasks.reduce((acc, t) => acc + t.duration, 0);

      // Measure image decode time
      const decodeStarts = performance.now();
      await Promise.all(imgElements.map(i => i.decode().catch(() => {})));
      const decodeTime = performance.now() - decodeStarts;

      return {
        domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
        loadComplete: navEntry.loadEventEnd - navEntry.startTime,
        totalLongTaskDuration,
        decodeTime,
        heroSrc: hero ? hero.currentSrc || hero.src : null,
        heroNaturalDimensions: hero ? (hero.naturalWidth + 'x' + hero.naturalHeight) : null,
        thumbCount: thumbs.length,
        thumbSrcs: thumbs.map(t => t.currentSrc || t.src),
        thumbDimensions: thumbs.map(t => t.naturalWidth + 'x' + t.naturalHeight)
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  const cRes = coldMetrics.result.value;
  console.log("Cold Navigation Metrics:");
  console.log("  DOM Content Loaded:   ", Math.round(cRes.domContentLoaded), "ms");
  console.log("  Load Complete:        ", Math.round(cRes.loadComplete), "ms");
  console.log("  Long-Task Jank Delay: ", Math.round(cRes.totalLongTaskDuration), "ms  (Baseline was 1,854 ms)");
  console.log("  Image Decode Time:    ", Math.round(cRes.decodeTime), "ms");
  console.log("  Hero Image Rendered:  ", cRes.heroSrc?.slice(0, 75) + "...");
  console.log("  Hero Decoded Size:    ", cRes.heroNaturalDimensions);
  console.log("  Thumbnails Count:     ", cRes.thumbCount);
  console.log("  Thumb Decoded Sizes:  ", cRes.thumbDimensions.join(", "));

  // 2. Warm Navigation Measurement
  console.log("\n=======================================================");
  console.log("TEST 2: Warm Navigation Performance on /outsoles/mx5");
  console.log("=======================================================");

  await pageSend("Page.navigate", { url: "http://localhost:8081/outsoles/mx5" });
  await new Promise(r => setTimeout(r, 1500));

  const warmMetrics = await pageSend("Runtime.evaluate", {
    expression: `(async () => {
      const navEntry = performance.getEntriesByType('navigation')[0];
      const longTasks = performance.getEntriesByType('longtask');
      const totalLongTaskDuration = longTasks.reduce((acc, t) => acc + t.duration, 0);
      const imgElements = Array.from(document.querySelectorAll('img'));
      const decodeStarts = performance.now();
      await Promise.all(imgElements.map(i => i.decode().catch(() => {})));
      const decodeTime = performance.now() - decodeStarts;

      return {
        domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
        loadComplete: navEntry.loadEventEnd - navEntry.startTime,
        totalLongTaskDuration,
        decodeTime
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  const wRes = warmMetrics.result.value;
  console.log("Warm Navigation Metrics:");
  console.log("  DOM Content Loaded:   ", Math.round(wRes.domContentLoaded), "ms");
  console.log("  Load Complete:        ", Math.round(wRes.loadComplete), "ms");
  console.log("  Long-Task Jank Delay: ", Math.round(wRes.totalLongTaskDuration), "ms  (Baseline was 387 ms)");
  console.log("  Image Decode Time:    ", Math.round(wRes.decodeTime), "ms");

  // 3. Thumbnail Switching & Gallery Interaction Test
  console.log("\n=======================================================");
  console.log("TEST 3: Gallery Interaction & Thumbnail Switching");
  console.log("=======================================================");

  const switchTest = await pageSend("Runtime.evaluate", {
    expression: `(async () => {
      const getHeroSrc = () => {
        const h = Array.from(document.querySelectorAll('img')).find(i => i.classList.contains('aspect-[4/3]'));
        return h ? (h.currentSrc || h.src) : null;
      };

      const initialHero = getHeroSrc();
      const buttons = Array.from(document.querySelectorAll('ul button'));

      if (buttons.length < 2) {
        return { success: false, reason: 'Expected at least 2 thumbnail buttons, found ' + buttons.length };
      }

      // Find the inactive button to click
      const inactiveButton = buttons.find(b => b.getAttribute('aria-pressed') !== 'true');
      if (!inactiveButton) {
        return { success: false, reason: 'Could not find inactive thumbnail button' };
      }

      inactiveButton.click();
      await new Promise(r => setTimeout(r, 400));
      const switchedHero = getHeroSrc();

      const pressedAfter = inactiveButton.getAttribute('aria-pressed');

      return {
        success: initialHero !== switchedHero && pressedAfter === 'true',
        initialHero: initialHero ? initialHero.split('?')[0].split('/').slice(-2).join('/') : null,
        switchedHero: switchedHero ? switchedHero.split('?')[0].split('/').slice(-2).join('/') : null,
        pressedAfter
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log("Thumbnail Switching Result:", switchTest.result.value);

  // 4. Test Navigation to OKF (3 photos)
  console.log("\n=======================================================");
  console.log("TEST 4: Product OKF (3 photos) Verification");
  console.log("=======================================================");

  await pageSend("Page.navigate", { url: "http://localhost:8081/outsoles/okf" });
  await new Promise(r => setTimeout(r, 1500));

  const okfMetrics = await pageSend("Runtime.evaluate", {
    expression: `(() => {
      const imgElements = Array.from(document.querySelectorAll('img'));
      const hero = imgElements.find(i => i.classList.contains('aspect-[4/3]'));
      const thumbs = imgElements.filter(i => i.classList.contains('aspect-square'));
      return {
        title: document.title,
        heroNatural: hero ? (hero.naturalWidth + 'x' + hero.naturalHeight) : null,
        thumbCount: thumbs.length,
        thumbNaturals: thumbs.map(t => t.naturalWidth + 'x' + t.naturalHeight)
      };
    })()`,
    returnByValue: true
  });
  console.log("OKF Page Details:", okfMetrics.result.value);

  // 5. Test Error / Not Found Route
  console.log("\n=======================================================");
  console.log("TEST 5: Not Found Route (/outsoles/non-existent)");
  console.log("=======================================================");
  await pageSend("Page.navigate", { url: "http://localhost:8081/outsoles/non-existent" });
  await new Promise(r => setTimeout(r, 1000));

  const notFoundRes = await pageSend("Runtime.evaluate", {
    expression: `(() => ({
      title: document.title,
      bodyText: document.body.innerText.slice(0, 150)
    }))()`,
    returnByValue: true
  });
  console.log("Not Found Details:", notFoundRes.result.value);

  console.log("\nAll tests completed!");
  chrome.kill();
  try { fs.rmSync(tmpUserData, { recursive: true, force: true }); } catch {}
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
