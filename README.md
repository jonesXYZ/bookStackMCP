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

## Requirements and local setup

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

## Docker image

When tests pass, pushes to `master` publish `ghcr.io/jonesxyz/jnsbookmcp:master` and `ghcr.io/jonesxyz/jnsbookmcp:latest`. Pushes to this repository's current default branch, `main`, also publish `main` and `latest` tags; version tags (`v*`) publish a matching image tag. Pull requests run the same build and test checks without publishing an image.

The image is private along with this repository. Sign in to GHCR with an account that can read the package, then pull the image:

```powershell
docker login ghcr.io -u jonesXYZ
docker pull ghcr.io/jonesxyz/jnsbookmcp:latest
```

For automated deployments, use a GitHub token with `read:packages` permission. Do not add the token, BookStack API credentials, or a real `.env` file to the repository.

Configure an MCP client to start the image over stdio. Docker's `-i` flag is required; bind the BookStack API URL and credentials into the container using your MCP client's environment-variable/secret mechanism:

```json
{
  "mcpServers": {
    "jnsBookMCP": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "BOOKSTACK_API_URL",
        "-e",
        "BOOKSTACK_API_TOKEN",
        "-e",
        "BOOKSTACK_API_KEY",
        "-e",
        "BOOKSTACK_ENABLE_WRITE",
        "-e",
        "BOOKSTACK_ENABLE_DELETE",
        "-e",
        "BOOKSTACK_ENABLE_ADMIN",
        "-e",
        "BOOKSTACK_ENABLE_IMPORTS",
        "ghcr.io/jonesxyz/jnsbookmcp:latest"
      ],
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

Ensure the MCP client process has the listed environment variables set before starting. Replace the credential placeholders with local secrets and do not commit them. Every mutation remains off unless its corresponding environment flag is explicitly set to `"true"`. For example, set only `BOOKSTACK_ENABLE_WRITE=true` to allow ordinary creates and updates while leaving deletes, administration, and imports disabled.

To run the image directly for a local smoke test, supply the configuration with `--env-file`:

```powershell
docker run --rm -i --env-file .env ghcr.io/jonesxyz/jnsbookmcp:latest
```

MCP clients should use `docker run -i --rm` as shown above so stdio remains connected.

## CI and releases

The GitHub Actions workflow at `.github/workflows/docker.yml` runs `npm ci` and `npm test` on pull requests and pushes to `main` and `master`. After the tests pass, pushes to either branch and version tags (`v*`) build and publish the container to GHCR. The workflow requires no manually configured package token: it uses the repository's `GITHUB_TOKEN` with `packages: write`.

If GitHub repository settings restrict Actions permissions, allow GitHub Actions to create and write packages. The package inherits the repository's private visibility; grant users or deployment accounts `read:packages` access to pull it.

## Development

```powershell
npm test
```

Tests compile the TypeScript and exercise access gates, API calls, upload validation, and HTML conversion. A BookStack instance is not required.
