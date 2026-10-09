import assert from "node:assert/strict";
import test from "node:test";
import {
  bookStackApiOperations,
  isBookStackOperationEnabled
} from "../build/api-tools.js";

const readOnly = {
  write: false,
  delete: false,
  admin: false,
  imports: false
};

test("all API routes are catalogued and mutating routes are gated off by default", () => {
  const operations = Object.values(bookStackApiOperations).flat();
  const routeKeys = operations.map(operation => `${operation.method} ${operation.path}`);

  assert.equal(new Set(routeKeys).size, routeKeys.length);
  assert.equal(operations.length, 80);
  assert.ok(operations.some(operation => operation.path === "pages/{id}/export/pdf"));
  assert.ok(operations.some(operation => operation.path === "image-gallery/{id}/data"));
  assert.ok(operations.some(operation => operation.path === "users/{id}"));

  for (const operation of operations) {
    assert.equal(
      isBookStackOperationEnabled(operation.access, readOnly),
      operation.method === "GET" && operation.access === "read",
      `${operation.method} ${operation.path} should match the default read-only policy`
    );
  }
});

test("write, delete, admin, and import permissions require explicit opt-in", () => {
  const writesOnly = { ...readOnly, write: true };
  assert.equal(isBookStackOperationEnabled("write", writesOnly), true);
  assert.equal(isBookStackOperationEnabled("delete", writesOnly), false);
  assert.equal(isBookStackOperationEnabled("adminWrite", writesOnly), false);
  assert.equal(isBookStackOperationEnabled("importWrite", writesOnly), false);

  const ordinaryWritesAndDeletes = { ...readOnly, write: true, delete: true };
  assert.equal(isBookStackOperationEnabled("delete", ordinaryWritesAndDeletes), true);
  assert.equal(isBookStackOperationEnabled("adminDelete", ordinaryWritesAndDeletes), false);
  assert.equal(isBookStackOperationEnabled("hardDelete", ordinaryWritesAndDeletes), true);

  const allFeatures = {
    write: true,
    delete: true,
    admin: true,
    imports: true
  };
  for (const operation of Object.values(bookStackApiOperations).flat()) {
    assert.equal(isBookStackOperationEnabled(operation.access, allFeatures), true);
  }
});
