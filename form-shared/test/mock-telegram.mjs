import http from "node:http";
import { writeFileSync, appendFileSync } from "node:fs";
writeFileSync("/tmp/loc/tg.log", "");
http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c));
  req.on("end", () => {
    appendFileSync("/tmp/loc/tg.log", JSON.stringify({ url: req.url.replace(/bot[^/]*/, "bot***"), body: JSON.parse(b || "{}") }) + "\n");
    if (req.url.includes("invalido")) { res.writeHead(401, { "content-type": "application/json" }); return res.end('{"ok":false,"error_code":401}'); }
    res.writeHead(200, { "content-type": "application/json" }); res.end('{"ok":true,"result":{}}');
  });
}).listen(8799);
