"""Receive JPEG screenshots from the local browser automation session."""

from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import json
import re


TARGET = Path(__file__).with_name("page-home-raw.jpg")


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        match = re.fullmatch(r"/frame/(\d{2})", self.path)
        if not match or length < 4 or length > 20_000_000:
            self.send_error(400)
            return
        data = self.rfile.read(length)
        if not data.startswith(b"\xff\xd8"):
            self.send_error(415)
            return
        filename = f"home-frame-{match.group(1)}.jpg"
        Path(__file__).with_name(filename).write_bytes(data)
        self.server.frames.append({"file": filename, "scrollY": float(self.headers["X-Scroll-Y"])})
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def do_GET(self):
        if self.path != "/done":
            self.send_error(404)
            return
        Path(__file__).with_name("home-frames.json").write_text(json.dumps(self.server.frames, indent=2), encoding="utf-8")
        self.server.stop = True
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"done")


server = HTTPServer(("127.0.0.1", 8765), Handler)
server.frames = []
server.stop = False
while not server.stop:
    server.handle_request()
