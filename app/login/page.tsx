"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let isActive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!isActive || !data.session) return;
      const meta = (data.session.user?.user_metadata ?? {}) as { experienceYears?: number };
      const expLocal = typeof window !== "undefined" ? Number(window.localStorage.getItem("artha-experience-years") ?? "NaN") : NaN;
      const exp = typeof meta.experienceYears === "number" ? meta.experienceYears : expLocal;
      router.replace(Number.isFinite(exp) && exp < 1 ? "/onboarding/beginner" : "/");
    });

    return () => {
      isActive = false;
    };
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setError("Supabase environment variables are missing.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setStatus("");

    const lookupResponse = await fetch("/api/auth/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        mode: "resolve"
      })
    });

    const lookupPayload = (await lookupResponse.json()) as { email?: string; error?: string };
    if (!lookupResponse.ok || !lookupPayload.email) {
      setIsSubmitting(false);
      setError(lookupPayload.error ?? "No account found for that email or userId.");
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: lookupPayload.email,
      password
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const meta = (signInData.user?.user_metadata ?? {}) as { experienceYears?: number };
    const expLocal = typeof window !== "undefined" ? Number(window.localStorage.getItem("artha-experience-years") ?? "NaN") : NaN;
    const exp = typeof meta.experienceYears === "number" ? meta.experienceYears : expLocal;
    const isBeginner = Number.isFinite(exp) && exp < 1;
    setStatus(isBeginner ? "Welcome! Starting your beginner setup..." : "Signed in. Redirecting to your dashboard.");
    router.replace(isBeginner ? "/onboarding/beginner" : "/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-copy">
          <span className="eyebrow">Artha Access</span>
          <h1>Sign into your planning workspace</h1>
          <p>Use your email or userId to load your saved profile, scenarios, and investment plan comparisons.</p>
          <div className="auth-highlights">
            <div className="auth-pill">Email or userId login</div>
            <div className="auth-pill">Persistent sessions</div>
            <div className="auth-pill">Secure Supabase auth</div>
          </div>
        </div>
        <div className="auth-card">
          <div className="panel-header">
            <h2>Login</h2>
          </div>
          <form className="stack" onSubmit={handleSubmit}>
            <div className="field">
              <label>Email or userId</label>
              <input
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? <div className="callout danger">{error}</div> : null}
            {status ? <div className="callout success">{status}</div> : null}
            <div className="button-row">
              <button className="button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
              <Link className="button secondary" href="/register">
                Create account
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
