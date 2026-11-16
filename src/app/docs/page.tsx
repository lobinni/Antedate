import Link from "next/link";
import { ArrowRight, Eye, FileLock2, Gavel, Hourglass, Landmark, Scale } from "lucide-react";
import { Footer, Header } from "@/components/chrome";
import { Chip, Kicker, Panel } from "@/components/primitives";
import { CHAIN_ID, PARAMS, SITE, STUDIO_EXPLORER, STUDIO_RPC } from "@/lib/config";

const METHODS = [
  { name: "register", kind: "write · payable", who: "anyone", does: `Stores a seal with the chain date; takes a bond of at least ${PARAMS.minBondGen} GEN. Returns the entry id.` },
  { name: "reveal", kind: "write", who: "the author", does: "Publishes the text, checked against the seal. The seal date never changes." },
  { name: "challenge", kind: "write · payable", who: "the earlier author", does: `Stakes exactly ${PARAMS.disputeStakeGen} GEN against a later, revealed entry. A pair is disputed once.` },
  { name: "judge", kind: "write", who: "anyone", does: "Runs the blind read; or settles the dispute as stale past its 48-hour window. Only moves balances." },
  { name: "close_entry", kind: "write", who: "anyone", does: "After 90 days with nothing upheld, credits the bond to the author: the entry matures." },
  { name: "withdraw", kind: "write", who: "anyone", does: "The only call that pays: a top-level transfer of the caller's whole balance to the caller." },
  { name: "get_entry", kind: "view", who: "anyone", does: "Seal, dates, state, text once revealed, marks - always with the contract totals." },
  { name: "get_dispute", kind: "view", who: "anyone", does: "Both entries, the seconds between them, label, verdict and payouts." },
  { name: "list_entries", kind: "view", who: "anyone", does: "Newest first; with an address, the account's entries plus its balance, earned and withdrawn." },
  { name: "list_marks", kind: "view", who: "anyone", does: "The disputes touching an entry on either side, newest first, with roles." },
];

const LIFECYCLE = [
  { icon: FileLock2, title: "Seal", body: `The description is hashed with a salt and the author's address - the formula is sha256 of the three joined by a bar. The hash and a bond go on chain; the text does not.` },
  { icon: Eye, title: "Reveal", body: "When it matters, the author publishes text and salt. The contract recomputes the seal; a match publishes the text. The date stays the original one." },
  { icon: Gavel, title: "Challenge", body: "The earlier author stakes against the later entry. Priority is checked twice in code: at filing and again before any model runs." },
  { icon: Scale, title: "Read", body: "Validators receive the earlier text as TEXT 1 and the later as TEXT 2, with no dates or names. They answer one label - substantial, partial or none - JSON only." },
  { icon: Landmark, title: "Mark", body: "The verdict is derived in code: upheld, adjacent, absolved (or stale if never read). Marks land on the entries; balances move; nothing is transferred yet." },
  { icon: Hourglass, title: "Withdraw", body: "Matured bonds and won stakes accumulate as balances. One call, withdraw, pays the caller; a static test keeps it the only payout site." },
];

export default function DocsPage() {
  return (
    <>
      <Header />
      <main className="shell" style={{ paddingTop: 40, marginBottom: 80 }}>
        <Kicker>{SITE.name} · build notes</Kicker>
        <h1 className="h-display on-paper" style={{ fontSize: "clamp(36px, 5vw, 64px)", margin: "14px 0 10px" }}>
          The <em>Docs</em>
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 600, fontSize: 15, lineHeight: 1.65 }}>
          Everything here is written as prose and tables. The contract source, suites and scripts
          live in the repository next to this site.
        </p>

        {/* overview */}
        <section className="panel pad" style={{ marginTop: 34 }}>
          <div className="kicker">Overview</div>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 800, margin: "14px 0 10px" }}>
            First, on record
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.75, margin: 0 }}>
              {SITE.name} is a priority registry for ideas and written work on GenLayer Studio Next.
              An author seals a description with a bond; the chain stamps the date while the text
              stays hidden. When a later entry looks like a copy, the earlier author stakes
              {" "}{PARAMS.disputeStakeGen} GEN and validators compare the two texts without seeing
              dates or names. The contract derives the verdict from their label and the seal dates,
              and pays the later entry's bond to the challenger when the copy is upheld.
            </p>
            <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line-soft)", paddingBottom: 8, fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)" }}>Network</span>
                <strong>GenLayer Studio Next</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line-soft)", paddingBottom: 8, fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)" }}>Chain</span>
                <strong>{CHAIN_ID}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line-soft)", paddingBottom: 8, fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)" }}>Minimum bond</span>
                <strong>{PARAMS.minBondGen} GEN</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line-soft)", paddingBottom: 8, fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)" }}>Dispute stake</span>
                <strong>{PARAMS.disputeStakeGen} GEN</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line-soft)", paddingBottom: 8, fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)" }}>Season</span>
                <strong>{PARAMS.seasonDays} days</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)" }}>Reading window</span>
                <strong>{PARAMS.judgeWindowHours} hours</strong>
              </div>
            </div>
          </div>
        </section>

        {/* lifecycle */}
        <section style={{ marginTop: 40 }}>
          <Kicker>The lifecycle</Kicker>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginTop: 18 }}>
            {LIFECYCLE.map((s, i) => (
              <Panel key={s.title} pad>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <s.icon size={20} strokeWidth={1.8} color="var(--accent-dark)" />
                  <span className="step-idx">0{i + 1}</span>
                </div>
                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 800, margin: "12px 0 8px" }}>{s.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{s.body}</p>
              </Panel>
            ))}
          </div>
        </section>

        {/* verdicts */}
        <section className="panel pad night" style={{ marginTop: 40 }}>
          <div className="kicker on-night">Verdicts, exactly</div>
          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table className="table" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={{ color: "#35d5b4" }}>Label from the validators</th>
                  <th style={{ color: "#35d5b4" }}>Verdict derived in code</th>
                  <th style={{ color: "#35d5b4" }}>What settles</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["SUBSTANTIAL", "UPHELD", "Challenger receives the stake back plus the later entry's bond when the entry was inside its season; the entry is marked as derived from the earlier one."],
                  ["PARTIAL", "ADJACENT", "Stake back to the challenger; the bond stays; both entries gain an adjacency note."],
                  ["NONE", "ABSOLVED", "The stake goes to the accused author; the later entry gains an absolution."],
                  ["no read in 48 hours", "STALE", "No model ran; the stake returns and the pair is unlocked for a fresh dispute."],
                  ["90 days clean", "MATURED", "Anyone closes the entry; the bond returns to its author."],
                ].map(([label, verdict, settles]) => (
                  <tr key={verdict}>
                    <td style={{ color: "#f8fcf9c9" }}>{label}</td>
                    <td>
                      <Chip tone="night">{verdict}</Chip>
                    </td>
                    <td style={{ color: "#f8fcf9c9", fontSize: 13, lineHeight: 1.6 }}>{settles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: "#f8fcf98a", fontSize: 13, marginTop: 18, lineHeight: 1.65, borderTop: "1px solid var(--light-line)", paddingTop: 14 }}>
            The books always balance: received equals bonds held, stakes held, balances owed and
            amounts paid. A fuzz suite replays hundreds of random steps and asserts that line after
            each one.
          </p>
        </section>

        {/* methods */}
        <section style={{ marginTop: 40 }}>
          <Kicker>The ten methods</Kicker>
          <div className="panel" style={{ marginTop: 18, overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Kind</th>
                  <th>Who calls it</th>
                  <th>What it does</th>
                </tr>
              </thead>
              <tbody>
                {METHODS.map((m) => (
                  <tr key={m.name}>
                    <td>
                      <span className="token">{m.name}</span>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{m.kind}</td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{m.who}</td>
                    <td style={{ color: "var(--ink)", fontSize: 13.5, lineHeight: 1.55 }}>{m.does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* deploying & configuring */}
        <section style={{ marginTop: 40 }}>
          <Kicker>Deployment and configuration</Kicker>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginTop: 18 }}>
            <Panel pad>
              <h3 className="font-display" style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px" }}>
                Deploy, then freeze the record
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                The deploy script ships the contract to Studio Next and freezes the result - address,
                transaction and source hash - into a JSON record under the contracts folder. The
                verify script then recomputes the hash locally and asks the network for the deployed
                bytes, so the repository and the chain can be held against each other.
              </p>
            </Panel>
            <Panel pad>
              <h3 className="font-display" style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px" }}>
                Change the address in one place
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                The site reads a single environment variable, <strong>NEXT_PUBLIC_CONTRACT_ADDRESS</strong>.
                Scripts honour <strong>ANTEDATE_ADDRESS</strong>. Both fall back to the frozen record,
                so a redeploy means: record the new address, set the variable, rebuild. Nothing else
                in the repository names the address.
              </p>
            </Panel>
            <Panel pad>
              <h3 className="font-display" style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px" }}>
                The wallet side
              </h3>
              <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.75, margin: 0 }}>
                <p style={{ margin: "0 0 10px" }}>
                  Visitors sign with MetaMask on chain {CHAIN_ID} (currency GEN). The site asks the
                  wallet to add and switch to the network if it is missing. Keys never leave the
                  wallet; tickets never leave the browser.
                </p>
                <div style={{ display: "grid", gap: 6, fontSize: 12.5 }}>
                  <span>Endpoint · {STUDIO_RPC}</span>
                  <span>Explorer · {STUDIO_EXPLORER}</span>
                </div>
              </div>
            </Panel>
          </div>
        </section>

        {/* testing */}
        <section style={{ marginTop: 40 }}>
          <Kicker>Testing, offline and live</Kicker>
          <div className="panel" style={{ marginTop: 18, overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  <th>Suite</th>
                  <th>What it proves</th>
                  <th>How it runs</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Direct tests", "Every method's happy path and every refusal; seal parity with shared vectors.", "A tiny runtime stand-in imports the contract as-is; no node, no network."],
                  ["Money fuzz", "The books balance after each of four hundred random steps; only withdraw ever transfers.", "Same offline world, random actors, seeded."],
                  ["Static source tests", "Ten methods; one payout site; verdicts in code; the prompt pinned; stale path model-free.", "Reads the contract as text."],
                  ["Mutations", "Fifteen defences are broken one at a time; every break must be caught.", "Refuses to pass if a sabotage escapes."],
                  ["Golden pairs", "Ten reference-plus-later pairs, once deployed, replayed through real consensus and published as they came out.", "Two funded accounts, the seed script, results written to the eval folder."],
                ].map(([suite, proves, how]) => (
                  <tr key={suite}>
                    <td style={{ fontWeight: 700, fontSize: 13.5 }}>{suite}</td>
                    <td style={{ color: "var(--ink)", fontSize: 13.5, lineHeight: 1.6 }}>{proves}</td>
                    <td style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>{how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* honest limits */}
        <section className="panel pad" style={{ marginTop: 40, background: "var(--accent-soft)", borderColor: "#087f7140" }}>
          <div className="kicker">Honest limits</div>
          <p style={{ color: "#0b3d36", fontSize: 14.5, lineHeight: 1.75, margin: "12px 0 0", maxWidth: 760 }}>
            {SITE.name} shows who sealed a description first and whether a later one reproduces it.
            It proves neither authorship nor originality, grants no legal rights, and a revealed
            text is public forever - so seal a description, not a secret. Whether two texts overlap
            is a judgment; that is why the label, both texts and the adjudicator prompt are all
            public, and why the verdict itself is code.
          </p>
          <Link href="/seal" className="btn" style={{ marginTop: 18 }}>
            Seal your idea <ArrowRight size={15} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
