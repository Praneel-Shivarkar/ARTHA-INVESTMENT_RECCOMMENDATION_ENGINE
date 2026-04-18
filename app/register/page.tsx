"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9]{10}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setError("Supabase environment variables are missing.");
      return;
    }

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!emailPattern.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!/^[a-zA-Z0-9_]{4,20}$/.test(userId)) {
      setError("userId must be 4-20 characters and use letters, numbers, or underscore only.");
      return;
    }

    if (!phonePattern.test(phoneNumber)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    if (!passwordPattern.test(password)) {
      setError("Password must be at least 6 characters with one uppercase and one lowercase letter.");
      return;
    }

    const expNum = Number(experienceYears);
    if (experienceYears === "" || Number.isNaN(expNum) || expNum < 0 || expNum > 80) {
      setError("Enter your investing/trading experience in years (0 if you are new).");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setStatus("");

    const availabilityResponse = await fetch("/api/auth/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: userId,
        mode: "availability"
      })
    });

    const availability = (await availabilityResponse.json()) as { available?: boolean; error?: string };
    if (!availabilityResponse.ok || !availability.available) {
      setIsSubmitting(false);
      setError(availability.error ?? "That userId is already taken.");
      return;
    }

    const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          fullName,
          userId: userId.toLowerCase(),
          phoneNumber,
          experienceYears: expNum
        }
      }
    });

    if (signUpError) {
      setIsSubmitting(false);
      setError(signUpError.message);
      return;
    }

    if (data.user?.id) {
      const profileResponse = await fetch("/api/auth/register-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.user.id,
          email: email.toLowerCase(),
          fullName,
          userId: userId.toLowerCase(),
          phoneNumber
        })
      });

      const profilePayload = (await profileResponse.json()) as { error?: string };
      if (!profileResponse.ok) {
        setIsSubmitting(false);
        setError(profilePayload.error ?? "Could not create the user profile.");
        return;
      }
    }

    setIsSubmitting(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("artha-experience-years", String(expNum));
    }
    const isBeginner = expNum < 1;

    if (data.session) {
      router.replace(isBeginner ? "/onboarding/beginner" : "/");
      return;
    }

    setStatus(
      isBeginner
        ? "Account created. After verifying your email and signing in, we'll walk you through a beginner-friendly setup."
        : "Account created. Check your email to verify the account, then sign in with your email or userId."
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-copy">
          <span className="eyebrow">Artha Access</span>
          <h1>Create your investor identity</h1>
          <p>Set up a secure workspace with your profile, persistent plan history, and personalized investment dashboard.</p>
          <div className="auth-highlights">
            <div className="auth-pill">Email verification</div>
            <div className="auth-pill">UserId login</div>
            <div className="auth-pill">Saved plan history</div>
          </div>
        </div>
        <div className="auth-card">
          <div className="panel-header">
            <h2>Register</h2>
          </div>
          <form className="stack" onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </div>
            <div className="field-grid compact">
              <div className="field">
                <label>Email</label>
                <input
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>userId</label>
                <input
                  autoComplete="username"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="field-grid compact">
              <div className="field">
                <label>Phone number</label>
                <input
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  required
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="fine">Password must include at least one uppercase, one lowercase, and be 6+ characters.</div>
            <div className="field">
              <label>Years of investing / trading experience</label>
              <input
                inputMode="numeric"
                placeholder="e.g. 0 if you are new, 2 if two years"
                value={experienceYears}
                onChange={(event) => setExperienceYears(event.target.value.replace(/[^0-9.]/g, "").slice(0, 4))}
                required
              />
              <div className="fine">
                If you have less than 1 year of experience, we&apos;ll take you through a guided beginner setup instead of the
                standard dashboard onboarding.
              </div>
            </div>
            {error ? <div className="callout danger">{error}</div> : null}
            {status ? <div className="callout success">{status}</div> : null}
            <div className="button-row">
              <button className="button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Account"}
              </button>
              <Link className="button secondary" href="/login">
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
