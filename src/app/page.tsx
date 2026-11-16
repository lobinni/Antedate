import Link from "next/link";
import { ArrowRight, CalendarClock, Eye, FileLock2, Gavel, Landmark, Scale } from "lucide-react";
import { Footer, Header } from "@/components/chrome";
import HeroOrbit from "@/components/HeroOrbit";
import LiveStats from "@/components/LiveStats";
import { Chip, Kicker, Panel } from "@/components/primitives";
import { PARAMS, SITE } from "@/lib/config";

const STEPS = [
  {
    icon: FileLock2,
    title: "Seal",
    body: `Hash your description off-chain - text, salt and your address - and bond at least ${PARAMS.minBondGen} GEN. The chain stamps the date; the text stays with you.`,
    meta: "sha256 · bond held",
  },
  {
    icon: Eye,
    title: "Reveal",
    body: "Publish the text whenever it matters. The contract checks it against the seal. The date never moves.",
    meta: "author only · once",
  },
  {
    icon: Gavel,
    title: "Challenge",
    body: `A later entry looks like a copy? Stake exactly ${PARAMS.disputeStakeGen} GEN against it. Both texts must be public, yours sealed strictly first.`,
    meta: "5 GEN at risk",
  },
  {
    icon: Scale,
    title: "Read",
    body: "Validators compare the two texts blind - no dates, no names, yours always TEXT 1 - and agree on one label: substantial, partial or none.",
    meta: "consensus · blind",
  },
  {
    icon: Landmark,
    title: "Mark",
    body: "The contract derives the verdict in code from the label and the seal dates: upheld, adjacent or absolved. The mark lives on the entries.",
    meta: "verdict is code",
  },
];

const VERDICTS = [
  { name: "UPHELD", when: "substantial overlap", money: "Stake back, plus the later entry's bond if it was inside its 90 days. The later entry is marked as derived." },
  { name: "ADJACENT", when: "partial overlap", money: "Stake back. The bond stays. Both entries carry an adjacency note." },
  { name: "ABSOLVED", when: "no overlap", money: "The stake goes to the accused author." },
  { name: "MATURED", when: "90 days, nothing upheld", money: "The bond returns to its author. Anyone may call it." },
  { name: "STALE", when: "48 hours unread", money: "No model ran. The stake returns and the pair unlocks." },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        {/* ------------------------------------------------ hero */}
        <section className="shell">
          <div className="hero">
            <HeroOrbit />
            <div className="hero-inner">
              <div style={{ maxWidth: 860 }}>
                <div className="enter enter-1">
                  <Kicker night>GenLayer Studio Next · Chain 61997 · Live network</Kicker>
                </div>
                <h1
                  className="h-display enter enter-2"
                  style={{ fontSize: "clamp(46px, 7.4vw, 96px)", margin: "26px 0 0" }}
                >
                  {SITE.tagline.split(",")[0]}, <em>on record.</em>
                </h1>
                <p
                  className="enter enter-3"
                  style={{ color: "#f8fcf9b8", fontSize: 17.5, lineHeight: 1.65, maxWidth: 620, margin: "24px auto 0" }}
                >
                  {SITE.name} is a priority registry for ideas and written work. Seal a description
                  today; when a copy appears tomorrow, the chain remembers that you were first - and
                  blind validators say how much it overlaps.
                </p>
                <div className="enter enter-4" style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
                  <Link href="/seal" className="btn accent">
                    Seal an idea <ArrowRight size={15} />
                  </Link>
                  <Link href="/registry" className="btn on-night" style={{ background: "transparent", color: "#f8fcf9" }}>
                    Browse the registry
                  </Link>
                </div>
                <div className="enter enter-5" style={{ marginTop: 40 }}>
                  <LiveStats />
                </div>
              </div>
            </div>
            <div className="hero-corner-meta">
              <span>
                <span className="pulse-dot" /> Season {PARAMS.seasonDays} days
              </span>
              <span>Stake {PARAMS.disputeStakeGen} GEN</span>
              <span>Only withdraw pays</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ marquee */}
        <div className="marquee" style={{ marginTop: 22 }} aria-hidden>
          {[0, 1].map((i) => (
            <div className="marquee-track" key={i}>
              {[
                "Seal the date, keep the text",
                "Blind validators read pairs",
                "The verdict is code",
                "Labels: substantial · partial · none",
                "Money moves in one place",
                "90 days to maturity",
              ].map((t) => (
                <span key={t}>◆ {t}</span>
              ))}
            </div>
          ))}
        </div>

        {/* ------------------------------------------------ how it works */}
        <section className="shell" style={{ marginTop: 72 }} id="how">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 18 }}>
            <div>
              <Kicker>Registry mechanics</Kicker>
              <h2 className="h-display on-paper" style={{ fontSize: "clamp(34px, 4.6vw, 58px)", margin: "14px 0 0" }}>
                Five moves, <em>one ledger</em>
              </h2>
            </div>
            <p style={{ color: "var(--muted)", maxWidth: 380, fontSize: 14.5, lineHeight: 1.6 }}>
              Every entry and every dispute is public. The text stays hidden until its author reveals
              it - the date does not wait for that.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 14,
              marginTop: 30,
            }}
          >
            {STEPS.map((s, i) => (
              <Panel key={s.title} className="lift" pad>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <s.icon size={22} strokeWidth={1.8} color="var(--accent-dark)" />
                  <span className="step-idx">0{i + 1}</span>
                </div>
                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 800, margin: "16px 0 8px" }}>
                  {s.title}
                </h3>
                <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{s.body}</p>
                <div style={{ marginTop: 14 }}>
                  <Chip tone="ink">{s.meta}</Chip>
                </div>
              </Panel>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ verdicts */}
        <section className="shell" style={{ marginTop: 72 }}>
          <Panel night pad={false}>
            <div className="grid-bg" style={{ padding: "clamp(28px, 5vw, 56px)" }}>
              <Kicker night>Verdicts and money</Kicker>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 28,
                  alignItems: "start",
                  marginTop: 18,
                }}
              >
                <div>
                  <h2 className="h-display" style={{ fontSize: "clamp(30px, 4vw, 48px)", margin: 0 }}>
                    The label is theirs. <em>The verdict is code.</em>
                  </h2>
                  <p style={{ color: "#f8fcf9a6", fontSize: 14.5, lineHeight: 1.65, marginTop: 16 }}>
                    Validators answer exactly one word. From that word and from the two seal dates,
                    the contract settles stake, bond and marks - deterministically, so anyone can
                    check the call.
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
                    <Chip tone="night">bond ≥ {PARAMS.minBondGen} GEN</Chip>
                    <Chip tone="night">stake = {PARAMS.disputeStakeGen} GEN</Chip>
                    <Chip tone="night">season {PARAMS.seasonDays}d</Chip>
                    <Chip tone="night">window {PARAMS.judgeWindowHours}h</Chip>
                  </div>
                </div>
                <div style={{ border: "1px solid var(--light-line)" }}>
                  {VERDICTS.map((v, i) => (
                    <div
                      key={v.name}
                      style={{
                        padding: "14px 18px",
                        borderBottom: i === VERDICTS.length - 1 ? "none" : "1px solid var(--light-line)",
                        display: "grid",
                        gridTemplateColumns: "110px 1fr",
                        gap: 6,
                      }}
                    >
                      <div>
                        <div className="stamp" style={{ color: v.name === "UPHELD" ? "#f0a74b" : "#35d5b4", fontSize: 11 }}>
                          {v.name}
                        </div>
                        <div className="font-mono2" style={{ fontSize: 10.5, color: "#f8fcf97d", marginTop: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {v.when}
                        </div>
                      </div>
                      <p style={{ color: "#f8fcf9c9", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{v.money}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </section>

        {/* ------------------------------------------------ only withdraw pays */}
        <section className="shell" style={{ marginTop: 72 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            <Panel pad>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CalendarClock size={22} strokeWidth={1.8} color="var(--accent-dark)" />
                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                  The date is a fact
                </h3>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.65, marginTop: 10 }}>
                Sealed-at is the chain time of the transaction. A dispute can only be opened by the
                author whose entry was sealed strictly earlier - asserted twice, once at filing and
                once before any model runs. Priority is arithmetic, never opinion.
              </p>
            </Panel>
            <Panel pad>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Landmark size={22} strokeWidth={1.8} color="var(--accent-dark)" />
                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                  Only withdraw pays
                </h3>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.65, marginTop: 10 }}>
                Reveal, judge and close shift balances inside the contract; a single transfer site
                sends money out, to the caller at the root of its own transaction. The books are
                asserted after every step: received equals held, owed and paid.
              </p>
            </Panel>
            <Panel pad className="lift" night>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Scale size={22} strokeWidth={1.8} color="var(--accent)" />
                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                  Take the stand
                </h3>
              </div>
              <p style={{ color: "#f8fcf9a6", fontSize: 14, lineHeight: 1.65, marginTop: 10 }}>
                Connect MetaMask on chain 61997, seal your description, and let the calendar argue
                for you when a copy shows up.
              </p>
              <Link href="/seal" className="btn accent" style={{ marginTop: 16 }}>
                Open the seal desk <ArrowRight size={15} />
              </Link>
            </Panel>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
