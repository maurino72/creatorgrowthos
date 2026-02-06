"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center px-6">
      {/* Logo mark */}
      <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-xl border border-input bg-secondary backdrop-blur-sm">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="text-foreground"
        >
          <path
            d="M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm11 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Title */}
      <h1 className="mb-2 text-center font-sans text-2xl font-semibold tracking-tight text-foreground">
        Creator Growth OS
      </h1>
      <p className="mb-10 text-center text-sm leading-relaxed text-muted-foreground">
        Grow your audience with AI-powered
        <br />
        content strategy and analytics.
      </p>

      {/* Sign in card */}
      <div className="w-full rounded-2xl border border-glass-border bg-glass-bg p-6 backdrop-blur-md">
        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          size="lg"
          className="w-full cursor-pointer gap-3 border-input bg-secondary py-6 text-sm font-medium text-foreground transition-all duration-200 hover:border-glass-hover hover:bg-glass-hover"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58v1Z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-muted-foreground/40">
        By continuing, you agree to our Terms of Service.
      </p>
    </div>
  );
}
