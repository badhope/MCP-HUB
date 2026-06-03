"""Generate docs/API.md from a running FastAPI server's openapi.json."""

import json
import sys
import urllib.request

OUT = "docs/API.md"


def main() -> int:
    """Fetch /openapi.json from a running server and render docs/API.md.

    Returns 0 on success, 1 if the server isn't reachable. The body of
    this function used to live at module top level, which meant a stray
    `import tools.gen_api_docs` would try to open a network socket at
    import time. The __main__ guard at the bottom makes the module
    importable again.
    """
    try:
        with urllib.request.urlopen("http://localhost:8080/openapi.json", timeout=5) as r:
            spec = json.load(r)
    except (OSError, ValueError) as e:
        print(f"error: cannot fetch openapi.json from a running server: {e}", file=sys.stderr)
        print("hint:  start the server first:  python main.py", file=sys.stderr)
        return 1

    lines = []
    lines.append("# API Reference")
    lines.append("")
    lines.append(f"**Version**: {spec['info']['version']}  ")
    lines.append(f"**Title**: {spec['info']['title']}  ")
    lines.append(f"**Description**: {spec['info']['description']}  ")
    lines.append("")
    lines.append("Interactive docs: `/docs` (Swagger UI) and `/redoc` (ReDoc) on a running server.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Endpoints")
    lines.append("")

    for path in sorted(spec["paths"]):
        methods = spec["paths"][path]
        for m, op in methods.items():
            verb = m.upper()
            if verb not in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                continue
            lines.append(f"### `{verb} {path}`")
            lines.append("")
            summary = op.get("summary", "")
            if summary:
                lines.append(f"**{summary}**")
                lines.append("")
            if op.get("description") and op["description"] != summary:
                lines.append(op["description"])
                lines.append("")
            if op.get("tags"):
                lines.append(f"*Tags*: {', '.join(op['tags'])}  ")
            if op.get("parameters"):
                lines.append("")
                lines.append("**Parameters**:")
                lines.append("")
                for p in op["parameters"]:
                    schema = p.get("schema", {})
                    t = schema.get("type") or schema.get("$ref", "?").split("/")[-1] or "any"
                    desc = p.get("description", "")
                    req = "required" if p.get("required") else "optional"
                    lines.append(f"- `{p['name']}` ({p['in']}, {t}, {req}) — {desc}")
            if op.get("requestBody"):
                content = op["requestBody"].get("content", {})
                if content:
                    ct = list(content.keys())[0]
                    sch = content[ct].get("schema", {})
                    ref = sch.get("$ref", "").split("/")[-1]
                    if not ref:
                        ref = ct
                    lines.append("")
                    lines.append(f"**Body** ({ct}): `{ref}`")
            lines.append("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"wrote {OUT} ({sum(len(l) for l in lines)} chars)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
