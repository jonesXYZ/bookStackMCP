import assert from "node:assert/strict";
import test from "node:test";
import { BookStackClient } from "../build/bookstack-client.js";

test("searches through the API and performs read-only GET requests", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(input);
    requests.push({ url, init });
    if (url.pathname.endsWith("/pages/4")) {
      return Response.json({ html: "<p>Content</p>", markdown: "" });
    }

    return Response.json({
      data: [
        { id: 4, name: "Getting started", type: "page", url: "https://bookstack.example.com/pages/4" },
        { id: 5, name: "Operations", type: "book", url: "https://bookstack.example.com/books/5" }
      ]
    });
  };

  try {
    const client = new BookStackClient({
      apiUrl: "https://bookstack.example.com/installation/api/",
      tokenId: "read-only-id",
      tokenSecret: "read-only-secret"
    });

    const pages = await client.searchPages("guide & setup", 2, 5);
    const page = await client.getPage(4);

    assert.equal(requests.length, 2);
    assert.equal(requests[0].url.href, "https://bookstack.example.com/installation/api/search?query=guide+%26+setup&page=2&count=5");
    assert.equal(requests[0].init.headers.Authorization, "Token read-only-id:read-only-secret");
    assert.equal(requests[1].url.href, "https://bookstack.example.com/installation/api/pages/4");
    assert.ok(requests.every(request => request.init.method === "GET"));
    assert.deepEqual(pages.map(page => page.id), [4]);
    assert.equal(page.html, "<p>Content</p>");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects invalid page IDs before making a request", async () => {
  const client = new BookStackClient({
    apiUrl: "https://bookstack.example.com",
    tokenId: "read-only-id",
    tokenSecret: "read-only-secret"
  });

  await assert.rejects(client.getPage(0), /positive integer/);
});

test("uses the catalogued HTTP method, query, and JSON request body", async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest;
  globalThis.fetch = async (input, init) => {
    capturedRequest = { url: new URL(input), init };
    return Response.json({ id: 12, name: "Updated" });
  };

  try {
    const client = new BookStackClient({
      apiUrl: "https://bookstack.example.com/api",
      tokenId: "token",
      tokenSecret: "secret"
    });
    const response = await client.request(
      "PUT",
      "pages/{id}",
      { id: 12 },
      { count: 20, archived: false },
      { name: "Updated", markdown: "# New content" }
    );

    assert.equal(capturedRequest.url.href, "https://bookstack.example.com/api/pages/12?count=20&archived=false");
    assert.equal(capturedRequest.init.method, "PUT");
    assert.equal(capturedRequest.init.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(capturedRequest.init.body), {
      name: "Updated",
      markdown: "# New content"
    });
    assert.equal(response.data.name, "Updated");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects unsafe route parameters and malformed attachment uploads", async () => {
  const client = new BookStackClient({
    apiUrl: "https://bookstack.example.com",
    tokenId: "token",
    tokenSecret: "secret"
  });

  await assert.rejects(
    client.request("GET", "pages/{id}", { id: "../users" }, {}, undefined),
    /positive integer/
  );
  await assert.rejects(
    client.request("POST", "attachments", {}, {}, {
      uploaded_to: 12,
      file: { name: "notes.txt", content_base64: "not base64!" }
    }),
    /valid base64/
  );
});

test("uploads attachment and gallery image bytes as multipart form data", async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest;
  globalThis.fetch = async (input, init) => {
    capturedRequest = { url: new URL(input), init };
    return Response.json({ id: 24, name: "notes.txt" });
  };

  try {
    const client = new BookStackClient({
      apiUrl: "https://bookstack.example.com",
      tokenId: "token",
      tokenSecret: "secret"
    });
    await client.request("POST", "attachments", {}, {}, {
      name: "notes",
      uploaded_to: 12,
      uploaded_to_type: "page",
      file: {
        name: "notes.txt",
        content_base64: Buffer.from("read-only upload").toString("base64")
      }
    });

    assert.equal(capturedRequest.url.pathname, "/api/attachments");
    assert.equal(capturedRequest.init.method, "POST");
    assert.ok(capturedRequest.init.body instanceof FormData);
    assert.equal(capturedRequest.init.body.get("name"), "notes");
    assert.equal(capturedRequest.init.body.get("uploaded_to"), "12");
    const file = capturedRequest.init.body.get("file");
    assert.equal(file.name, "notes.txt");
    assert.equal(await file.text(), "read-only upload");

    await client.request("POST", "image-gallery", {}, {}, {
      type: "gallery",
      uploaded_to: 12,
      image: {
        name: "diagram.png",
        content_base64: Buffer.from("image-data").toString("base64")
      }
    });
    assert.equal(capturedRequest.url.pathname, "/api/image-gallery");
    assert.equal(capturedRequest.init.method, "POST");
    assert.equal(capturedRequest.init.body.get("type"), "gallery");
    const image = capturedRequest.init.body.get("image");
    assert.equal(image.name, "diagram.png");
    assert.equal(await image.text(), "image-data");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
