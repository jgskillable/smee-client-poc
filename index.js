'use strict';

const express = require('express');

const MAX_PAYLOADS = 10;

const app = express();

let requestCount = 0;
const recentPayloads = [];

app.use(express.json());

app.post('/GitHub/webhook', (req, res) => {
  requestCount += 1;

  const entry = {
    receivedAt: new Date().toISOString(),
    headers: {
      'x-github-event': req.headers['x-github-event'] || null,
      'x-github-delivery': req.headers['x-github-delivery'] || null,
    },
    body: req.body,
  };

  recentPayloads.unshift(entry);
  if (recentPayloads.length > MAX_PAYLOADS) {
    recentPayloads.pop();
  }

  res.status(200).json({ ok: true });
});

app.get('/', (req, res) => {
  const payloadsHtml = recentPayloads
    .map(
      (p, i) => `
    <div class="payload">
      <h3>Payload #${requestCount - i} &ndash; ${p.receivedAt}</h3>
      <table>
        <tr><th>Event</th><td>${escHtml(p.headers['x-github-event'] || '(none)')}</td></tr>
        <tr><th>Delivery</th><td>${escHtml(p.headers['x-github-delivery'] || '(none)')}</td></tr>
      </table>
      <pre>${escHtml(JSON.stringify(p.body, null, 2))}</pre>
    </div>`
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GitHub Webhook Dashboard</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; background: #f5f5f5; }
    h1 { color: #333; }
    .stats { background: #fff; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .payload { background: #fff; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    pre { background: #f0f0f0; padding: .75rem; border-radius: 4px; overflow-x: auto; }
    table { border-collapse: collapse; margin: .5rem 0; }
    th, td { text-align: left; padding: .25rem .75rem; border: 1px solid #ddd; }
    th { background: #eee; }
    .empty { color: #888; font-style: italic; }
  </style>
</head>
<body>
  <h1>GitHub Webhook Dashboard</h1>
  <div class="stats">
    <strong>Total webhooks received:</strong> ${requestCount}
    &nbsp;&nbsp;|&nbsp;&nbsp;
    <strong>Showing last:</strong> ${recentPayloads.length} of up to ${MAX_PAYLOADS}
  </div>
  ${recentPayloads.length === 0 ? '<p class="empty">No webhooks received yet.</p>' : payloadsHtml}
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
});

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { app, getRequestCount: () => requestCount, getRecentPayloads: () => recentPayloads };
