---
name: Add a new MCP server
about: Submit a new MCP server to the catalog
title: '[NEW SERVER] '
labels: 'submission, server'
assignees: ''
---

## Server information

- **Server name**:
- **GitHub repository / homepage URL**:
- **Category** (database, search, browser, etc.):
- **Programming language**:
- **License**:
- **Stars** (approximate):
- **Maintained by**: (company or individual)
- **Last commit date**:

## Quality checklist

- [ ] Server is open-source
- [ ] Has a clear README with installation instructions
- [ ] Has an MCP configuration example
- [ ] Has been tested with at least one MCP client (Claude Desktop, Cursor, etc.)
- [ ] License is OSI-approved
- [ ] No known security vulnerabilities
- [ ] Maintained within the last 6 months

## Configuration snippet

Paste a minimal working MCP config (no real tokens):

```json
{
  "mcpServers": {
    "your-server": {
      "command": "npx",
      "args": ["-y", "@your/package-name"]
    }
  }
}
```

## Description

A 1-2 sentence description of what the server does and why someone would
install it.

## Why this server should be in MCP Hub

Explain why this server is valuable to the community.
