"""Receive the two 1920 px browser screenshots for neo icon annotation."""

from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
NAMES = {"/open": "neo-home-open.jpg", "/closed": "neo-home-closed.jpg"}


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path not in NAMES:
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        if length < 4 or length > 20_000_000:
            self.send_error(400)
            return
        data = self.rfile.read(length)
        if not (data.startswith(b"\xff\xd8") and data.endswith(b"\xff\xd9")):
            self.send_error(415)
            return
        (ROOT / NAMES[self.path]).write_bytes(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


server = HTTPServer(("127.0.0.1", 8766), Handler)
for _ in range(2):
    server.handle_request()
