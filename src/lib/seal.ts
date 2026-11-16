/**
 * The seal formula, in the browser: sha256 over utf8(text | salt | address),
 * byte-identical to the contract (held to tests/vectors.json by
 * scripts/hash-parity.mjs). Tickets - the text and salt - stay in the
 * visitor's browser storage; nothing about them is sent anywhere until the
 * author chooses to reveal.
 */

export async function sealHash(text: string, salt: string, address: string): Promise<string> {
  const data = new TextEncoder().encode(`${text}|${salt}|${address.toLowerCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type Ticket = {
  entryId: number;
  text: string;
  salt: string;
  seal: string;
  author: string;
  sealedAt: number;
};

const KEY = "antedate.tickets.v1";

export function loadTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Ticket[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTicket(ticket: Ticket): Ticket[] {
  const all = loadTickets().filter((t) => !(t.entryId === ticket.entryId && t.author === ticket.author));
  all.unshift(ticket);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, 60)));
  }
  return all;
}

export function findTicket(entryId: number, author?: string): Ticket | undefined {
  const mine = loadTickets().filter((t) => t.entryId === entryId);
  if (!author) return mine[0];
  return mine.find((t) => t.author.toLowerCase() === author.toLowerCase());
}

export function ticketFile(ticket: Ticket): { name: string; url: string } {
  const payload = {
    registry: "Antedate",
    network: "GenLayer Studio Next (chain 61997)",
    entryId: ticket.entryId,
    seal: ticket.seal,
    text: ticket.text,
    salt: ticket.salt,
    author: ticket.author,
    sealedAt: new Date(ticket.sealedAt * 1000).toISOString(),
    keep: "This ticket is the only copy of your text and salt. Keep it safe.",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  return { name: `antedate-ticket-${ticket.entryId}.json`, url: URL.createObjectURL(blob) };
}
