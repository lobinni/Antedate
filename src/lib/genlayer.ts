/**
 * The chain face of Antedate. Reads always work; writes need a connected
 * wallet on chain 61997 and are signed in MetaMask - the site holds no key.
 */

import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { CONTRACT_ADDRESS, STUDIO_RPC } from "./config";
import type { Eip1193Provider } from "./chain";

export type GenlayerClient = ReturnType<typeof createClient>;

let _reader: GenlayerClient | null = null;

/** A read-only client; anyone can use it, no wallet required. */
export function readClient(): GenlayerClient {
  if (!_reader) {
    _reader = createClient({ chain: studioDevnet, endpoint: STUDIO_RPC });
  }
  return _reader;
}

/** A signing client bound to the visitor's MetaMask. */
export function writeClient(address: string, provider: Eip1193Provider): GenlayerClient {
  return createClient({
    chain: studioDevnet,
    endpoint: STUDIO_RPC,
    account: address as `0x${string}`,
    provider: provider as never,
  });
}

async function read(functionName: string, args: (string | number | bigint)[]): Promise<unknown> {
  return readClient().readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  });
}

function parse<T>(raw: unknown): T {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  return JSON.parse(text as string) as T;
}

// --- views -------------------------------------------------------------

export type Totals = {
  entries: number;
  disputes: number;
  received: string;
  bonds_left: string;
  stakes_held: string;
  owed: string;
  paid: string;
};

export type EntryView = {
  id: number;
  author: string;
  seal: string;
  bond: string;
  bond_left: string;
  sealed_at: number;
  matures_at: number;
  state: "SEALED" | "REVEALED" | "MATURED";
  revealed: boolean;
  revealed_at: number;
  text: string;
  salt: string;
  matured_at: number;
  matured_by: string;
  derived_from: number;
  adjacent: number;
  absolved: number;
  open_disputes: number;
  disputes: number;
};

export type EntryResult = ({ found: true } & EntryView) | { found: false };

export type EntryList = {
  found: boolean;
  total: number;
  offset: number;
  items: EntryView[];
  totals?: Totals;
  balance?: string;
  earned?: string;
  withdrawn?: string;
};

export type DisputeView = {
  id: number;
  a: EntryView;
  b: EntryView;
  seconds_between: number;
  challenger: string;
  accused: string;
  stake: string;
  winnable: boolean;
  label: string;
  verdict: string;
  to_challenger: string;
  bonus: string;
  to_accused: string;
  created_at: number;
  judge_deadline: number;
  resolved_at: number;
  resolved_by: string;
};

export type DisputeResult = ({ found: true } & DisputeView) | { found: false; totals?: Totals };

export type MarksResult = {
  found: boolean;
  entry_id: number;
  derived_from: number;
  adjacent: number;
  absolved: number;
  marks: { id: number; a_id: number; b_id: number; role: string; label: string; verdict: string; created_at: number }[];
  totals?: Totals;
};

export async function getEntry(id: number): Promise<EntryResult> {
  return parse<EntryResult>(await read("get_entry", [id]));
}

export async function getDispute(id: number): Promise<DisputeResult> {
  return parse<DisputeResult>(await read("get_dispute", [id]));
}

export async function listEntries(account = "", offset = 0, limit = 24): Promise<EntryList> {
  return parse<EntryList>(await read("list_entries", [account, offset, limit]));
}

export async function listMarks(entryId: number): Promise<MarksResult> {
  return parse<MarksResult>(await read("list_marks", [entryId]));
}

/** Totals from a cheap read; an empty table still answers. */
export async function getTotals(): Promise<Totals | null> {
  const out = await listEntries("", 0, 1);
  return out.totals ?? null;
}

// --- writes ---------------------------------------------------------------

export type WriteFn = (args: {
  functionName: string;
  args?: (string | number | bigint)[];
  value?: bigint;
}) => Promise<`0x${string}`>;

/**
 * Build a write function for the visitor's wallet.
 *
 * GenLayer charges validator/consensus fees on top of gas. A write submitted
 * without them is rejected with FeeValueMustBeNonZero, so every write first
 * estimates the fees at the network's current policy and attaches them.
 */
export function writerFor(address: string, provider: Eip1193Provider): WriteFn {
  const client = writeClient(address, provider);
  return async ({ functionName, args = [], value }) => {
    const base = {
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      value,
    };
    const estimate = await client.estimateTransactionFeesForWrite(base);
    const hash = (await client.writeContract({
      ...base,
      fees: {
        distribution: estimate.distribution,
        feeValue: estimate.feeValue,
        messageAllocations: estimate.messageAllocations,
      },
      consensusMaxRotations: 6,
    })) as `0x${string}`;
    return hash;
  };
}

export async function waitFinalized(hash: `0x${string}`, retries = 220): Promise<unknown> {
  return readClient().waitForTransactionReceipt({
    hash: hash as never,
    status: TransactionStatus.FINALIZED,
    interval: 2500,
    retries,
    fullTransaction: false,
  });
}

/**
 * Wallet and RPC errors bury the contract's refusal three levels deep. Walk
 * the cause chain and prefer the on-chain reason (the contract prefixes its
 * deliberate refusals with "[EXPECTED]").
 */
export function extractTxError(error: unknown): string {
  const seen = new Set<unknown>();
  let current: unknown = error;
  let fallback = "";
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as Record<string, unknown>;
    for (const key of ["shortMessage", "details", "message"]) {
      const value = record[key];
      if (typeof value !== "string" || !value) continue;
      if (!fallback) fallback = value;
      const expected = value.match(/\[EXPECTED\]\s*[^\n"\\]+/);
      if (expected) {
        return `The contract refused: ${expected[0].replace("[EXPECTED]", "").trim()}`;
      }
      const reverted = value.match(/(?:reverted|execution failed)[:\s]+([^\n]+)/i);
      if (reverted && !/^(?:with unspecified reason)?$/i.test(reverted[1].trim())) {
        fallback = reverted[1].trim().slice(0, 220);
      }
    }
    const data = record.data;
    if (data && typeof data === "object") {
      const inner = (data as Record<string, unknown>).message;
      if (typeof inner === "string" && inner && inner !== "execution failed") {
        const expected = inner.match(/\[EXPECTED\]\s*[^\n"\\]+/);
        if (expected) return `The contract refused: ${expected[0].replace("[EXPECTED]", "").trim()}`;
        fallback = inner.slice(0, 220);
      }
    }
    current = record.cause;
  }
  // Studio's simulation endpoint answers "execution failed" without a reason.
  // Translate it into guidance instead of passing the cryptic wrapper through.
  if (/execution failed|missing or invalid parameters/i.test(fallback)) {
    return "The network's simulation refused this call with no reason attached: a guard failed (check the checklist above) or the balance cannot cover the amount plus network fees.";
  }
  return (fallback || "The transaction failed.").slice(0, 220);
}

/** Decode a return value out of a finalized receipt, best effort. */
export function receiptVerdict(receipt: unknown): string {
  try {
    const r = receipt as Record<string, unknown>;
    const data = (r?.data as Record<string, unknown>) ?? {};
    const direct = (r?.result ?? data?.result) as unknown;
    if (typeof direct === "string" && direct) return direct;
    const nested = (data as Record<string, unknown>)?.execution_result ?? data;
    const text = JSON.stringify(nested);
    const m = text.match(/"(UPHELD|ADJACENT|ABSOLVED|STALE)"/);
    return m ? m[1] : "";
  } catch {
    return "";
  }
}
