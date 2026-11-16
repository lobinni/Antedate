/** Display helpers shared across the site. */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const WEI = BigInt(10) ** BigInt(18);

/** Wei string -> trimmed GEN amount, up to 4 decimals. */
export function gen(wei: string | bigint | undefined): string {
  if (wei === undefined) return "0";
  const v = typeof wei === "string" ? BigInt(wei || "0") : wei;
  const whole = v / WEI;
  const frac = v % WEI;
  if (frac === BigInt(0)) return whole.toString();
  const digits = frac.toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return digits ? `${whole}.${digits}` : whole.toString();
}

export function shortHex(value: string, head = 6, tail = 4): string {
  if (!value) return "";
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function shortSeal(seal: string): string {
  return seal ? `${seal.slice(0, 10)}…${seal.slice(-6)}` : "";
}

export function dateOf(seconds: number): string {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function dateTimeOf(seconds: number): string {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function countdown(toSeconds: number): string {
  const left = toSeconds - Math.floor(Date.now() / 1000);
  if (left <= 0) return "elapsed";
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function verdictTone(verdict: string): "accent" | "warn" | "danger" | "ink" {
  switch (verdict) {
    case "UPHELD":
      return "danger";
    case "ADJACENT":
      return "warn";
    case "ABSOLVED":
      return "accent";
    default:
      return "ink";
  }
}
