# bookStackMCP

[![CI and Docker release](https://github.com/jonesXYZ/bookStackMCP/actions/workflows/docker.yml/badge.svg?branch=main)](https://github.com/jonesXYZ/bookStackMCP/actions/workflows/docker.yml)
![Private repository](https://img.shields.io/badge/repository-private-lightgrey)
![Node.js 24](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)
![Docker image](https://img.shields.io/badge/image-GHCR-2496ED?logo=docker&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

A configurable [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the [BookStack REST API](https://www.bookstackapp.com/).

> **Safety first:** reading is enabled by default. Every write, delete, administrative and import action is opt-in and disabled unless explicitly enabled.

## Contents

- [Features](#features)
- [Permissions and safety](#permissions-and-safety)
- [BookStack API coverage](#bookstack-api-coverage)
- [Run with Docker](#run-with-docker)
- [Run from source](#run-from-source)
- [MCP client configuration](#mcp-client-configuration)
- [Configuration reference](#configuration-reference)
- [CI and image releases](#ci-and-image-releases)
- [Development](#development)

## Features

- Search BookStack pages and return readable content with source links.
- Browse and manage BookStack REST API resources using resource-specific MCP tools.
- Export pages, chapters and books as HTML, PDF, plain text, Markdown or ZIP.
- Upload attachments and image-gallery content.
- Control write, delete, administrator and import tools independently through environment variables.
- Use stdio transport with Docker or Node.js.

## Permissions and safety

The server only advertises actions allowed by the following opt-in flags. Deleting content also requires explicit confirmation in the tool call. BookStack permissions remain authoritative: use a dedicated API token with only the permissions the MCP server needs.

| Environment variable | Default | Unlocks |
| --- | --- | --- |
| `BOOKSTACK_ENABLE_WRITE` | `false` | Create, update and restore |
| `BOOKSTACK_ENABLE_DELETE` | `false` | Delete and permanently destroy content; also requires write enabled |
| `BOOKSTACK_ENABLE_ADMIN` | `false` | User, role, content-permission, audit-log and system APIs |
| `BOOKSTACK_ENABLE_IMPORTS` | `false` | Create and run imports; also requires write enabled |

Delete calls require `confirmation: "DELETE"`. Permanently destroying a recycle-bin item requires `confirmation: "PERMANENTLY_DELETE"`. Administrative mutations require both write and admin enabled; administrative deletions require write, delete and admin enabled. Import actions require both write and imports enabled.

Keep BookStack API credentials and GHCR read tokens in your local secret store or MCP client configuration. Never commit them or bake them into a Docker image.

## BookStack API coverage

MCP tools follow the [BookStack API route catalogue](https://github.com/BookStackApp/BookStack/blob/development/routes/api.php). The 80 supported routes cover:

- Search and API documentation.
- Pages, chapters, books and shelves, including exports.
- Attachments and image gallery.
- Comments, tags and recycle-bin restore/deletion.
- Users, roles, content permissions, audit log and system information.
- Import jobs.

Actions accept BookStack's API query parameters and request-body fields. For attachment uploads, use `body.file` with `{ "name": "notes.pdf", "content_base64": "..." }`. For gallery image uploads, use `body.image` in the same shape. File uploads are limited to 10 MiB; API responses are limited to 5 MiB. The `search_pages` convenience tool returns Markdown where available, otherwise plain text converted from HTML.

## Run with Docker

The image is published to GitHub Container Registry (GHCR):

```powershell
docker login ghcr.io -u jonesXYZ
docker pull ghcr.io/jonesxyz/bookstackmcp:latest
```

The GHCR package is private. Sign in with an account granted package read access; automation can use a GitHub token with `read:packages`.

Create a local `.env` from the example and add your BookStack URL and token:

```powershell
Copy-Item .env.example .env
```

Run the MCP server over stdio:

```powershell
docker run --rm -i --env-file .env ghcr.io/jonesxyz/bookstackmcp:latest
```

The `-i` flag keeps the MCP stdio connection open. The `.env` file stays on your machine and is not included in the image.

## Run from source

Requirements: Node.js 20 or newer and a BookStack API token.

```powershell
npm ci
Copy-Item .env.example .env
# Edit .env with your BookStack URL and token.
npm test
npm start
```

## MCP client configuration

For a Docker-based MCP client, pass the environment variables to the container:

```json
{
  "mcpServers": {
    "bookStackMCP": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--env-file",
        "C:\\path\\to\\bookStackMCP\\.env",
        "ghcr.io/jonesxyz/bookstackmcp:latest"
      ]
    }
  }
}
```

Alternatively, run the built server directly:

```json
{
  "mcpServers": {
    "bookStackMCP": {
      "command": "node",
      "args": ["C:\\path\\to\\bookStackMCP\\build\\app.js"],
      "env": {
        "BOOKSTACK_API_URL": "https://bookstack.example.com",
        "BOOKSTACK_API_TOKEN": "your_token_id",
        "BOOKSTACK_API_KEY": "your_token_secret",
        "BOOKSTACK_ENABLE_WRITE": "false",
        "BOOKSTACK_ENABLE_DELETE": "false",
        "BOOKSTACK_ENABLE_ADMIN": "false",
        "BOOKSTACK_ENABLE_IMPORTS": "false"
      }
    }
  }
}
```

Only enable a capability when you specifically need it. For example, setting just `BOOKSTACK_ENABLE_WRITE` to `"true"` enables creates and updates while keeping deletes, administration and imports disabled.

## Configuration reference

| Variable | Required | Default | Description |
| --- | :---: | :---: | --- |
| `BOOKSTACK_API_URL` | Yes | — | BookStack base URL, with or without a trailing `/api`. |
| `BOOKSTACK_API_TOKEN` | Yes | — | BookStack API token ID. |
| `BOOKSTACK_API_KEY` | Yes | — | BookStack API token secret. |
| `BOOKSTACK_ENABLE_WRITE` | No | `false` | Enable create, update and restore actions. |
| `BOOKSTACK_ENABLE_DELETE` | No | `false` | Enable delete and permanent-destroy actions; requires write enabled. |
| `BOOKSTACK_ENABLE_ADMIN` | No | `false` | Enable administrative APIs; mutations also require write enabled. |
| `BOOKSTACK_ENABLE_IMPORTS` | No | `false` | Enable create/run import actions; requires write enabled. |

## CI and image releases

GitHub Actions runs `npm ci` and `npm test` for pull requests and pushes to `main` or `master`. After tests pass, the workflow builds and publishes the Docker image:

| Event | Image tags |
| --- | --- |
| Push to `main` | `main`, `latest`, commit SHA |
| Push to `master` | `master`, `latest`, commit SHA |
| Version tag such as `v1.2.3` | Version tag, commit SHA |
| Pull request | Tests only; no published image |

The workflow publishes `ghcr.io/jonesxyz/bookstackmcp` using the built-in `GITHUB_TOKEN` with `packages: write`; no manually configured publishing token is needed. The GHCR package is private; grant package read access to any user or deployment account that needs to pull the image.

## Development

```powershell
npm test
```

Tests compile TypeScript and cover API access gates, MCP tool discovery, request handling, upload validation and HTML conversion. No BookStack server is required.

---

*Independent project inspired by [yellowgg2/mcp-bookstack](https://github.com/yellowgg2/mcp-bookstack); the original repository is unchanged.*
