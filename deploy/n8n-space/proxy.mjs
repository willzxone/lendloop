// The only thing the Space exposes to the internet.
//
// n8n and Mailpit listen on 127.0.0.1 inside the container. This proxy lets
// through exactly three things:
//   POST /webhook/lendloop-notify   Convex -> loan notification workflow
//   GET  /healthz                   n8n health check
//   /mail/...                       Mailpit inbox (Mailpit asks for a password)
// Everything else, including the n8n editor and REST API, gets a 404.
import http from "node:http";
import net from "node:net";

const PORT = Number(process.env.PORT || 7860);
const N8N = { host: "127.0.0.1", port: 5678 };
const MAILPIT = { host: "127.0.0.1", port: 8025 };

const HOME_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>LendLoop automation</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font:15px/1.6 system-ui,sans-serif;max-width:560px;margin:64px auto;padding:0 20px;color:#18181b}
code{background:#f4f4f5;padding:2px 6px;border-radius:6px}</style></head>
<body><h1>LendLoop automation host</h1>
<p>This Space runs the n8n workflows for the LendLoop demo: loan notifications,
daily overdue reminders and failure reporting. Emails are caught by Mailpit
instead of being delivered.</p>
<p>Only the signed webhook <code>/webhook/lendloop-notify</code>, the health check
<code>/healthz</code> and the password-protected inbox <code>/mail/</code> are public.
The n8n editor is not exposed.</p></body></html>`;

/** Returns the upstream for a normalised path, or null when it isn't public. */
function upstreamFor(method, pathname) {
  if (pathname === "/webhook/lendloop-notify") return method === "POST" ? N8N : null;
  if (pathname === "/healthz") return method === "GET" ? N8N : null;
  if (pathname === "/mail" || pathname.startsWith("/mail/")) return MAILPIT;
  return null;
}

function parse(req) {
  // new URL() resolves "..", so "/mail/../rest" can't sneak through to n8n.
  const url = new URL(req.url || "/", "http://proxy.local");
  return { pathname: url.pathname, target: url.pathname + url.search };
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const { pathname, target } = parse(req);
  if (pathname === "/" && (req.method === "GET" || req.method === "HEAD")) {
    return send(res, 200, HOME_PAGE, "text/html; charset=utf-8");
  }
  const upstream = upstreamFor(req.method, pathname);
  if (!upstream) return send(res, 404, "Not found\n");

  const headers = { ...req.headers, "x-forwarded-proto": "https" };
  const proxied = http.request(
    { ...upstream, method: req.method, path: target, headers, timeout: 30_000 },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  proxied.on("timeout", () => proxied.destroy(new Error("upstream timeout")));
  proxied.on("error", () => {
    // n8n takes a minute to boot after the Space wakes up. Convex treats 503
    // as retryable, so a notification sent during boot is retried later.
    if (!res.headersSent) send(res, 503, "Starting up, try again shortly\n");
    else res.destroy();
  });
  // The body is piped untouched: the webhook checks an HMAC over the raw bytes.
  req.pipe(proxied);
});

// Mailpit's inbox uses a websocket for live updates.
server.on("upgrade", (req, socket, head) => {
  const { pathname, target } = parse(req);
  if (upstreamFor("GET", pathname) !== MAILPIT) return socket.destroy();
  const upstream = net.connect(MAILPIT.port, MAILPIT.host, () => {
    let raw = `${req.method} ${target} HTTP/${req.httpVersion}\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    }
    upstream.write(raw + "\r\n");
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`proxy listening on :${PORT}`);
});
