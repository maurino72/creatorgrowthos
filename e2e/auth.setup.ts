import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const E2E_TEST_EMAIL =
  process.env.E2E_TEST_EMAIL || "e2e-test@creatorgrowthos.test";
const E2E_TEST_PASSWORD =
  process.env.E2E_TEST_PASSWORD || "e2e-test-password-2024!";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

setup("authenticate", async ({ page }) => {
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create test user if it doesn't exist (idempotent)
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find(
    (u) => u.email === E2E_TEST_EMAIL,
  );

  if (!existingUser) {
    const { error: createError } = await adminClient.auth.admin.createUser({
      email: E2E_TEST_EMAIL,
      password: E2E_TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "E2E Test User" },
    });
    if (createError)
      throw new Error(`Failed to create test user: ${createError.message}`);
  }

  // Sign in server-side to get a valid session
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signInData, error: signInError } =
    await anonClient.auth.signInWithPassword({
      email: E2E_TEST_EMAIL,
      password: E2E_TEST_PASSWORD,
    });

  if (signInError)
    throw new Error(`Failed to sign in: ${signInError.message}`);

  expect(signInData.session).toBeTruthy();

  // Extract the project ref from the Supabase URL (e.g., https://<ref>.supabase.co)
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

  // @supabase/ssr stores the session in chunked cookies named:
  // sb-<project-ref>-auth-token.0, sb-<project-ref>-auth-token.1, etc.
  // For a single chunk, it's just sb-<project-ref>-auth-token.0
  const cookieBaseName = `sb-${projectRef}-auth-token`;
  const sessionData = JSON.stringify(signInData.session);

  // @supabase/ssr splits cookies into ~3180-byte chunks
  const CHUNK_SIZE = 3180;
  const chunks: string[] = [];
  for (let i = 0; i < sessionData.length; i += CHUNK_SIZE) {
    chunks.push(sessionData.slice(i, i + CHUNK_SIZE));
  }

  // Navigate to the app first so we can set cookies on the right domain
  await page.goto("/login");

  // Set the auth cookies
  const baseUrl = new URL("http://localhost:3000");
  const cookies = chunks.map((chunk, index) => ({
    name: `${cookieBaseName}.${index}`,
    value: chunk,
    domain: baseUrl.hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));

  await page.context().addCookies(cookies);

  // Verify authentication works by navigating to dashboard
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  // Save signed-in state
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
