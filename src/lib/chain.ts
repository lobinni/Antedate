/**
 * Chain plumbing for GenLayer Studio Next: chain parameters for MetaMask and
 * the EIP-1193 glue. No keys ever touch this code.
 */

import { CHAIN_ID, STUDIO_EXPLORER, STUDIO_RPC } from "./config";

export const CHAIN_HEX = `0x${CHAIN_ID.toString(16)}`;

export const CHAIN_PARAMS = {
  chainId: CHAIN_HEX,
  chainName: "GenLayer Studio Next",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: [STUDIO_RPC],
  blockExplorerUrls: [STUDIO_EXPLORER],
};

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

/** The injected wallet, if the visitor has one. */
export function injectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  return eth ?? null;
}

export async function requestAccounts(provider: Eip1193Provider): Promise<string[]> {
  return (await provider.request({ method: "eth_requestAccounts" })) as string[];
}

export async function currentChainId(provider: Eip1193Provider): Promise<number> {
  const hex = (await provider.request({ method: "eth_chainId" })) as string;
  return parseInt(hex, 16);
}

/**
 * Switch the wallet to Studio Next, adding the network when it is missing.
 */
export async function ensureChain(provider: Eip1193Provider): Promise<number> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_HEX }],
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [CHAIN_PARAMS],
      });
    } else {
      throw error;
    }
  }
  return currentChainId(provider);
}
