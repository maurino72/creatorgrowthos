import { randomBytes, createHash } from "crypto";

const VERIFIER_LENGTH = 64;

export function generateCodeVerifier(): string {
  return randomBytes(VERIFIER_LENGTH)
    .toString("base64url")
    .slice(0, VERIFIER_LENGTH);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = createHash("sha256").update(verifier).digest();
  return hash
    .toString("base64url")
    .replace(/=+$/, "");
}
