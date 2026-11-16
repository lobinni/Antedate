/**
 * live-check.mjs - prove the deployed contract answers on Studio Next, using
 * the same read path as the web site (genlayer-js, chain 61997).
 *
 *   node scripts/live-check.mjs
 */

import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const ADDRESS = (process.env.ANTEDATE_ADDRESS || "0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65").trim();
const RPC = (process.env.ANTEDATE_RPC || "https://studio-dev.genlayer.com/api").trim();

const client = createClient({ chain: studioDevnet, endpoint: RPC });

async function view(functionName, args) {
  const out = await client.readContract({ address: ADDRESS, functionName, args });
  return JSON.parse(out);
}

console.log(`contract ${ADDRESS}`);
console.log(`endpoint ${RPC}`);

let failed = 0;

async function step(name, fn) {
  try {
    await fn();
    console.log(`pass  ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL  ${name}: ${String(error).slice(0, 160)}`);
  }
}

await step("list_entries answers with totals", async () => {
  const out = await view("list_entries", ["", 0, 5]);
  if (!out.found || !out.totals) throw new Error("missing totals");
  console.log(`  entries ${out.totals.entries} · disputes ${out.totals.disputes} · bonds ${Number(BigInt(out.totals.bonds_left)) / 1e18} GEN`);
});

await step("get_entry answers found:false for a gap", async () => {
  const out = await view("get_entry", [Number.MAX_SAFE_INTEGER - 1]);
  if (out.found !== false) throw new Error("expected found:false");
});

await step("get_dispute answers found:false for a gap", async () => {
  const out = await view("get_dispute", [7777777]);
  if (out.found !== false) throw new Error("expected found:false");
});

if (failed === 0) {
  console.log("\nlive read path OK - the site can talk to the deployment");
} else {
  console.log(`\n${failed} checks failed`);
  process.exit(1);
}
