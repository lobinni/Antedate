/**
 * hash-parity.mjs - proves the browser/node seal matches the contract's:
 * sha256 over utf8(text | salt | address.toLowerCase()) against
 * tests/vectors.json. Run with any recent Node:
 *
 *   node scripts/hash-parity.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vectors = JSON.parse(readFileSync(join(root, "tests", "vectors.json"), "utf8"));

export async function sealHash(text, salt, address) {
  const data = new TextEncoder().encode(`${text}|${salt}|${address.toLowerCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let failed = 0;
for (const [i, v] of vectors.entries()) {
  const mine = await sealHash(v.text, v.salt, v.address);
  const ok = mine === v.seal;
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  vector ${i + 1}  ${mine.slice(0, 16)}…`);
}
console.log(failed === 0 ? `\n${vectors.length}/${vectors.length} vectors match - browser and chain agree` : `\n${failed} vectors FAILED`);
process.exit(failed === 0 ? 0 : 1);
