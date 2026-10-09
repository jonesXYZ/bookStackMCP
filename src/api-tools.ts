export type ApiAccess =
  | "read"
  | "adminRead"
  | "write"
  | "adminWrite"
  | "delete"
  | "adminDelete"
  | "importWrite"
  | "importDelete"
  | "hardDelete";

export interface BookStackApiOperation {
  action: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  access: ApiAccess;
  description: string;
}

export interface BookStackAccessConfig {
  write: boolean;
  delete: boolean;
  admin: boolean;
  imports: boolean;
}

export const bookStackApiOperations: Record<string, BookStackApiOperation[]> = {
  pages: [
    { action: "list", method: "GET", path: "pages", access: "read", description: "List pages." },
    { action: "create", method: "POST", path: "pages", access: "write", description: "Create a page in a book or chapter." },
    { action: "read", method: "GET", path: "pages/{id}", access: "read", description: "Read a page and its content." },
    { action: "update", method: "PUT", path: "pages/{id}", access: "write", description: "Update or move a page." },
    { action: "delete", method: "DELETE", path: "pages/{id}", access: "delete", description: "Delete a page to the recycle bin." },
    ...["html", "pdf", "plaintext", "markdown", "zip"].map(format => ({
      action: `export_${format}`,
      method: "GET" as const,
      path: `pages/{id}/export/${format}`,
      access: "read" as const,
      description: `Export a page as ${format}.`
    }))
  ],
  chapters: [
    { action: "list", method: "GET", path: "chapters", access: "read", description: "List chapters." },
    { action: "create", method: "POST", path: "chapters", access: "write", description: "Create a chapter in a book." },
    { action: "read", method: "GET", path: "chapters/{id}", access: "read", description: "Read a chapter." },
    { action: "update", method: "PUT", path: "chapters/{id}", access: "write", description: "Update or move a chapter." },
    { action: "delete", method: "DELETE", path: "chapters/{id}", access: "delete", description: "Delete a chapter to the recycle bin." },
    ...["html", "pdf", "plaintext", "markdown", "zip"].map(format => ({
      action: `export_${format}`,
      method: "GET" as const,
      path: `chapters/{id}/export/${format}`,
      access: "read" as const,
      description: `Export a chapter as ${format}.`
    }))
  ],
  books: [
    { action: "list", method: "GET", path: "books", access: "read", description: "List books." },
    { action: "create", method: "POST", path: "books", access: "write", description: "Create a book." },
    { action: "read", method: "GET", path: "books/{id}", access: "read", description: "Read a book." },
    { action: "update", method: "PUT", path: "books/{id}", access: "write", description: "Update a book." },
    { action: "delete", method: "DELETE", path: "books/{id}", access: "delete", description: "Delete a book to the recycle bin." },
    ...["html", "pdf", "plaintext", "markdown", "zip"].map(format => ({
      action: `export_${format}`,
      method: "GET" as const,
      path: `books/{id}/export/${format}`,
      access: "read" as const,
      description: `Export a book as ${format}.`
    }))
  ],
  shelves: [
    { action: "list", method: "GET", path: "shelves", access: "read", description: "List shelves." },
    { action: "create", method: "POST", path: "shelves", access: "write", description: "Create a shelf." },
    { action: "read", method: "GET", path: "shelves/{id}", access: "read", description: "Read a shelf." },
    { action: "update", method: "PUT", path: "shelves/{id}", access: "write", description: "Update a shelf." },
    { action: "delete", method: "DELETE", path: "shelves/{id}", access: "delete", description: "Delete a shelf." }
  ],
  attachments: [
    { action: "list", method: "GET", path: "attachments", access: "read", description: "List attachments." },
    { action: "create", method: "POST", path: "attachments", access: "write", description: "Upload an attachment. Supply body.file as {name, content_base64} and the remaining API fields in body." },
    { action: "read", method: "GET", path: "attachments/{id}", access: "read", description: "Read attachment metadata." },
    { action: "update", method: "PUT", path: "attachments/{id}", access: "write", description: "Update attachment metadata." },
    { action: "delete", method: "DELETE", path: "attachments/{id}", access: "delete", description: "Delete an attachment." }
  ],
  "audit-log": [
    { action: "list", method: "GET", path: "audit-log", access: "adminRead", description: "List the audit log (requires BookStack permissions)." }
  ],
  comments: [
    { action: "list", method: "GET", path: "comments", access: "read", description: "List comments." },
    { action: "create", method: "POST", path: "comments", access: "write", description: "Create a comment." },
    { action: "read", method: "GET", path: "comments/{id}", access: "read", description: "Read a comment." },
    { action: "update", method: "PUT", path: "comments/{id}", access: "write", description: "Update a comment." },
    { action: "delete", method: "DELETE", path: "comments/{id}", access: "delete", description: "Delete a comment." }
  ],
  "content-permissions": [
    { action: "read", method: "GET", path: "content-permissions/{contentType}/{contentId}", access: "adminRead", description: "Read content permission overrides." },
    { action: "update", method: "PUT", path: "content-permissions/{contentType}/{contentId}", access: "adminWrite", description: "Update content permission overrides." }
  ],
  docs: [
    { action: "read", method: "GET", path: "docs.json", access: "read", description: "Read this BookStack instance's API documentation." }
  ],
  "image-gallery": [
    { action: "list", method: "GET", path: "image-gallery", access: "read", description: "List gallery images." },
    { action: "create", method: "POST", path: "image-gallery", access: "write", description: "Create a gallery image. Supply body.image as {name, content_base64} and the other API fields in body." },
    { action: "read_data_for_url", method: "GET", path: "image-gallery/url/data", access: "read", description: "Read gallery image data for a URL; pass the URL in query." },
    { action: "read", method: "GET", path: "image-gallery/{id}", access: "read", description: "Read gallery image metadata." },
    { action: "read_data", method: "GET", path: "image-gallery/{id}/data", access: "read", description: "Read gallery image data." },
    { action: "update", method: "PUT", path: "image-gallery/{id}", access: "write", description: "Update gallery image metadata or replace its image. Supply body.image as {name, content_base64} to upload a replacement." },
    { action: "delete", method: "DELETE", path: "image-gallery/{id}", access: "delete", description: "Delete a gallery image." }
  ],
  imports: [
    { action: "list", method: "GET", path: "imports", access: "read", description: "List imports." },
    { action: "create", method: "POST", path: "imports", access: "importWrite", description: "Create an import job." },
    { action: "read", method: "GET", path: "imports/{id}", access: "read", description: "Read an import job." },
    { action: "run", method: "POST", path: "imports/{id}", access: "importWrite", description: "Run an import job; this can create or change many records." },
    { action: "delete", method: "DELETE", path: "imports/{id}", access: "importDelete", description: "Delete an import job." }
  ],
  "recycle-bin": [
    { action: "list", method: "GET", path: "recycle-bin", access: "read", description: "List deleted content." },
    { action: "restore", method: "PUT", path: "recycle-bin/{deletionId}", access: "write", description: "Restore content from the recycle bin." },
    { action: "destroy", method: "DELETE", path: "recycle-bin/{deletionId}", access: "hardDelete", description: "Permanently destroy deleted content. This cannot be undone." }
  ],
  roles: [
    { action: "list", method: "GET", path: "roles", access: "adminRead", description: "List roles (requires role-management permission)." },
    { action: "create", method: "POST", path: "roles", access: "adminWrite", description: "Create a role (requires role-management permission)." },
    { action: "read", method: "GET", path: "roles/{id}", access: "adminRead", description: "Read a role and its permissions." },
    { action: "update", method: "PUT", path: "roles/{id}", access: "adminWrite", description: "Update a role's permissions and settings." },
    { action: "delete", method: "DELETE", path: "roles/{id}", access: "adminDelete", description: "Delete a role." }
  ],
  search: [
    { action: "all", method: "GET", path: "search", access: "read", description: "Search across BookStack; provide query, page and count in query." },
    { action: "book", method: "GET", path: "search/book/{id}", access: "read", description: "Search within a book; provide query, page and count in query." },
    { action: "chapter", method: "GET", path: "search/chapter/{id}", access: "read", description: "Search within a chapter; provide query, page and count in query." }
  ],
  system: [
    { action: "read", method: "GET", path: "system", access: "adminRead", description: "Read BookStack system information." }
  ],
  tags: [
    { action: "names", method: "GET", path: "tags/names", access: "read", description: "List tag names." },
    { action: "values_for_name", method: "GET", path: "tags/values-for-name", access: "read", description: "List values for a tag name; provide name in query." }
  ],
  users: [
    { action: "list", method: "GET", path: "users", access: "adminRead", description: "List users (requires user-management permission)." },
    { action: "create", method: "POST", path: "users", access: "adminWrite", description: "Create a user (requires user-management permission)." },
    { action: "read", method: "GET", path: "users/{id}", access: "adminRead", description: "Read a user." },
    { action: "update", method: "PUT", path: "users/{id}", access: "adminWrite", description: "Update a user." },
    { action: "delete", method: "DELETE", path: "users/{id}", access: "adminDelete", description: "Delete a user." }
  ]
};

export function isBookStackOperationEnabled(
  access: ApiAccess,
  config: BookStackAccessConfig
): boolean {
  switch (access) {
    case "read":
      return true;
    case "adminRead":
      return config.admin;
    case "write":
      return config.write;
    case "adminWrite":
      return config.write && config.admin;
    case "delete":
    case "hardDelete":
      return config.write && config.delete;
    case "adminDelete":
      return config.write && config.delete && config.admin;
    case "importWrite":
      return config.write && config.imports;
    case "importDelete":
      return config.write && config.delete && config.imports;
  }
}
