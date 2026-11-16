"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Copy, Eye, FileLock2, Gavel } from "lucide-react";
import { ChallengeBox, CloseBox, RevealBox } from "@/components/actions";
import { Footer, Header } from "@/components/chrome";
import { Chip, EmptyState, Kicker, StateChip, Stat, VerdictChip } from "@/components/primitives";
import { CONTRACT_ADDRESS, explorerAddress } from "@/lib/config";
import { countdown, dateTimeOf, gen, shortHex } from "@/lib/format";
import { getEntry, listMarks, type EntryView, type MarksResult } from "@/lib/genlayer";

export default function EntryPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [entry, setEntry] = useState<EntryView | null>(null);
  const [marks, setMarks] = useState<MarksResult | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setMissing(true);
      setLoading(false);
      return;
    }
    try {
      const e = await getEntry(id);
      if (!e.found) {
        setMissing(true);
        return;
      }
      setEntry(e);
      const m = await listMarks(id);
      if (m.found) setMarks(m);
    } catch {
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Header />
      <main className="shell" style={{ paddingTop: 40, marginBottom: 70, minHeight: "60vh" }}>
        <Link href="/registry" className="kicker" style={{ textDecoration: "none" }}>
          <ArrowLeft size={13} /> Back to the registry
        </Link>

        {loading ? (
          <div className="shimmer" style={{ height: 340, marginTop: 24 }} />
        ) : missing || !entry ? (
          <div style={{ marginTop: 24 }}>
            <EmptyState
              title={`Entry #${id} is not on the record`}
              body="It may belong to another deployment, or the configured contract has not been deployed yet."
            />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginTop: 24, alignItems: "start" }}>
            {/* main column */}
            <div style={{ display: "grid", gap: 16 }}>
              <div className="panel pad">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="font-mono2" style={{ fontSize: 12, letterSpacing: "0.12em", color: "var(--muted)" }}>
                    ENTRY #{entry.id}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <StateChip state={entry.state} />
                    {entry.derived_from > 0 ? <Chip tone="danger">derived from #{entry.derived_from}</Chip> : null}
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  {entry.revealed ? (
                    <>
                      <div className="kicker">
                        <Eye size={13} /> Revealed text
                      </div>
                      <p style={{ fontSize: 16.5, lineHeight: 1.75, margin: "14px 0 0" }}>{entry.text}</p>
                    </>
                  ) : (
                    <div style={{ padding: "26px 0", textAlign: "center" }}>
                      <FileLock2 size={26} color="var(--muted)" style={{ margin: "0 auto" }} />
                      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12, lineHeight: 1.6 }}>
                        Sealed. Only the seal and the date are public - the text stays with the
                        author until reveal.
                      </p>
                    </div>
                  )}
                </div>

                <div className="divider" style={{ margin: "18px 0" }} />
                <div style={{ display: "grid", gap: 8, fontSize: 13.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ color: "var(--muted)" }}>Seal</span>
                    <span className="font-mono2" style={{ color: "var(--accent-dark)", fontSize: 12, wordBreak: "break-all", textAlign: "right" }}>
                      {entry.seal}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ color: "var(--muted)" }}>Author</span>
                    <a href={explorerAddress(entry.author)} target="_blank" rel="noopener noreferrer" className="font-mono2" style={{ fontSize: 12, color: "var(--accent-dark)" }}>
                      {shortHex(entry.author, 10, 8)}
                    </a>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Contract</span>
                    <a href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" className="font-mono2" style={{ fontSize: 12, color: "var(--accent-dark)" }}>
                      {shortHex(CONTRACT_ADDRESS, 10, 8)}
                    </a>
                  </div>
                </div>
              </div>

              <RevealBox entry={entry} onDone={() => void load()} />
              <ChallengeBox entry={entry} onDone={() => void load()} />
            </div>

            {/* side column */}
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Stat label="Bond left" value={`${gen(entry.bond_left)} GEN`} sub={`of ${gen(entry.bond)} GEN`} />
                <Stat label="Disputes" value={String(entry.disputes)} sub={`${entry.open_disputes} open`} />
              </div>

              <div className="panel pad">
                <div className="kicker">
                  <CalendarClock size={13} /> Timeline
                </div>
                <div style={{ display: "grid", gap: 10, marginTop: 14, fontSize: 13.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Sealed</span>
                    <strong>{dateTimeOf(entry.sealed_at)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Revealed</span>
                    <strong>{entry.revealed_at ? dateTimeOf(entry.revealed_at) : "not yet"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Matures</span>
                    <strong>
                      {entry.state === "MATURED"
                        ? dateTimeOf(entry.matured_at)
                        : `${dateTimeOf(entry.matures_at)} · ${countdown(entry.matures_at)}`}
                    </strong>
                  </div>
                </div>
              </div>

              <CloseBox entry={entry} onDone={() => void load()} />

              <div className="panel pad">
                <div className="kicker">
                  <Gavel size={13} /> Marks · {marks?.marks.length ?? 0}
                </div>
                {marks && marks.marks.length > 0 ? (
                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {marks.marks.map((m) => (
                      <Link
                        key={m.id}
                        href="/disputes"
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--line-soft)", padding: "10px 12px", textDecoration: "none", color: "inherit" }}
                      >
                        <span className="font-mono2" style={{ fontSize: 11.5, color: "var(--muted)", letterSpacing: "0.06em" }}>
                          #{m.id} · as {m.role}
                        </span>
                        <VerdictChip verdict={m.verdict} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 12, lineHeight: 1.6 }}>
                    No dispute has touched this entry on either side.
                  </p>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
                  <Chip tone="ink">adjacent ×{entry.adjacent}</Chip>
                  <Chip tone="ink">absolved ×{entry.absolved}</Chip>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 26, color: "var(--muted)", fontSize: 12.5 }}>
          <Copy size={13} />
          Share this entry by its link - anyone can verify the seal without an account.
        </div>
      </main>
      <Footer />
    </>
  );
}
