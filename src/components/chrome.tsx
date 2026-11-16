"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Fingerprint, Loader2, Unplug, Wallet } from "lucide-react";
import { SITE, explorerAddress } from "@/lib/config";
import { cx, gen, shortHex } from "@/lib/format";
import { extractTxError, listEntries, waitFinalized, writerFor } from "@/lib/genlayer";
import { useWallet } from "./wallet";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Fingerprint size={19} strokeWidth={2.2} />
      </span>
      <span className={cx("font-display", light && "text-white")} style={{ fontSize: 17 }}>
        {SITE.name}
      </span>
      <span
        className="font-mono2"
        style={{
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: light ? "#35d5b4" : "var(--accent-dark)",
          marginTop: 4,
        }}
      >
        Registry
      </span>
    </span>
  );
}

function AccountMenu() {
  const { address, provider, refresh } = useWallet();
  const [open, setOpen] = useState(false);
  const [owed, setOwed] = useState<string>("0");
  const [earned, setEarned] = useState<string>("0");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!address || !open) return;
    listEntries(address, 0, 1)
      .then((r) => {
        setOwed(r.balance ?? "0");
        setEarned(r.earned ?? "0");
      })
      .catch(() => {});
  }, [address, open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!address) {
    return <ConnectButton />;
  }

  const withdraw = async () => {
    if (!provider) return;
    setBusy(true);
    setNote("Waiting for finalization…");
    try {
      const hash = await writerFor(address, provider)({ functionName: "withdraw" });
      await waitFinalized(hash);
      setNote("Paid out. Balance is zero.");
      setOwed("0");
      void refresh();
    } catch (error) {
      setNote(extractTxError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", justifySelf: "end" }}>
      <button
        className="btn ghost small"
        onClick={() => setOpen((v) => !v)}
        style={{ fontFamily: "var(--font-dm-mono), monospace", letterSpacing: "0.04em" }}
      >
        <span className="pulse-dot" />
        {shortHex(address)}
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s" }} />
      </button>
      {open ? (
        <div
          className="panel pad enter"
          style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 300, zIndex: 50 }}
        >
          <div className="font-mono2" style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>
            Account on chain
          </div>
          <a
            href={explorerAddress(address)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, fontWeight: 700, wordBreak: "break-all", color: "var(--accent-dark)" }}
          >
            {address}
          </a>
          <div className="divider" style={{ margin: "14px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
            <span style={{ color: "var(--muted)" }}>Owed to you</span>
            <strong>{gen(owed)} GEN</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginTop: 6 }}>
            <span style={{ color: "var(--muted)" }}>Earned lifetime</span>
            <strong>{gen(earned)} GEN</strong>
          </div>
          <button className="btn accent small" onClick={withdraw} disabled={busy || owed === "0"} style={{ width: "100%", marginTop: 14 }}>
            {busy ? <Loader2 size={14} className="spin" /> : <Wallet size={14} />}
            Withdraw balance
          </button>
          {note ? (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>{note}</div>
          ) : null}
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
            Withdraw is the only call that pays. Everything else moves balances inside the contract.
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ConnectButton() {
  const { hasWallet, connecting, connect, wrongChain, switchChain } = useWallet();
  if (wrongChain) {
    return (
      <button className="btn small" onClick={() => void switchChain()}>
        <Unplug size={14} />
        Switch to chain 61997
      </button>
    );
  }
  return (
    <button
      className="btn small"
      onClick={() => {
        if (!hasWallet) {
          window.open("https://metamask.io/download/", "_blank", "noopener");
          return;
        }
        void connect();
      }}
      disabled={connecting}
    >
      {connecting ? <Loader2 size={14} className="spin" /> : <Wallet size={14} />}
      {hasWallet ? (connecting ? "Connecting…" : "Connect wallet") : "Install MetaMask"}
    </button>
  );
}

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/registry", label: "Registry" },
  { href: "/disputes", label: "Disputes" },
  { href: "/seal", label: "Seal an idea" },
  { href: "/docs", label: "Docs" },
];

export function Header() {
  const path = usePathname();
  return (
    <header className="hdr">
      <div className="shell">
        <nav className="nav">
          <Link href="/" aria-label="Antedate home">
            <Brand />
          </Link>
          <div className="nav-links">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cx("nav-link", (l.href === "/" ? path === "/" : path.startsWith(l.href)) && "is-active")}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div style={{ justifySelf: "end", display: "flex", gap: 8 }}>
            <AccountMenu />
          </div>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="ftr">
      <div className="shell ftr-inner">
        <Brand light />
        <div className="ftr-meta">
          <span>{SITE.tagline}</span>
          <span>GenLayer Studio Next</span>
          <span>Chain 61997</span>
          <span>Only withdraw pays</span>
        </div>
      </div>
    </footer>
  );
}
