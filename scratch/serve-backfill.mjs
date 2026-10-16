import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const browserExe = chromePaths.find(p => fs.existsSync(p));
if (!browserExe) {
  console.error("No Chrome or Edge found!");
  process.exit(1);
}

const tmpUserData = path.join(os.tmpdir(), "backfill-chrome-user-data-" + Date.now());
fs.mkdirSync(tmpUserData, { recursive: true });

let browserProcess = null;

const server = http.createServer((req, res) => {
  if (req.url === "/backfill.html" || req.url === "/") {
    console.log("[HTTP] Serving backfill.html to browser...");
    const html = fs.readFileSync(path.join(__dirname, "backfill.html"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } else if (req.url === "/supabase.js") {
    const supabasePath = path.resolve(__dirname, "../node_modules/@supabase/supabase-js/dist/umd/supabase.js");
    const js = fs.readFileSync(supabasePath, "utf-8");
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(js);
  } else if (req.url === "/log" && req.method === "POST") {
    let msg = "";
    req.on("data", chunk => msg += chunk);
    req.on("end", () => {
      console.log("[BROWSER]", msg);
      res.writeHead(200);
      res.end("ok");
    });
  } else if (req.url === "/done" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));

      try {
        const payload = JSON.parse(body);
        console.log("\n========== BACKFILL RESULT ==========");
        console.log("Success:", payload.success);
        console.log(payload.log);
        console.log("=====================================\n");
      } catch (e) {
        console.log("Received /done:", body);
      }

      if (browserProcess) {
        browserProcess.kill();
      }
      setTimeout(() => {
        try { fs.rmSync(tmpUserData, { recursive: true, force: true }); } catch {}
        server.close(() => {
          console.log("Backfill completed and server closed.");
          process.exit(0);
        });
      }, 500);
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(3456, () => {
  console.log(`Server listening on http://localhost:3456/backfill.html`);
  console.log(`Launching headless browser: ${browserExe}`);

  browserProcess = spawn(browserExe, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--user-data-dir=${tmpUserData}`,
    "http://localhost:3456/backfill.html"
  ]);

  browserProcess.on("exit", (code) => {
    console.log(`Browser process exited with code ${code}`);
  });
});
