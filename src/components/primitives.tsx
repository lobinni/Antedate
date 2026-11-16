import type { ReactNode } from "react";
import { cx } from "@/lib/format";

export function Kicker({ children, night = false }: { children: ReactNode; night?: boolean }) {
  return <div className={cx("kicker", night && "on-night")}>{children}</div>;
}

export function Chip({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "ink" | "warn" | "danger" | "night";
}) {
  return (
    <span className={cx("chip", tone && `tone-${tone}`)}>
      <span className="dot" />
      {children}
    </span>
  );
}

export function VerdictChip({ verdict }: { verdict: string }) {
  const tone =
    verdict === "UPHELD"
      ? "danger"
      : verdict === "ADJACENT"
        ? "warn"
        : verdict === "ABSOLVED"
          ? "ink"
          : verdict
            ? "night"
            : "ink";
  return <Chip tone={tone as "ink"}>{verdict || "OPEN"}</Chip>;
}

export function StateChip({ state }: { state: string }) {
  const tone = state === "SEALED" ? "ink" : state === "MATURED" ? "warn" : undefined;
  return <Chip tone={tone as "ink" | undefined}>{state}</Chip>;
}

export function Panel({
  children,
  className,
  night = false,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  night?: boolean;
  pad?: boolean;
}) {
  return (
    <div className={cx("panel", pad && "pad", night && "night", className)}>{children}</div>
  );
}

export function Stat({
  label,
  value,
  sub,
  night = false,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  night?: boolean;
}) {
  return (
    <div
      className={cx("panel pad", night && "night")}
      style={{ padding: "18px 20px" }}
    >
      <div
        className="font-mono2"
        style={{
          fontSize: 10.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: night ? "#35d5b4" : "var(--muted)",
        }}
      >
        {label}
      </div>
      <div
        className="font-display"
        style={{ fontSize: 26, fontWeight: 800, marginTop: 6, lineHeight: 1 }}
      >
        {value}
      </div>
      {sub ? (
        <div style={{ fontSize: 12, color: night ? "#f8fcf98a" : "var(--muted)", marginTop: 6 }}>{sub}</div>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="field" style={{ marginBottom: 18 }}>
      <label>{label}</label>
      {children}
      {hint ? (
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{hint}</div>
      ) : null}
    </div>
  );
}

export function StatusLine({
  kind,
  children,
}: {
  kind: "ok" | "err" | "info";
  children: ReactNode;
}) {
  return <div className={cx("status-line", kind !== "info" && kind)}>{children}</div>;
}

export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="panel pad" style={{ textAlign: "center", padding: "64px 24px" }}>
      <div className="font-display" style={{ fontSize: 22, fontWeight: 800 }}>
        {title}
      </div>
      <p style={{ color: "var(--muted)", maxWidth: 460, margin: "10px auto 0", lineHeight: 1.6 }}>
        {body}
      </p>
      {children ? <div style={{ marginTop: 22 }}>{children}</div> : null}
    </div>
  );
}
