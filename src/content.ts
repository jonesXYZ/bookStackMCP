const entityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\""
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (entity, code: string) => {
    if (code[0] !== "#") {
      return entityMap[code.toLowerCase()] ?? entity;
    }

    const isHex = code[1].toLowerCase() === "x";
    const point = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    if (!Number.isInteger(point) || point < 0 || point > 0x10ffff) {
      return entity;
    }

    return String.fromCodePoint(point);
  });
}

export function htmlToPlainText(html: string): string {
  const text = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)\s*>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n?/g, "\n");

  return decodeHtmlEntities(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
