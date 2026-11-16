"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CHAIN_ID } from "@/lib/config";
import {
  currentChainId,
  ensureChain,
  injectedProvider,
  requestAccounts,
  type Eip1193Provider,
} from "@/lib/chain";

export type WalletState = {
  provider: Eip1193Provider | null;
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  hasWallet: boolean;
  wrongChain: boolean;
  connect: () => Promise<void>;
  switchChain: () => Promise<void>;
  refresh: () => Promise<void>;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);

  const refresh = useCallback(async () => {
    const eth = injectedProvider();
    if (!eth) return;
    try {
      const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
      setAddress(accounts[0] ?? null);
      setChainId(await currentChainId(eth));
    } catch {
      /* wallet locked or busy */
    }
  }, []);

  useEffect(() => {
    const eth = injectedProvider();
    setProvider(eth);
    void refresh();
    if (!eth?.on) return;
    const onAccounts = (list: unknown) => setAddress((list as string[])[0] ?? null);
    const onChain = (hex: unknown) => setChainId(parseInt(hex as string, 16));
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    const eth = injectedProvider();
    if (!eth) throw new Error("No wallet found. Install MetaMask to continue.");
    setConnecting(true);
    try {
      const accounts = await requestAccounts(eth);
      setAddress(accounts[0] ?? null);
      setChainId(await ensureChain(eth));
      setProvider(eth);
    } finally {
      setConnecting(false);
    }
  }, []);

  const switchChain = useCallback(async () => {
    const eth = injectedProvider();
    if (!eth) return;
    setChainId(await ensureChain(eth));
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      provider,
      address,
      chainId,
      connecting,
      hasWallet: provider !== null,
      wrongChain: chainId !== null && chainId !== CHAIN_ID,
      connect,
      switchChain,
      refresh,
    }),
    [provider, address, chainId, connecting, connect, switchChain, refresh],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet outside WalletProvider");
  return ctx;
}
