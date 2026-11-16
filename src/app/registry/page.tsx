"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Eye, FileLock2, Inbox, RefreshCw } from "lucide-react";
import { Footer, Header } from "@/components/chrome";
import { Chip, EmptyState, Kicker, StateChip } from "@/components/primitives";
import { IS_CONFIGURED } from "@/lib/config";
import { dateOf, gen, shortHex, shortSeal } from "@/lib/format";
import { listEntries, type EntryList, type EntryView } from "@/lib/genlayer";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "SEALED", label: "Sealed" },
  { id: "REVEALED", label: "Revealed" },
  { id: "marked", label: "Marked" },
  { id: "MATURED", label: "Matured" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

function matches(entry: EntryView, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "marked") return entry.derived_from > 0 || entry.adjacent > 0 || entry.absolved > 0;
  return entry.state === filter;
}

function EntryCard({ entry }: { entry: EntryView }) {
  return (
    <Link href={`/entry/${entry.id}`} className="panel pad lift" style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span className="font-mono2" style={{ fontSize: 12, letterSpacing: "0.1em", color: "var(--muted)" }}>
          ENTRY #{entry.id}
        </span>
        <StateChip state={entry.state} />
      </div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
        {entry.revealed ? <Eye size={16} color="var(--accent-dark)" /> : <FileLock2 size={16} color="var(--muted)" />}
        <span className="font-mono2" style={{ fontSize: 13, color: "var(--accent-dark)" }}>
          {shortSeal(entry.seal)}
        </span>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)", margin: "12px 0 0", minHeight: 44 }}>
        {entry.revealed
          ? entry.text.length > 120
            ? `${entry.text.slice(0, 120)}…`
            : entry.text
          : "Sealed. The text stays with the author until reveal."}
      </p>
      <div className="divider" style={{ margin: "14px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--muted)" }}>
        <span>sealed {dateOf(entry.sealed_at)}</span>
        <span>{shortHex(entry.author)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          bond <strong style={{ color: "var(--ink)" }}>{gen(entry.bond_left)} GEN</strong>
        </span>
        <span style={{ display: "inline-flex", gap: 6 }}>
          {entry.derived_from > 0 ? <Chip tone="danger">derived from #{entry.derived_from}</Chip> : null}
          {entry.open_disputes > 0 ? <Chip tone="warn">{entry.open_disputes} open</Chip> : null}
          <ArrowUpRight size={15} color="var(--accent-dark)" />
        </span>
      </div>
    </Link>
  );
}

export default function RegistryPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [data, setData] = useState<EntryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<EntryView[]>([]);
  const PAGE = 12;

  const load = useCallback(
    async (at: number, append: boolean) => {
      if (!IS_CONFIGURED) {
        setLoading(false);
        return;
      }
      try {
        const out = await listEntries("", at, PAGE);
        setData(out);
        setItems((prev) => (append ? [...prev, ...out.items] : out.items));
      } catch {
        /* network hiccup; keep what we have */
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    void load(0, false);
    const t = setInterval(() => void load(0, false), 25000);
    return () => clearInterval(t);
  }, [load]);

  const shown = items.filter((e) => matches(e, filter));
  const total = data?.total ?? 0;

  return (
    <>
      <Header />
      <main className="shell" style={{ paddingTop: 40, minHeight: "60vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 18 }}>
          <div>
            <Kicker>Public record · {total} sealed</Kicker>
            <h2 className="h-display on-paper" style={{ fontSize: "clamp(36px, 5vw, 64px)", margin: "14px 0 0" }}>
              The <em>Registry</em>
            </h2>
            <p style={{ color: "var(--muted)", maxWidth: 520, fontSize: 14.5, lineHeight: 1.6 }}>
              Every seal, newest first. Sealed entries show a hash and a date; revealed ones show
              the text. Marks are written by verdicts, not by people.
            </p>
          </div>
          <a href="/seal" className="btn">
            Seal yours <ArrowUpRight size={15} />
          </a>
        </div>

        <div className="filter-row" style={{ marginTop: 30 }} role="tablist" aria-label="Entry filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`filter-button${filter === f.id ? " is-active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 22, marginBottom: 70 }}>
          {!IS_CONFIGURED ? (
            <EmptyState
              title="No contract configured yet"
              body="Deploy contracts/antedate.py to Studio Next, set the address in the environment (a single variable), and this page reads straight from the chain. The full flow is in the docs."
            >
              <Link href="/docs" className="btn ghost small">
                Read the deployment guide
              </Link>
            </EmptyState>
          ) : loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="shimmer" style={{ height: 210 }} />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              title={total === 0 ? "Nothing sealed yet" : "Nothing under this filter"}
              body={
                total === 0
                  ? "The registry is live and empty - the first seal is the cheapest piece of provenance there is."
                  : "Try another filter, or seal something that belongs here."
              }
            >
              <span className="chip tone-ink">
                <Inbox size={12} /> chain 61997
              </span>
            </EmptyState>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {shown.map((e) => (
                  <EntryCard key={e.id} entry={e} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, flexWrap: "wrap", gap: 12 }}>
                <span className="font-mono2" style={{ fontSize: 11.5, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase" }}>
                  {items.length} of {total} loaded · refreshes every 25s
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn ghost small" onClick={() => void load(0, false)}>
                    <RefreshCw size={14} /> Refresh
                  </button>
                  {items.length < total ? (
                    <button
                      className="btn small"
                      onClick={() => {
                        const next = offset + PAGE;
                        setOffset(next);
                        void load(next, true);
                      }}
                    >
                      Load more
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
