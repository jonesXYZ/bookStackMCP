import assert from "node:assert/strict";
import test from "node:test";
import { htmlToPlainText } from "../build/content.js";

test("converts common HTML blocks and decodes named and numeric entities", () => {
  const html = "<h2>API &amp; tools</h2><p>Line&nbsp;one<br>Line two &#8212; done.</p><ul><li>First</li><li>Second</li></ul>";

  assert.equal(
    htmlToPlainText(html),
    "API & tools\n\nLine one\nLine two — done.\n\n- First\n\n- Second"
  );
});

test("does not include script or style contents", () => {
  assert.equal(
    htmlToPlainText("<p>Visible</p><script>alert('hidden')</script><style>.x { color: red }</style>"),
    "Visible"
  );
});
