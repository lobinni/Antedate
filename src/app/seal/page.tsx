"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Download, FileLock2, Loader2, PartyPopper, RefreshCw, Wallet } from "lucide-react";
import { Footer, Header } from "@/components/chrome";
import { useWallet } from "@/components/wallet";
import { Field, Kicker, StatusLine } from "@/components/primitives";
import { IS_CONFIGURED, PARAMS } from "@/lib/config";
import { extractTxError, listEntries, waitFinalized, writerFor } from "@/lib/genlayer";
import { randomSalt, saveTicket, sealHash, ticketFile } from "@/lib/seal";

const PLACEHOLDER =
  "Describe the idea as you would to a careful reader: what it does, what makes it distinct, how it works. Up to 1500 characters. Do not seal a secret - a reveal is public.";

export default function SealPage() {
  const { address, connect, connecting, hasWallet, wrongChain, switchChain } = useWallet();
  const [text, setText] = useState("");
  const [salt, setSalt] = useState("");
  const [seal, setSeal] = useState("");
  const [bond, setBond] = useState<number>(PARAMS.minBondGen);
  const [phase, setPhase] = useState<"idle" | "sign" | "wait" | "done" | "error">("idle");
  const [note, setNote] = useState("");
  const [entryId, setEntryId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSalt((s) => s || randomSalt());
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!text.trim() || !salt.trim() || !address) {
      setSeal("");
      return;
    }
    sealHash(text, salt, address).then((h) => {
      if (!cancelled) setSeal(h);
    });
    return () => {
      cancelled = true;
    };
  }, [text, salt, address]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const charsLeft = PARAMS.maxTextChars - text.length;
  const busy = phase === "sign" || phase === "wait";
  const ready = Boolean(address && seal && charsLeft >= 0);

  const steps = useMemo(
    () => [
      { n: 1, label: "Wallet", done: Boolean(address && !wrongChain) },
      { n: 2, label: "Text", done: text.trim().length > 0 },
      { n: 3, label: "Seal", done: Boolean(seal) },
      { n: 4, label: "Bond", done: phase === "done" },
    ],
    [address, wrongChain, text, seal, phase],
  );

  async function submit() {
    if (!address) return;
    setPhase("sign");
    setNote("Confirm the bond in your wallet…");
    try {
      const provider = (window as unknown as { ethereum: import("@/lib/chain").Eip1193Provider }).ethereum;
      const write = writerFor(address, provider);
      const hash = await write({
        functionName: "register",
        args: [seal],
        value: BigInt(bond) * PARAMS.wei,
      });
      setPhase("wait");
      setNote(`Submitted ${hash.slice(0, 12)}… waiting for consensus.`);
      await waitFinalized(hash);
      const mine = await listEntries(address, 0, 10);
      const found = mine.items.find((e) => e.seal === seal);
      const id = found?.id ?? 0;
      const sealedAt = found?.sealed_at ?? Math.floor(Date.now() / 1000);
      if (id > 0) {
        saveTicket({ entryId: id, text, salt, seal, author: address, sealedAt });
        setEntryId(id);
      }
      setPhase("done");
      setNote(id > 0 ? `Sealed as entry #${id}. The date is on chain.` : "Sealed. The date is on chain.");
    } catch (error) {
      setPhase("error");
      setNote(extractTxError(error));
    }
  }

  const file = entryId
    ? ticketFile({ entryId, text, salt, seal, author: address ?? "", sealedAt: Math.floor(Date.now() / 1000) })
    : null;

  return (
    <>
      <Header />
      <main className="shell" style={{ paddingTop: 40, marginBottom: 70 }}>
        <Kicker>The seal desk</Kicker>
        <h1 className="h-display on-paper" style={{ fontSize: "clamp(36px, 5vw, 64px)", margin: "14px 0 10px" }}>
          Seal it <em>first.</em>
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 560, fontSize: 14.5, lineHeight: 1.6 }}>
          Four moves. The hash leaves your machine - the text does not. Your ticket (text + salt) is
          stored in this browser and nowhere else; download it, because the browser is the only copy.
        </p>

        {/* progress rail */}
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--line)", marginTop: 26, width: "max-content", maxWidth: "100%", flexWrap: "wrap", background: "var(--paper)" }}>
          {steps.map((s) => (
            <div
              key={s.n}
              className="font-mono2"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                fontSize: 11.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: s.done ? "var(--accent-dark)" : "var(--muted)",
                borderRight: "1px solid var(--line-soft)",
              }}
            >
              {s.done ? <Check size={13} /> : <span>{s.n}</span>}
              {s.label}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginTop: 22, alignItems: "start" }}>
          {/* left: text + salt */}
          <div className="panel pad">
            <div className="kicker">1 · The description</div>
            <div style={{ marginTop: 16 }}>
              <Field label={`Text · ${charsLeft} characters left`}>
                <textarea
                  className="textarea"
                  style={{ minHeight: 200 }}
                  placeholder={PLACEHOLDER}
                  maxLength={PARAMS.maxTextChars}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </Field>
              <Field
                label="Salt - makes the seal yours alone"
                hint="Random by default. Keep it with the text; both are needed at reveal."
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input font-mono2" style={{ fontSize: 12.5 }} value={salt} maxLength={PARAMS.maxSaltChars} onChange={(e) => setSalt(e.target.value.replace(/\|/g, ""))} />
                  <button className="btn ghost small" onClick={() => setSalt(randomSalt())} title="New salt">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </Field>
            </div>
          </div>

          {/* right: seal + bond */}
          <div style={{ display: "grid", gap: 16 }}>
            <div className="panel pad">
              <div className="kicker">2 · The seal</div>
              <div
                className="font-mono2"
                style={{
                  marginTop: 16,
                  padding: "16px",
                  border: "1px dashed #087f7155",
                  background: "var(--accent-soft)",
                  color: "var(--accent-dark)",
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  wordBreak: "break-all",
                  minHeight: 78,
                }}
              >
                {seal || "Write your description and connect your wallet - the seal appears here, computed locally."}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn ghost small" disabled={!seal} onClick={() => { void navigator.clipboard.writeText(seal); setCopied(true); }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy seal"}
                </button>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.6 }}>
                sha256 of text, salt and your address joined by a bar - the same bytes the contract
                recomputes at reveal.
              </p>
            </div>

            <div className="panel pad">
              <div className="kicker">3 · The bond</div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                {[2, 3, 5].map((v) => (
                  <button
                    key={v}
                    className={`filter-button${bond === v ? " is-active" : ""}`}
                    style={{ border: "1px solid var(--line)" }}
                    onClick={() => setBond(v)}
                  >
                    {v} GEN
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.6 }}>
                Held for {PARAMS.seasonDays} days. If a dispute against this entry is upheld inside
                the season, the bond goes to the challenger. Otherwise it comes back.
              </p>
            </div>

            <div className="panel pad night">
              <div className="kicker on-night">4 · Commit</div>
              <h3 className="font-display" style={{ fontSize: 20, fontWeight: 800, margin: "12px 0 6px" }}>
                Put the date on chain
              </h3>
              {!IS_CONFIGURED ? (
                <StatusLine kind="info">
                  <FileLock2 size={15} /> No contract configured - deploy first (see the docs), then
                  this desk goes live.
                </StatusLine>
              ) : null}
              {!address ? (
                <button className="btn accent" style={{ marginTop: 14, width: "100%" }} disabled={connecting} onClick={() => void connect()}>
                  {connecting ? <Loader2 size={15} className="spin" /> : <Wallet size={15} />}
                  {hasWallet ? "Connect MetaMask" : "Install MetaMask"}
                </button>
              ) : wrongChain ? (
                <button className="btn accent" style={{ marginTop: 14, width: "100%" }} onClick={() => void switchChain()}>
                  Switch MetaMask to Studio Next (chain 61997)
                </button>
              ) : phase === "done" && entryId ? (
                <div style={{ marginTop: 14 }}>
                  <StatusLine kind="ok">
                    <PartyPopper size={15} /> {note}
                  </StatusLine>
                  <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    {file ? (
                      <a className="btn accent small" href={file.url} download={file.name}>
                        <Download size={14} /> Download ticket
                      </a>
                    ) : null}
                    <Link className="btn on-night small" style={{ background: "transparent", color: "#f8fcf9" }} href={`/entry/${entryId}`}>
                      View entry <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : (
                <button className="btn accent" style={{ marginTop: 14, width: "100%" }} disabled={!ready || busy || !IS_CONFIGURED} onClick={() => void submit()}>
                  {busy ? <Loader2 size={15} className="spin" /> : <FileLock2 size={15} />}
                  Seal with {bond} GEN
                </button>
              )}
              {phase !== "idle" && phase !== "done" ? (
                <div style={{ marginTop: 12 }}>
                  <StatusLine kind={phase === "error" ? "err" : "info"}>
                    {busy ? <Loader2 size={15} className="spin" /> : null}
                    <span style={{ wordBreak: "break-word" }}>{note}</span>
                  </StatusLine>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
