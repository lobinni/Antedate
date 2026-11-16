"use client";

import { useEffect, useState } from "react";
import { IS_CONFIGURED, PARAMS } from "@/lib/config";
import { gen } from "@/lib/format";
import { getTotals, type Totals } from "@/lib/genlayer";

export default function LiveStats() {
  const [totals, setTotals] = useState<Totals | null>(null);

  useEffect(() => {
    if (!IS_CONFIGURED) return;
    let alive = true;
    const load = () =>
      getTotals()
        .then((t) => alive && setTotals(t))
        .catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const stats = [
    { label: "Entries sealed", value: totals ? String(totals.entries) : "—" },
    { label: "Disputes read", value: totals ? String(totals.disputes) : "—" },
    { label: "Bonds held", value: totals ? `${gen(totals.bonds_left)} GEN` : `${PARAMS.minBondGen} GEN min` },
    { label: "Dispute stake", value: `${PARAMS.disputeStakeGen} GEN`, sub: "fixed, returned or lost" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 1,
        background: "var(--light-line)",
        border: "1px solid var(--light-line)",
      }}
    >
      {stats.map((s) => (
        <div key={s.label} style={{ background: "#0b1a16", padding: "18px 22px" }}>
          <div
            className="font-mono2"
            style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#35d5b4" }}
          >
            {s.label}
          </div>
          <div className="font-display" style={{ fontSize: 30, fontWeight: 800, marginTop: 8, color: "#f8fcf9" }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
