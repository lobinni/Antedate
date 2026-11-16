import type { CSSProperties } from "react";

type NodeSpec = {
  x: string;
  y: string;
  label: string;
  delay: number;
  info?: { title: string; meta: string; side?: "right" };
  hideSm?: boolean;
};

const NODES: NodeSpec[] = [
  { x: "9%", y: "16%", label: "a1f4…9c", delay: 0, info: { title: "Entry #12 sealed", meta: "bond 2 GEN · 14:02 UTC" }, hideSm: true },
  { x: "16%", y: "62%", label: "f00d…42", delay: 1.4, hideSm: true },
  { x: "26%", y: "30%", label: "9b77…d1", delay: 2.2, hideSm: true },
  { x: "78%", y: "18%", label: "c4e0…7a", delay: 0.8, info: { title: "Dispute #4 read", meta: "label SUBSTANTIAL", side: "right" }, hideSm: true },
  { x: "86%", y: "58%", label: "55aa…08", delay: 1.9, hideSm: true },
  { x: "70%", y: "76%", label: "e2b9…33", delay: 2.8, info: { title: "Entry #19 matured", meta: "bond returned", side: "right" }, hideSm: true },
  { x: "4%", y: "84%", label: "8d31…fe", delay: 3.4, hideSm: true },
];

const PATHS = [
  "M 120 130 C 260 90, 420 210, 560 190 S 880 130, 1010 150",
  "M 90 430 C 240 380, 400 470, 600 440 S 920 400, 1100 470",
  "M 210 240 C 360 300, 560 260, 760 330 S 980 350 1150 300",
  "M 60 560 C 320 520, 480 620, 720 570 S 1000 540, 1200 590",
];

/** Floating seal tiles over the night grid, joined by drifting dashed paths. */
export default function HeroOrbit() {
  return (
    <div className="orbit" aria-hidden>
      <svg className="orbit-paths" viewBox="0 0 1240 680" preserveAspectRatio="none">
        {PATHS.map((d, i) => (
          <path key={i} d={d} style={{ animationDelay: `${i * -6.5}s` }} />
        ))}
      </svg>
      {NODES.map((n, i) => {
        const style: CSSProperties = { left: n.x, top: n.y, animationDelay: `${n.delay}s` };
        return (
          <div key={i} className={`node${n.info ? " has-info" : ""}${n.hideSm ? " hide-sm" : ""}`} style={style}>
            <span className="seal-tile">{n.label}</span>
            {n.info ? (
              <span className={`node-info${n.info.side === "right" ? " right" : ""}`}>
                <strong>{n.info.title}</strong>
                <small>{n.info.meta}</small>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
