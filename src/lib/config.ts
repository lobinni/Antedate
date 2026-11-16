/**
 * One place to point the site at a deployment.
 *
 * Priority:
 *   1. NEXT_PUBLIC_CONTRACT_ADDRESS (env)
 *   2. DEFAULT_CONTRACT_ADDRESS below, kept in sync with contracts/FROZEN.json
 *
 * After a redeploy: `python3 scripts/deploy.py --record <address> <tx>` and set
 * the env variable (or edit DEFAULT_CONTRACT_ADDRESS). Nothing else references
 * the address.
 */

export const SITE = {
  name: "Antedate",
  tagline: "First, on record",
} as const;

/** Mirrors contracts/FROZEN.json -> deployment.address. */
const DEFAULT_CONTRACT_ADDRESS = "0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65";

export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() || DEFAULT_CONTRACT_ADDRESS
) as `0x${string}`;

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 61997);

export const STUDIO_RPC =
  process.env.NEXT_PUBLIC_STUDIO_RPC?.trim() || "https://studio-dev.genlayer.com/api";

export const STUDIO_EXPLORER =
  process.env.NEXT_PUBLIC_STUDIO_EXPLORER?.trim() || "https://explorer-studio-next.genlayer.com";

/** True when a real deployment address is configured. */
export const IS_CONFIGURED = !/^0x0{40}$/i.test(CONTRACT_ADDRESS);

/** Contract parameters, mirroring contracts/antedate.py. */
export const PARAMS = {
  minBondGen: 2,
  disputeStakeGen: 5,
  seasonDays: 90,
  judgeWindowHours: 48,
  maxTextChars: 1500,
  maxSaltChars: 100,
  wei: BigInt(10) ** BigInt(18),
} as const;

export function explorerTx(tx: string): string {
  return `${STUDIO_EXPLORER}/tx/${tx}`;
}

export function explorerAddress(address: string): string {
  return `${STUDIO_EXPLORER}/address/${address}`;
}
