# jnsBookMCP

A configurable [Model Context Protocol](https://modelcontextprotocol.io/) server for the BookStack REST API.

This is an independent project inspired by [yellowgg2/mcp-bookstack](https://github.com/yellowgg2/mcp-bookstack). It uses the BookStack API route catalogue and leaves the original repository untouched.

## Safety defaults

Reading is available by default. **Every create, update, delete, administrative, and import action is disabled unless explicitly enabled** in the MCP process environment or `.env`. Enable only the capabilities you need, and use a BookStack API token with matching least-privilege permissions.

| Setting | Default | Enables |
| --- | --- | --- |
| `BOOKSTACK_ENABLE_WRITE` | `false` | Create, update, and restore operations |
| `BOOKSTACK_ENABLE_DELETE` | `false` | Delete and permanent recycle-bin operations; also requires write enabled |
| `BOOKSTACK_ENABLE_ADMIN` | `false` | User, role, content-permission, audit-log, and system operations; administrative mutations also require write enabled |
| `BOOKSTACK_ENABLE_IMPORTS` | `false` | Import creation and execution; also requires write enabled |

The server only advertises actions enabled by these settings. Deletion tools additionally require `confirmation: "DELETE"`; permanently destroying an item from the recycle bin requires `confirmation: "PERMANENTLY_DELETE"`. These confirmations supplement—not replace—the environment gates and BookStack permissions.

## BookStack API coverage

MCP tools are grouped by API resource. The supported routes follow the [BookStack API route catalogue](https://github.com/BookStackApp/BookStack/blob/development/routes/api.php) and cover:

- Search and API documentation
- Pages, chapters, books, and shelves, including HTML, PDF, plain-text, Markdown, and ZIP exports
- Attachments and image gallery
- Comments, tags, and recycle-bin restore/deletion
- Users, roles, content permissions, audit log, and system information (administrative access)
- Import jobs (separately gated)

Actions use BookStack's API request and query parameters. `body` is passed as the JSON request body except for file uploads, which use multipart form data. For attachment uploads, supply `body.file` as `{ "name": "notes.pdf", "content_base64": "..." }`; for image-gallery uploads, supply `body.image` in the same shape along with the other API fields. File uploads are limited to 10 MiB. Responses larger than 5 MiB are rejected. BookStack itself remains the authority for endpoint availability, validation, and the configured user's permissions.

The `search_pages` tool remains available as a convenience: it searches pages and returns Markdown or converted plain-text content with source links.

## Requirements and setup

- Node.js 20 or newer
- BookStack with API access enabled
- A BookStack API token ID and secret

```powershell
npm ci
Copy-Item .env.example .env
```

Configure the following variables in `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `BOOKSTACK_API_URL` | Yes | BookStack base URL, with or without a trailing `/api` |
| `BOOKSTACK_API_TOKEN` | Yes | BookStack API token ID |
| `BOOKSTACK_API_KEY` | Yes | BookStack API token secret |
| `BOOKSTACK_ENABLE_WRITE` | No | Explicitly enable create/update/restore; default `false` |
| `BOOKSTACK_ENABLE_DELETE` | No | Explicitly enable deletes; requires write enabled |
| `BOOKSTACK_ENABLE_ADMIN` | No | Explicitly enable administrative APIs; default `false` |
| `BOOKSTACK_ENABLE_IMPORTS` | No | Explicitly enable import actions; requires write enabled |

Then build, test, and run:

```powershell
npm test
npm start
```

The server uses stdio for MCP messages and writes diagnostics to stderr.

## MCP client configuration

```json
{
  "mcpServers": {
    "jnsBookMCP": {
      "command": "node",
      "args": ["C:\\path\\to\\jnsBookMCP\\build\\app.js"],
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

For example, to enable ordinary creates and updates while keeping deletes, administration, and imports off, set only `BOOKSTACK_ENABLE_WRITE` to `"true"`. Restart the MCP server after changing environment settings.

## Development

```powershell
npm test
```

Tests compile the TypeScript and exercise access gates, API calls, upload validation, and HTML conversion. A BookStack instance is not required.
