"""
ARA Evaluation microservice — a tiny, dependency-free HTTP wrapper around the
Agent Readiness Analyzer (the `ara` package, vendored as a git submodule at
../ara). Uses only the Python standard library so it runs on any Python 3.10+
(including 3.14) with no pip install and no build steps.

    POST /evaluate   { "spec": "<agent readme / spec text>" }
      -> { "card": {...}, "reasons": [...], "guard": {...} }   (ARA readiness report)
    GET  /health

ARA runs in its offline heuristic mode by default (no API keys). Add Azure
OpenAI env vars (see ../ara/.env.example) to enable the LLM-as-judge path.

Run:  python app.py [port]      (default port 8200)
"""
import json
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# Make the vendored ARA package importable.
ARA_ROOT = Path(__file__).resolve().parent.parent / "ara"
sys.path.insert(0, str(ARA_ROOT))

from ara.config import Settings  # noqa: E402
from ara.graph import analyze  # noqa: E402


def _json_default(o):
    # Best-effort serialisation for dataclasses / objects in the report.
    if hasattr(o, "__dict__"):
        return o.__dict__
    return str(o)


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload, default=_json_default).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, {"status": "ok", "service": "ara-eval"})
        self._send(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/evaluate":
            return self._send(404, {"error": "Not found"})
        length = int(self.headers.get("Content-Length") or 0)
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return self._send(400, {"error": "Invalid JSON body."})

        spec = str(data.get("spec") or "").strip()
        if not spec:
            return self._send(400, {"error": "A non-empty 'spec' is required."})

        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        try:
            card, reasons, guard = analyze(spec, Settings(), analyzed_at=stamp)
            self._send(200, {"card": card, "reasons": reasons, "guard": guard})
        except Exception as exc:  # noqa: BLE001
            self._send(500, {"error": f"Evaluation failed: {exc}"})

    def log_message(self, *_args):
        pass  # quiet


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8200
    print(f"ARA evaluation service listening on http://127.0.0.1:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
