import { CHAIN_ID, CONTRACT_ADDRESS, IS_CONFIGURED, STUDIO_RPC } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Liveness for the site - no database required. Reports the chain the app is
 * pointed at so a preview can confirm its wiring at a glance.
 */
export async function GET() {
  return Response.json({
    ok: true,
    app: "antedate",
    chainId: CHAIN_ID,
    rpc: STUDIO_RPC,
    contract: CONTRACT_ADDRESS,
    configured: IS_CONFIGURED,
  });
}
