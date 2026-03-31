import {
  Connection,
  Keypair,
  PublicKey,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";
import bs58 from "bs58";

export const ANN_MINT = new PublicKey(
  "2HuiM4qMkZx4wBLnitmuKG1bQgu5g7YF5VnCAL3Mwk9N"
);
export const ANN_DECIMALS = 9;
export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export const TIER_BURN_AMOUNTS: Record<number, number> = {
  1: 100,
  2: 500,
  3: 1000,
};

export function getConnection(): Connection {
  return new Connection(
    process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
}

function loadKeypairFromEnv(envVar: string): Keypair {
  const raw = process.env[envVar];
  if (!raw) throw new Error(`${envVar} not set`);

  // Try JSON array first, then base58
  try {
    const arr = JSON.parse(raw) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch {
    const decoded = bs58.decode(raw);
    return Keypair.fromSecretKey(decoded);
  }
}

/**
 * Loads the Airdrop Wallet keypair (holds pre-minted ANN for distribution).
 * Configured via AIRDROP_PRIVATE_KEY env var.
 */
export function loadAirdropKeypair(): Keypair {
  return loadKeypairFromEnv("AIRDROP_PRIVATE_KEY");
}

export async function verifyBurnTransaction(
  connection: Connection,
  txSig: string,
  expectedBurnAmount: number, // in ANN (not lamports)
  expectedSigner: string
): Promise<{ valid: boolean; reason?: string }> {
  let tx: ParsedTransactionWithMeta | null;
  try {
    tx = await connection.getParsedTransaction(txSig, {
      maxSupportedTransactionVersion: 0,
    });
  } catch {
    return { valid: false, reason: "Failed to fetch transaction" };
  }

  if (!tx) return { valid: false, reason: "Transaction not found" };
  if (tx.meta?.err) return { valid: false, reason: "Transaction failed on-chain" };

  // Verify signer matches
  const signers = tx.transaction.message.accountKeys
    .filter((k) => k.signer)
    .map((k) => k.pubkey.toString());

  if (!signers.includes(expectedSigner)) {
    return { valid: false, reason: "Signer does not match user wallet" };
  }

  // Find burn instruction
  const instructions = tx.transaction.message.instructions;
  const burnAmountLamports = BigInt(expectedBurnAmount) * BigInt(10 ** ANN_DECIMALS);

  let burnFound = false;
  for (const ix of instructions) {
    if ("parsed" in ix) {
      const parsed = ix as {
        parsed: {
          type: string;
          info: {
            mint: string;
            // `burn` uses flat `amount`; `burnChecked` nests it under `tokenAmount`
            amount?: string;
            tokenAmount?: { amount: string };
          };
        };
        program: string;
      };
      if (
        parsed.program === "spl-token" &&
        (parsed.parsed.type === "burn" || parsed.parsed.type === "burnChecked")
      ) {
        const info = parsed.parsed.info;
        if (info.mint !== ANN_MINT.toString()) continue;

        // Resolve amount regardless of instruction variant
        const rawAmount = info.tokenAmount?.amount ?? info.amount;
        if (rawAmount === undefined) continue;

        if (BigInt(rawAmount) === burnAmountLamports) {
          burnFound = true;
          break;
        }
      }
    }
  }

  if (!burnFound) {
    return {
      valid: false,
      reason: `Burn instruction not found or amount mismatch (expected ${expectedBurnAmount} ANN)`,
    };
  }

  return { valid: true };
}
