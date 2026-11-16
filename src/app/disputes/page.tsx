"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Scale } from "lucide-react";
import { JudgeBox } from "@/components/actions";
import { Footer, Header } from "@/components/chrome";
import { Chip, EmptyState, Kicker, VerdictChip } from "@/components/primitives";
import { IS_CONFIGURED, PARAMS } from "@/lib/config";
import { countdown, dateTimeOf, gen, shortHex } from "@/lib/format";
import { getDispute, getTotals, type DisputeView } from "@/lib/genlayer";

type Row = { dispute: DisputeView };

function DisputeCard({ dispute, onChanged }: { dispute: DisputeView; onChanged: () => void }) {
  const open = dispute.verdict === "";
  return (
    <div className="panel" style={{ overflow: "hidden" }}>
      <div style={{ padding: "20px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="font-mono2" style={{ fontSize: 12, letterSpacing: "0.1em", color: "var(--muted)" }}>
            DISPUTE #{dispute.id}
          </span>
          <VerdictChip verdict={dispute.verdict} />
          {dispute.label ? <Chip tone="ink">{dispute.label}</Chip> : null}
          {open ? <Chip tone="warn">{countdown(dispute.judge_deadline)}</Chip> : null}
        </div>
        <span className="font-mono2" style={{ fontSize: 11.5, color: "var(--muted)" }}>
          opened {dateTimeOf(dispute.created_at)}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, borderTop: "1px solid var(--line-soft)" }}>
        {[
          { tag: "TEXT 1 · earlier", e: dispute.a },
          { tag: "TEXT 2 · later", e: dispute.b },
        ].map((side, i) => (
          <div
            key={side.tag}
            style={{
              padding: "18px 22px",
              borderRight: i === 0 ? "1px solid var(--line-soft)" : "none",
              gridColumn: i === 0 ? 1 : 3,
            }}
          >
            <div className="font-mono2" style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-dark)" }}>
              {side.tag}
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: "10px 0 0", color: "var(--ink)" }}>
              {side.e.text
                ? side.e.text.length > 180
                  ? `${side.e.text.slice(0, 180)}…`
                  : side.e.text
                : "revealed text"}
            </p>
            <Link
              href={`/entry/${side.e.id}`}
              className="font-mono2"
              style={{ fontSize: 11.5, color: "var(--accent-dark)", marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, letterSpacing: "0.06em" }}
            >
              ENTRY #{side.e.id} · {shortHex(side.e.author)} <ArrowRight size={12} />
            </Link>
          </div>
        ))}
        <div style={{ gridColumn: 2, display: "grid", placeItems: "center", padding: "0 14px", borderRight: "1px solid var(--line-soft)" }}>
          <Scale size={20} color="var(--accent-dark)" strokeWidth={1.6} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          padding: "14px 22px",
          borderTop: "1px solid var(--line-soft)",
          fontSize: 12.5,
          color: "var(--muted)",
        }}
      >
        <span>
          stake <strong style={{ color: "var(--ink)" }}>{gen(dispute.stake)} GEN</strong>
        </span>
        <span>
          bond at play <strong style={{ color: "var(--ink)" }}>{dispute.winnable ? `${gen(dispute.b.bond)} GEN` : "—"}</strong>
        </span>
        <span>
          to challenger <strong style={{ color: "var(--ink)" }}>{dispute.verdict ? `${gen(dispute.to_challenger)} GEN` : "pending"}</strong>
        </span>
        <span>
          to accused <strong style={{ color: "var(--ink)" }}>{dispute.verdict ? `${gen(dispute.to_accused)} GEN` : "pending"}</strong>
        </span>
        <span style={{ marginLeft: "auto" }}>
          sealed {Math.floor(dispute.seconds_between / 60)} min apart
        </span>
      </div>

      {open ? (
        <div style={{ padding: "0 22px 22px" }}>
          <JudgeBox disputeId={dispute.id} deadline={dispute.judge_deadline} onDone={onChanged} />
        </div>
      ) : null}
    </div>
  );
}

export default function DisputesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    if (!IS_CONFIGURED) {
      setLoading(false);
      return;
    }
    try {
      const totals = await getTotals();
      const count = totals?.disputes ?? 0;
      setTotal(count);
      const ids = Array.from({ length: Math.min(count, 24) }, (_, i) => count - i).filter((id) => id >= 1);
      const out: Row[] = [];
      for (const id of ids) {
        const r = await getDispute(id);
        if (r.found) out.push({ dispute: r });
      }
      setRows(out);
    } catch {
      /* keep current rows */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  const open = rows.filter((r) => !r.dispute.verdict).length;

  return (
    <>
      <Header />
      <main className="shell" style={{ paddingTop: 40, minHeight: "60vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 18 }}>
          <div>
            <Kicker>
              {total} filed · {open} awaiting a read
            </Kicker>
            <h2 className="h-display on-paper" style={{ fontSize: "clamp(36px, 5vw, 64px)", margin: "14px 0 0" }}>
              The <em>Disputes</em>
            </h2>
            <p style={{ color: "var(--muted)", maxWidth: 540, fontSize: 14.5, lineHeight: 1.6 }}>
              Each dispute pits an earlier entry against a later one. Validators read both texts
              blind - the earlier always as TEXT 1 - and answer one label. Unread disputes close as
              stale after {PARAMS.judgeWindowHours} hours.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 30, marginBottom: 70, display: "grid", gap: 16 }}>
          {!IS_CONFIGURED ? (
            <EmptyState
              title="No contract configured yet"
              body="Set the deployed address - one environment variable - and the disputes read straight from the chain."
            >
              <Link href="/docs" className="btn ghost small">
                Deployment guide
              </Link>
            </EmptyState>
          ) : loading ? (
            Array.from({ length: 2 }).map((_, i) => <div key={i} className="shimmer" style={{ height: 260 }} />)
          ) : rows.length === 0 ? (
            <EmptyState
              title="No disputes yet"
              body="When an earlier author stakes 5 GEN against a later entry, the pair lands here for a blind read."
            />
          ) : (
            rows.map((r) => <DisputeCard key={r.dispute.id} dispute={r.dispute} onChanged={() => void load()} />)
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
