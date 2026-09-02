#!/usr/bin/env python3
"""Статический сервер для превью игры с отключённым кэшированием.

Запуск:  python3 tools/serve.py [порт]
Отдаёт корень репозитория и шлёт заголовки no-store, чтобы браузер
всегда брал свежие JS/CSS (иначе превью показывает старую сборку).
"""
import os
import sys
import http.server
import socketserver

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
os.chdir(ROOT)


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *a):  # тише в логах
        pass


socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), NoCacheHandler) as httpd:
    print(f"serving {ROOT} on 0.0.0.0:{PORT} (no-store)")
    httpd.serve_forever()
