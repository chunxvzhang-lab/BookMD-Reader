export function normalizeId(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueSlug(text: string, seen: Map<string, number>): string {
  const base = normalizeId(text) || "section";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

export function createId(prefix: string): string {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Date.now().toString(36)}-${Array.from(bytes)
    .map((n) => n.toString(36))
    .join("")}`;
}

export async function sha256(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
