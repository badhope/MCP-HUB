#!/usr/bin/env python3
"""Micro-benchmark of the public API.

Usage:
    RATE_LIMIT_DISABLED=1 python main.py --port 8080 &
    python tools/bench.py
    python tools/bench.py --host http://localhost:8080 --n 200

Writes a Markdown table to stdout, suitable for pasting into
docs/BENCHMARKS.md. The numbers here are intentionally
reproducible — same script, same machine, same Python.
"""

from __future__ import annotations

import argparse
import logging
import statistics
import sys
import time
import urllib.request

_LOG = logging.getLogger(__name__)

ENDPOINTS: list[tuple[str, str]] = [
    ("GET /", "/"),
    ("GET /health", "/health"),
    ("GET /stats", "/stats"),
    ("GET /servers?limit=10", "/servers?limit=10"),
    ("GET /servers?search=github&limit=20", "/servers?search=github&limit=20"),
    ("GET /servers/popular?limit=20", "/servers/popular?limit=20"),
    ("GET /servers/curated", "/servers/curated"),
    ("GET /servers/by-category/development?limit=20", "/servers/by-category/development?limit=20"),
    (
        "GET /servers/by-quality?min_score=85&level=S&limit=20",
        "/servers/by-quality?min_score=85&level=S&limit=20",
    ),
    ("GET /servers/server-1", "/servers/server-1"),
    ("GET /recommend/similar?name=server-1&limit=5", "/recommend/similar?name=server-1&limit=5"),
    ("GET /compare?servers=server-1,server-2", "/compare?servers=server-1,server-2"),
    ("GET /validate/server/server-1", "/validate/server/server-1"),
]


def bench(url: str, *, gzip: bool, n: int, warmup: int) -> tuple[float, float, float, float]:
    headers = {"Accept-Encoding": "gzip"} if gzip else {"Accept-Encoding": "identity"}
    req = urllib.request.Request(url, headers=headers)
    for _ in range(warmup):
        urllib.request.urlopen(req).read()
    samples: list[float] = []
    sizes: list[int] = []
    for _ in range(n):
        t0 = time.perf_counter()
        body = urllib.request.urlopen(req).read()
        samples.append((time.perf_counter() - t0) * 1000)
        sizes.append(len(body))
    samples.sort()
    p50 = samples[n // 2]
    p95 = samples[int(n * 0.95)]
    p99 = samples[int(n * 0.99)]
    return p50, p95, p99, statistics.median(sizes) / 1024


def sustained_rps(url: str, seconds: float) -> tuple[int, float]:
    req = urllib.request.Request(url)
    t0 = time.perf_counter()
    count = 0
    while time.perf_counter() - t0 < seconds:
        urllib.request.urlopen(req).read()
        count += 1
    return count, time.perf_counter() - t0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--host",
        default="http://localhost:8080",
        help="API base URL (default: http://localhost:8080)",
    )
    p.add_argument("--n", type=int, default=200, help="samples per endpoint (default: 200)")
    p.add_argument(
        "--warmup", type=int, default=30, help="warmup requests per endpoint (default: 30)"
    )
    p.add_argument(
        "--sustained-seconds",
        type=float,
        default=5.0,
        help="duration for sustained RPS test (default: 5s)",
    )
    args = p.parse_args()

    _LOG.info(f"# Bench at {args.host}  (n={args.n}, warmup={args.warmup})", file=sys.stderr)
    _LOG.info(f"{'Endpoint':<62} {'p50 ms':>8} {'p95 ms':>8} {'p99 ms':>8} {'body KB':>8}")
    _LOG.info("-" * 98)
    for name, path in ENDPOINTS:
        p50, p95, p99, body_kb = bench(args.host + path, gzip=True, n=args.n, warmup=args.warmup)
        _LOG.info(f"{name:<62} {p50:>8.2f} {p95:>8.2f} {p99:>8.2f} {body_kb:>8.1f}")
    _LOG.info("")

    _LOG.info("GZip impact on /servers?limit=200 (full catalog):")
    p50_g, _, _, kb_g = bench(
        args.host + "/servers?limit=200", gzip=True, n=max(50, args.n // 4), warmup=args.warmup
    )
    p50_p, _, _, kb_p = bench(
        args.host + "/servers?limit=200", gzip=False, n=max(50, args.n // 4), warmup=args.warmup
    )
    _LOG.info(f"  with GZip:    p50 {p50_g:5.2f} ms  wire = {kb_g:6.1f} KB")
    _LOG.info(f"  without GZip: p50 {p50_p:5.2f} ms  wire = {kb_p:6.1f} KB")
    if kb_g > 0:
        _LOG.info(f"  ratio: {kb_p / kb_g:.1f}× smaller on the wire with GZip")
    _LOG.info("")

    _LOG.info(f"Sustained RPS on /health ({args.sustained_seconds:.0f}s, single conn):")
    count, elapsed = sustained_rps(args.host + "/health", args.sustained_seconds)
    _LOG.info(f"  {count} req in {elapsed:.2f}s = {count / elapsed:.0f} req/s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
