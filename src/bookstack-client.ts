import { z } from "zod";

const searchResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      type: z.string(),
      url: z.string()
    }).passthrough()
  )
}).passthrough();

const pageResponseSchema = z.object({
  html: z.string().optional(),
  markdown: z.string().optional()
}).passthrough();

export type BookStackSearchResult = z.infer<typeof searchResponseSchema>["data"][number];
export type BookStackPage = z.infer<typeof pageResponseSchema>;

export interface BookStackConfig {
  apiUrl: string;
  tokenId: string;
  tokenSecret: string;
}

export type BookStackApiMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface BookStackApiResponse {
  status: number;
  contentType: string;
  data: unknown;
  encoding?: "base64";
}

interface AttachmentUpload {
  name: string;
  content_base64: string;
}

const maxResponseBytes = 5 * 1024 * 1024;
const maxAttachmentBytes = 10 * 1024 * 1024;

async function readResponseBytes(response: Response): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    return Buffer.alloc(0);
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return Buffer.concat(chunks, totalBytes);
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxResponseBytes) {
      await reader.cancel();
      throw new Error(`BookStack API response exceeds the ${maxResponseBytes}-byte safety limit.`);
    }
    chunks.push(Buffer.from(value));
  }
}

function createApiBaseUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("BOOKSTACK_API_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("BOOKSTACK_API_URL must use HTTP or HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("BOOKSTACK_API_URL must not contain embedded credentials.");
  }

  url.search = "";
  url.hash = "";
  const path = url.pathname.replace(/\/+$/, "").replace(/\/api$/i, "");
  url.pathname = `${path}/api/`;
  return url;
}

export class BookStackClient {
  private readonly apiBaseUrl: URL;
  private readonly authorization: string;

  constructor(config: BookStackConfig) {
    this.apiBaseUrl = createApiBaseUrl(config.apiUrl);
    this.authorization = `Token ${config.tokenId}:${config.tokenSecret}`;
  }

  async searchPages(query: string, page: number, count: number): Promise<BookStackSearchResult[]> {
    const url = new URL("search", this.apiBaseUrl);
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("count", String(count));

    const response = await this.getJson(url);
    return searchResponseSchema.parse(response).data.filter(result => result.type === "page");
  }

  async getPage(pageId: number): Promise<BookStackPage> {
    if (!Number.isInteger(pageId) || pageId < 1) {
      throw new Error("BookStack page ID must be a positive integer.");
    }

    const response = await this.getJson(new URL(`pages/${pageId}`, this.apiBaseUrl));
    return pageResponseSchema.parse(response);
  }

  async request(
    method: BookStackApiMethod,
    path: string,
    pathParameters: Record<string, string | number>,
    query: Record<string, string | number | boolean>,
    body?: Record<string, unknown>
  ): Promise<BookStackApiResponse> {
    const requiredParameters = [...path.matchAll(/\{([^}]+)\}/g)].map(match => match[1]);
    const suppliedParameters = Object.keys(pathParameters);

    if (
      requiredParameters.some(parameter => !(parameter in pathParameters))
      || suppliedParameters.some(parameter => !requiredParameters.includes(parameter))
    ) {
      throw new Error("The BookStack API route path parameters are invalid.");
    }

    const resolvedPath = path.replace(/\{([^}]+)\}/g, (_match, parameter: string) => {
      const value = pathParameters[parameter];
      if ((parameter === "id" || parameter === "contentId" || parameter === "deletionId")
        && (!Number.isSafeInteger(Number(value)) || Number(value) < 1)) {
        throw new Error(`BookStack API route parameter '${parameter}' must be a positive integer.`);
      }
      return encodeURIComponent(String(value));
    });
    const url = new URL(resolvedPath, this.apiBaseUrl);

    for (const [name, value] of Object.entries(query)) {
      url.searchParams.set(name, String(value));
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: this.authorization
    };
    let requestBody: BodyInit | undefined;
    if (body && method !== "GET" && method !== "DELETE") {
      if (
        path.startsWith("attachments") && body.file !== undefined
        || path.startsWith("image-gallery") && body.image !== undefined
      ) {
        requestBody = this.createUploadForm(body, path.startsWith("attachments") ? "file" : "image");
      } else {
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify(body);
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      ...(requestBody ? { body: requestBody } : {}),
      signal: AbortSignal.timeout(20_000)
    });
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > maxResponseBytes) {
      await response.body?.cancel();
      throw new Error(`BookStack API response exceeds the ${maxResponseBytes}-byte safety limit.`);
    }

    if (response.status === 204) {
      return { status: response.status, contentType, data: null };
    }

    const responseBytes = await readResponseBytes(response);
    if (!response.ok) {
      const detail = responseBytes.toString("utf8").slice(0, 1000);
      throw new Error(`BookStack API request failed with HTTP ${response.status} ${response.statusText}: ${detail}`);
    }

    if (contentType.includes("application/json")) {
      let data: unknown;
      try {
        data = JSON.parse(responseBytes.toString("utf8"));
      } catch {
        throw new Error("BookStack API returned invalid JSON.");
      }
      return { status: response.status, contentType, data };
    }

    if (contentType.startsWith("text/") || contentType.includes("xml")) {
      return { status: response.status, contentType, data: responseBytes.toString("utf8") };
    }

    return {
      status: response.status,
      contentType,
      data: responseBytes.toString("base64"),
      encoding: "base64"
    };
  }

  private async getJson(url: URL): Promise<unknown> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: this.authorization
      },
      signal: AbortSignal.timeout(20_000)
    });

    if (!response.ok) {
      throw new Error(`BookStack API request failed with HTTP ${response.status} ${response.statusText}.`);
    }

    return response.json();
  }

  private createUploadForm(body: Record<string, unknown>, uploadKey: "file" | "image"): FormData {
    const upload = body[uploadKey];
    if (
      typeof upload !== "object"
      || upload === null
      || !("name" in upload)
      || typeof upload.name !== "string"
      || !("content_base64" in upload)
      || typeof upload.content_base64 !== "string"
    ) {
      throw new Error(`Upload body.${uploadKey} must include a file name and base64 content.`);
    }

    const file: AttachmentUpload = {
      name: upload.name,
      content_base64: upload.content_base64
    };
    const base64 = file.content_base64.replace(/\s/g, "");
    const fileContents = Buffer.from(base64, "base64");
    if (
      base64.length === 0
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)
      || fileContents.toString("base64") !== base64
    ) {
      throw new Error(`Upload body.${uploadKey} content must be valid base64.`);
    }
    if (fileContents.byteLength > maxAttachmentBytes) {
      throw new Error(`File uploads cannot exceed ${maxAttachmentBytes} bytes.`);
    }

    const form = new FormData();
    for (const [key, value] of Object.entries(body)) {
      if (key === uploadKey || value === undefined || value === null) {
        continue;
      }
      form.append(key, typeof value === "string" ? value : JSON.stringify(value));
    }
    form.append(uploadKey, new Blob([fileContents]), file.name);
    return form;
  }
}
