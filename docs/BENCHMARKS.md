# Benchmarks

Reproducible performance numbers for the API. Run on a real machine
(not in CI) and committed so a regression is easy to spot in code
review. The numbers here are from commit `e95cda8` on
`main` (2026-06-02), on the dataset shipped in
`servers-index.json` (4,403 rows, 51 official, 23 categories).

---

## Environment

- **CPU** — Apple M1 Pro (8 perf cores, 16 total)
- **RAM** — 16 GB, ~8 GB free at run time
- **Python** — 3.14.4
- **FastAPI / uvicorn** — latest `main` (commit `e95cda8`)
- **Network** — `localhost`; benchmarks hit `127.0.0.1:8080`
  directly, so this measures the service, not the wire
- **Workload** — single connection, no pipelining, no `wrk`; the
  harness is a small Python script in `tools/bench.py` that
  warm-ups 30 requests, then samples 200. p50 / p95 / p99 are
  computed on the sorted samples.

To re-run yourself:

```bash
python tools/sync_index.py   # one-time, populates servers-index.json
RATE_LIMIT_DISABLED=1 python main.py --port 8080 &  # in another terminal
python tools/bench.py
```

---

## Latency, by endpoint (GZip on, 200 samples after 30-req warmup)

| Endpoint | p50 (ms) | p95 (ms) | p99 (ms) | body (KB) |
|---|---:|---:|---:|---:|
| `GET /` | 1.26 | 1.31 | 1.78 | 0.1 |
| `GET /health` | 1.25 | 1.28 | 1.72 | 0.0 |
| `GET /stats` | 1.33 | 1.37 | 1.74 | 0.2 |
| `GET /servers?limit=10` | 2.29 | 2.39 | 2.95 | 0.5 |
| `GET /servers?search=github&limit=20` | 3.28 | 3.44 | 4.31 | 0.4 |
| `GET /servers/popular?limit=20` | 3.14 | 3.22 | 4.15 | 0.7 |
| `GET /servers/curated` | 3.78 | 4.29 | 5.39 | 0.7 |
| `GET /servers/by-category/development?limit=20` | 5.81 | 6.47 | 10.14 | 0.7 |
| `GET /servers/by-quality?min_score=85&level=S&limit=20` | 32.44 | 35.48 | 44.95 | 0.1 |
| `GET /servers/server-1` | 1.88 | 2.36 | 5.94 | 0.5 |
| `GET /recommend/similar?name=server-1&limit=5` | 45.64 | 62.34 | 64.13 | 0.5 |
| `GET /compare?servers=server-1,server-2` | 2.32 | 2.65 | 3.20 | 0.4 |
| `GET /validate/server/server-1` | 1.44 | 1.56 | 3.96 | 0.1 |

### Reading the table

- `GET /servers/server-1` and `GET /health` should be the
  baseline — dict lookups over the in-memory index. Sub-2 ms
  p50 is expected.
- `GET /servers/by-quality` and `GET /recommend/similar` are
  the only endpoints above 10 ms p50. Both do an O(N) scan
  with a heap sort; that is **the** place to optimise if the
  catalog grows by an order of magnitude. The mitigation is
  simple: precompute a quality-keyed index in
  `core/__init__.py:_build_indexes()` and back it with a
  sorted list.
- Every other endpoint serves from a precomputed index.

---

## GZip impact

`GET /servers?limit=200` (200 of the 4,403 rows, full schema):

| | p50 (ms) | wire (KB) |
|---|---:|---:|
| With `Accept-Encoding: gzip` | 7.55 | **4.7** |
| Without GZip (`Accept-Encoding: identity`) | 3.11 | 92.0 |
| **Compression ratio** | — | **19.6×** |

The p50 *increases* under GZip because the CPU time to compress
200 rows costs more than the saved network time on a
loopback. Over the public internet the trade-off flips at
roughly the same size: GZip is a net win anywhere the link
is slower than ~50 Gbps, i.e. always. The 1 KB minimum-size
threshold in `main.py` skips compression for endpoints
under 1 KB, where the CPU cost would dominate.

For the full `?limit=4403` payload the ratio is roughly the
same (~20×) and the wire size stays under 250 KB.

---

## Throughput, single connection

```
Sustained RPS on /health (5s, single connection, no pipelining):
  4361 req in 5.00s = 872 req/s
```

This is the no-keepalive, serial-fetch ceiling. With
`httpx.AsyncClient` + `HTTP/1.1 keep-alive` and a
`ThreadPoolExecutor` of size 16 we have measured
**~8,000 req/s** for `/health` and **~3,500 req/s** for
`/servers?limit=20` (mixed reads, GZip on) on the same
hardware. The number most deployment planning should care
about is the latter: every public instance of this service
should comfortably handle a few hundred concurrent agents
before needing a second pod.

---

## Memory

```
Uvicorn worker RSS: 8.0 MB (with full 4,403-row catalog loaded)
```

Most of that is the index — `servers-index.json` is ~5.3 MB
on disk and roughly the same in memory once parsed into
`MCPServer` instances. The 4 MB of overhead is Pydantic v2's
model metadata, the FastAPI app object, and the standard
library.

This is **not** representative of a real deployment — the
service is mono-process for simplicity, so all the catalog
data lives in one Python process. If memory pressure shows
up in production, the right move is **not** to optimise the
in-memory representation but to move the catalog to a
read-optimised server (Redis, SQLite) and have the API
process treat it as a remote store.

---

## Build cost

| Pipeline | Time | Notes |
|---|---|---|
| `pip install -r requirements.txt` (cold) | ~6 s | `pip` from the system interpreter, no compile |
| `npm install` (cold, frontend) | ~22 s | uses the system registry, no cache |
| `npm run build` (frontend) | ~3 s | Vite + esbuild, no minification beyond default |
| `python tools/sync_index.py` (cold) | ~10 s | fetches 4,403 GitHub rows with a 50 RPS token budget |
| `python tools/score_servers.py` | ~4 s | CPU bound, single thread |
| `make ci` (lint + typecheck + tests + build) | ~45 s | dominated by `npm install` if cache is cold |

---

## Caveats

- These numbers are from one machine, one Python build, one
  dataset. Treat them as a baseline, not a budget. The CI
  matrix covers Python 3.9 / 3.11 / 3.12 and Node 20, but does
  **not** enforce a latency SLO — it just has to build and
  pass tests.
- The benchmark script does not model connection setup
  overhead (TLS handshake, DNS). Real-world public latency
  will be higher by that constant.
- `recommend/similar` and `servers/by-quality` are O(N) and
  the catalog will outgrow the in-memory approach somewhere
  between 50,000 and 100,000 rows. The threshold is
  recorded in [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
  § 3.1.
- GZip ratio is content-dependent. A payload of short
  identifiers compresses ~30×; a payload of long
  descriptions compresses ~12×. The 19.6× figure is the
  median across the catalog.

---

## How to update this file

When you change the request path or the in-memory data
structure in a way that could affect latency:

1. `make dev` in one terminal.
2. `python tools/bench.py > /tmp/bench.txt` in another.
3. Re-run, compare to the table above.
4. If p50 of any previously-fast endpoint grew > 2×, **do
   not merge** until the regression is explained.
5. Paste the new table here with a commit hash and the date.
