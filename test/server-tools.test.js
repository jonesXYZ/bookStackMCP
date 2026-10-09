import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const serverPath = fileURLToPath(new URL("../build/app.js", import.meta.url));

async function listServerTools(access = {}) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: {
      BOOKSTACK_API_URL: "https://bookstack.example.com",
      BOOKSTACK_API_TOKEN: "test-token",
      BOOKSTACK_API_KEY: "test-secret",
      BOOKSTACK_ENABLE_WRITE: String(access.write ?? false),
      BOOKSTACK_ENABLE_DELETE: String(access.delete ?? false),
      BOOKSTACK_ENABLE_ADMIN: String(access.admin ?? false),
      BOOKSTACK_ENABLE_IMPORTS: String(access.imports ?? false)
    }
  });
  const client = new Client({ name: "bookStackMCP-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const response = await client.listTools();
    return new Map(response.tools.map(tool => [tool.name, tool]));
  } finally {
    await client.close();
  }
}

test("MCP advertises only read actions by default", async () => {
  const tools = await listServerTools();

  assert.ok(tools.has("search_pages"));
  assert.ok(tools.has("bookstack_pages"));
  assert.ok(tools.has("bookstack_search"));
  assert.ok(!tools.has("bookstack_users"));

  const pageActions = tools.get("bookstack_pages").inputSchema.properties.action.enum;
  assert.ok(pageActions.includes("list"));
  assert.ok(pageActions.includes("read"));
  assert.ok(pageActions.includes("export_markdown"));
  assert.ok(!pageActions.includes("create"));
  assert.ok(!pageActions.includes("update"));
  assert.ok(!pageActions.includes("delete"));
});

test("MCP adds each mutation category only after its explicit opt-in", async () => {
  const writeTools = await listServerTools({ write: true });
  const pageActions = writeTools.get("bookstack_pages").inputSchema.properties.action.enum;
  assert.ok(pageActions.includes("create"));
  assert.ok(pageActions.includes("update"));
  assert.ok(!pageActions.includes("delete"));
  assert.ok(!writeTools.has("bookstack_users"));

  const allTools = await listServerTools({
    write: true,
    delete: true,
    admin: true,
    imports: true
  });
  const userActions = allTools.get("bookstack_users").inputSchema.properties.action.enum;
  const importActions = allTools.get("bookstack_imports").inputSchema.properties.action.enum;
  assert.ok(userActions.includes("create"));
  assert.ok(userActions.includes("delete"));
  assert.ok(importActions.includes("run"));
  assert.ok(importActions.includes("delete"));
});
