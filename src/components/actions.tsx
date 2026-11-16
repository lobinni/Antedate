"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Gavel, Hourglass, KeyRound, Loader2, Scale, ShieldCheck } from "lucide-react";
import { PARAMS } from "@/lib/config";
import { countdown } from "@/lib/format";
import {
  extractTxError,
  getEntry,
  listMarks,
  receiptVerdict,
  waitFinalized,
  writerFor,
  type EntryView,
  type WriteFn,
} from "@/lib/genlayer";
import { findTicket, sealHash, type Ticket } from "@/lib/seal";
import { useWallet } from "./wallet";
import { Field, StatusLine } from "./primitives";

type Phase = "idle" | "sign" | "wait" | "done" | "error";

function useTxRunner() {
  const { address, provider, connect, hasWallet } = useWallet();
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState("");

  async function run(label: string, fn: (write: WriteFn, from: string) => Promise<string>): Promise<void> {
    if (!hasWallet) {
      setPhase("error");
      setNote("No wallet found. Install MetaMask to continue.");
      return;
    }
    if (!address || !provider) {
      setPhase("error");
      setNote("Connect your wallet first.");
      await connect().catch(() => {});
      return;
    }
    setPhase("sign");
    setNote(`${label}: confirm in your wallet…`);
    try {
      const message = await fn(writerFor(address, provider), address);
      setPhase("done");
      setNote(message);
    } catch (error) {
      setPhase("error");
      setNote(extractTxError(error));
    }
  }

  const spinner = phase === "sign" || phase === "wait";
  return { phase, note, run, spinner };
}

function TxNote({ phase, note }: { phase: Phase; note: string }) {
  if (phase === "idle" || !note) return null;
  const kind = phase === "done" ? "ok" : phase === "error" ? "err" : "info";
  return (
    <div style={{ marginTop: 14 }}>
      <StatusLine kind={kind}>
        {phase === "sign" || phase === "wait" ? <Loader2 size={15} className="spin" /> : null}
        <span style={{ wordBreak: "break-word" }}>{note}</span>
      </StatusLine>
    </div>
  );
}

/* --- reveal ---------------------------------------------------------------- */

export function RevealBox({ entry, onDone }: { entry: EntryView; onDone: () => void }) {
  const { address } = useWallet();
  const { phase, note, run, spinner } = useTxRunner();
  const [text, setText] = useState("");
  const [salt, setSalt] = useState("");
  const [ticket, setTicket] = useState<Ticket | undefined>(undefined);
  const [sealOk, setSealOk] = useState<boolean | null>(null);

  useEffect(() => {
    const found = findTicket(entry.id, address ?? undefined);
    if (found) {
      setTicket(found);
      setText(found.text);
      setSalt(found.salt);
    }
  }, [entry.id, address]);

  // Client-side parity: the browser computes the same bytes as the contract.
  useEffect(() => {
    if (!text.trim() || !salt.trim()) {
      setSealOk(null);
      return;
    }
    let dead = false;
    sealHash(text, salt, entry.author).then((h) => {
      if (!dead) setSealOk(h === entry.seal);
    });
    return () => {
      dead = true;
    };
  }, [text, salt, entry.author, entry.seal]);

  const isAuthor = address && entry.author.toLowerCase() === address.toLowerCase();
  if (!isAuthor || entry.revealed) return null;

  return (
    <div className="panel pad" style={{ borderColor: "#087f7140", background: "var(--accent-soft)" }}>
      <div className="kicker">
        <KeyRound size={13} /> Your entry · still sealed
      </div>
      <h3 className="font-display" style={{ fontSize: 21, fontWeight: 800, margin: "12px 0 6px" }}>
        Reveal it when it matters
      </h3>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
        {ticket
          ? "A ticket was found in this browser - the fields below are prefilled from it."
          : "Paste the exact text and salt you sealed. The contract checks them against the seal; the date never changes."}
      </p>
      <Field label="Text as sealed">
        <textarea className="textarea" value={text} maxLength={PARAMS.maxTextChars} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Field label="Salt">
        <input className="input" value={salt} maxLength={PARAMS.maxSaltChars} onChange={(e) => setSalt(e.target.value)} />
      </Field>
      {sealOk === false ? (
        <StatusLine kind="err">
          <AlertTriangle size={15} />
          This text and salt do not reproduce the on-chain seal. Nothing was sent; the reveal would
          be refused. Re-check both against your ticket.
        </StatusLine>
      ) : null}
      <button
        className="btn"
        style={{ marginTop: 12 }}
        disabled={spinner || !text.trim() || !salt.trim() || sealOk === false}
        onClick={() =>
          run("Reveal", async (w) => {
            const h = await w({ functionName: "reveal", args: [entry.id, text, salt] });
            await waitFinalized(h);
            onDone();
            return "Revealed. The seal holds.";
          })
        }
      >
        {spinner ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />}
        Reveal and verify
      </button>
      <TxNote phase={phase} note={note} />
    </div>
  );
}

/* --- challenge --------------------------------------------------------------- */

export function ChallengeBox({ entry, onDone }: { entry: EntryView; onDone: () => void }) {
  const { address, provider } = useWallet();
  const { phase, note, run, spinner } = useTxRunner();
  const [aId, setAId] = useState("");
  const [checking, setChecking] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  // Preflight: replay every guard the contract enforces, so a refusal arrives
  // as a sentence here instead of a wallet error there.
  useEffect(() => {
    if (!address || !aId) {
      setProblems([]);
      return;
    }
    let dead = false;
    const timer = setTimeout(async () => {
      setChecking(true);
      const found: string[] = [];
      try {
        const aid = Number(aId);
        if (!Number.isInteger(aid) || aid < 1) {
          found.push("The earlier id must be a positive whole number.");
        } else if (aid === entry.id) {
          found.push("An entry cannot be disputed against itself.");
        } else {
          const a = await getEntry(aid);
          if (!a.found) {
            found.push(`Entry #${aid} does not exist on this deployment.`);
          } else {
            if (a.author.toLowerCase() !== address.toLowerCase()) {
              found.push("Only the author of the earlier entry may open the dispute.");
            }
            if (!a.revealed || !entry.revealed) {
              found.push("Both entries must be revealed first.");
            }
            if (a.sealed_at >= entry.sealed_at) {
              found.push(`Entry #${aid} was not sealed strictly before this one - priority is arithmetic.`);
            }
            const marks = await listMarks(aid);
            if (
              marks.found &&
              marks.marks.some((m) => m.b_id === entry.id && m.verdict !== "STALE")
            ) {
              found.push("This pair has already been disputed.");
            }
          }
          if (!provider) {
            found.push("Connect your wallet to open a dispute.");
          } else {
            try {
              const raw = (await provider.request({
                method: "eth_getBalance",
                params: [address, "latest"],
              })) as string;
              const balance = BigInt(raw);
              const stake = BigInt(PARAMS.disputeStakeGen) * PARAMS.wei;
              if (balance < stake) {
                found.push(
                  `Your balance is below the ${PARAMS.disputeStakeGen} GEN stake (plus network fees). Top up from the studio faucet.`,
                );
              }
            } catch {
              /* balance read failed; the wallet will decide */
            }
          }
        }
      } catch {
        /* read hiccup - let the chain be the judge */
      }
      if (!dead) {
        setProblems(found);
        setChecking(false);
      }
    }, 350);
    return () => {
      dead = true;
      clearTimeout(timer);
    };
  }, [aId, address, entry, provider]);

  if (!address || !entry.revealed) return null;

  return (
    <div className="panel pad">
      <div className="kicker">
        <Gavel size={13} /> Dispute this entry
      </div>
      <h3 className="font-display" style={{ fontSize: 21, fontWeight: 800, margin: "12px 0 6px" }}>
        It looks like your earlier work?
      </h3>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
        Stake {PARAMS.disputeStakeGen} GEN. Validators compare the two texts blind - no dates, no
        names - and the chain derives the verdict from their label and the seal dates.
      </p>
      <Field label="Your earlier entry id" hint="You must be its author, sealed strictly before this one, and revealed.">
        <input
          className="input"
          value={aId}
          inputMode="numeric"
          placeholder="e.g. 4"
          onChange={(e) => setAId(e.target.value.replace(/[^0-9]/g, ""))}
        />
      </Field>
      {problems.map((p) => (
        <div key={p} style={{ marginBottom: 8 }}>
          <StatusLine kind="err">
            <AlertTriangle size={15} />
            {p}
          </StatusLine>
        </div>
      ))}
      <button
        className="btn"
        disabled={spinner || checking || !aId || problems.length > 0}
        onClick={() =>
          run("Dispute", async (w) => {
            const h = await w({
              functionName: "challenge",
              args: [Number(aId), entry.id],
              value: BigInt(PARAMS.disputeStakeGen) * PARAMS.wei,
            });
            await waitFinalized(h);
            onDone();
            return "Dispute opened. Anyone may now run the read.";
          })
        }
      >
        {spinner || checking ? <Loader2 size={15} className="spin" /> : <Gavel size={15} />}
        Stake {PARAMS.disputeStakeGen} GEN and open the dispute
      </button>
      <TxNote phase={phase} note={note} />
    </div>
  );
}

/* --- judge --------------------------------------------------------------------- */

export function JudgeBox({ disputeId, deadline, onDone }: { disputeId: number; deadline: number; onDone: () => void }) {
  const { address } = useWallet();
  const { phase, note, run, spinner } = useTxRunner();
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const stale = Date.now() / 1000 >= deadline;

  return (
    <div className="panel pad night">
      <div className="kicker on-night">
        <Scale size={13} /> {stale ? "Reading window elapsed" : `Reading window · ${countdown(deadline)}`}
      </div>
      <h3 className="font-display" style={{ fontSize: 21, fontWeight: 800, margin: "12px 0 6px" }}>
        {stale ? "Settle it as stale" : "Run the read"}
      </h3>
      <p style={{ color: "#f8fcf9a6", fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
        {stale
          ? "No verdict arrived inside the window. The next call marks the dispute stale, returns the stake, and unlocks the pair."
          : "Anyone may ask the validators. They read TEXT 1 (the earlier) and TEXT 2 (the later) and answer one label. The contract does the rest."}
      </p>
      <button
        className="btn accent"
        disabled={spinner || !address}
        onClick={() =>
          run("Read", async (w) => {
            const h = await w({ functionName: "judge", args: [disputeId] });
            const receipt = await waitFinalized(h);
            onDone();
            const verdict = receiptVerdict(receipt);
            return verdict ? `Verdict: ${verdict}.` : "Read settled. Refreshing the record…";
          })
        }
      >
        {spinner ? <Loader2 size={15} className="spin" /> : <Scale size={15} />}
        {address ? (stale ? "Mark stale" : "Ask the validators") : "Connect to run the read"}
      </button>
      <TxNote phase={phase} note={note} />
    </div>
  );
}

/* --- close / mature ---------------------------------------------------------------- */

export function CloseBox({ entry, onDone }: { entry: EntryView; onDone: () => void }) {
  const { phase, note, run, spinner } = useTxRunner();
  const matured = entry.state === "MATURED";
  const eligible =
    !matured && Date.now() / 1000 >= entry.matures_at && entry.open_disputes === 0 && entry.derived_from === 0;

  if (!eligible) return null;

  return (
    <div className="panel pad">
      <div className="kicker">
        <Hourglass size={13} /> Season complete
      </div>
      <h3 className="font-display" style={{ fontSize: 21, fontWeight: 800, margin: "12px 0 6px" }}>
        Close it and release the bond
      </h3>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
        Ninety days with nothing upheld: the bond of this entry goes back to its author. Anyone may
        call it; only the author is credited.
      </p>
      <button
        className="btn"
        disabled={spinner}
        onClick={() =>
          run("Close", async (w) => {
            const h = await w({ functionName: "close_entry", args: [entry.id] });
            await waitFinalized(h);
            onDone();
            return "Entry matured. Bond credited.";
          })
        }
      >
        {spinner ? <Loader2 size={15} className="spin" /> : <Hourglass size={15} />}
        Close the entry
      </button>
      <TxNote phase={phase} note={note} />
    </div>
  );
}
