"""
Simple local server for the bilingual education demo.

What this file does:
1) Serves the frontend files (index.html, app.js, styles.css)
2) Provides backend API routes:
   - POST /api/generate
   - POST /api/translate-blocks

Run:
    python server.py
"""

from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict
from urllib.parse import urlparse

from ai_client import generate_learning_support, translate_document_blocks

PROJECT_DIR = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = int(os.getenv("PORT", "4173"))


class DemoHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(PROJECT_DIR), **kwargs)

    def do_POST(self) -> None:
        route = urlparse(self.path).path.rstrip("/")
        if not route:
            route = "/"
        if route not in {"/api/generate", "/api/translate-blocks"}:
            self.send_json(404, {"error": "Not found"})
            return

        payload = self.read_json_body()
        if payload is None:
            self.send_json(400, {"error": "Invalid JSON body."})
            return

        if route == "/api/translate-blocks":
            self.handle_translate_blocks(payload)
            return

        source_text = str(payload.get("sourceText", "")).strip()
        lesson_title = str(payload.get("lessonTitle", "Untitled Lesson")).strip() or "Untitled Lesson"
        target_language = str(payload.get("targetLanguage", "Chinese")).strip() or "Chinese"
        mode = str(payload.get("mode", "teacher")).strip().lower()
        mode = "teacher" if mode != "student" else "student"
        quiz_settings = payload.get("quizSettings", {})

        if not source_text:
            self.send_json(400, {"error": "sourceText is required."})
            return

        result, meta = generate_learning_support(
            lesson_title=lesson_title,
            source_text=source_text,
            target_language=target_language,
            mode=mode,
            quiz_settings=quiz_settings,
        )
        response = {**result, "meta": meta}
        self.send_json(200, response)

    def handle_translate_blocks(self, payload: Dict[str, Any]) -> None:
        blocks = payload.get("blocks", [])
        target_language = str(payload.get("targetLanguage", "Chinese")).strip() or "Chinese"
        mode = str(payload.get("mode", "teacher")).strip().lower()
        mode = "teacher" if mode != "student" else "student"
        preserve_formulas = bool(payload.get("preserveFormulas", True))

        if not isinstance(blocks, list) or len(blocks) == 0:
            self.send_json(400, {"error": "blocks must be a non-empty array."})
            return

        translations, meta = translate_document_blocks(
            blocks=blocks,
            target_language=target_language,
            mode=mode,
            preserve_formulas=preserve_formulas,
        )
        self.send_json(200, {"translations": translations, "meta": meta})

    def read_json_body(self) -> Dict[str, Any] | None:
        length_header = self.headers.get("Content-Length")
        if not length_header:
            return {}
        try:
            content_length = int(length_header)
            raw = self.rfile.read(content_length).decode("utf-8")
            return json.loads(raw or "{}")
        except (ValueError, json.JSONDecodeError):
            return None

    def send_json(self, status_code: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), DemoHandler)
    print(f"Server running at http://{HOST}:{PORT}")
    print("Open API setup guide: API_SETUP.md")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
