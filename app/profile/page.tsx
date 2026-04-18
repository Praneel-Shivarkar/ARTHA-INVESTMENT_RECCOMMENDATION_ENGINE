"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildProfileFromAuthUser, isMissingTableError } from "@/lib/supabase/fallback";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadProfile() {
    if (!supabase) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error: profileError } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
    if (profileError) {
      if (isMissingTableError(profileError.message)) {
        const fallbackProfile = buildProfileFromAuthUser(user);
        setFullName(fallbackProfile.fullName);
        setEmail(fallbackProfile.email);
        setUserId(fallbackProfile.userHandle);
        setPhoneNumber(fallbackProfile.phoneNumber);
        setStatus("Profile table is not available yet. Using auth profile metadata.");
        setIsLoading(false);
        return;
      }
      setError(profileError.message);
      setIsLoading(false);
      return;
    }

    setFullName(data?.full_name ?? "");
    setEmail(data?.email ?? user.email ?? "");
    setUserId(data?.user_handle ?? "");
    setPhoneNumber(data?.phone_number ?? "");
    setIsLoading(false);
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase environment variables are missing.");
      return;
    }

    setIsSaving(true);
    setError("");
    setStatus("");

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSaving(false);
      router.replace("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        full_name: fullName.trim(),
        user_handle: userId.trim().toLowerCase(),
        phone_number: phoneNumber.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError && !isMissingTableError(updateError.message)) {
      setIsSaving(false);
      setError(updateError.message);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        fullName: fullName.trim(),
        userId: userId.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim()
      }
    });

    if (updateError && isMissingTableError(updateError.message)) {
      setEmail(user.email ?? "");
      setStatus("Profile updated in auth metadata. Apply the Supabase schema to enable database sync.");
    } else {
      await loadProfile();
      setStatus("Profile updated successfully.");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("artha-profile-updated", Date.now().toString());
      window.dispatchEvent(new Event("artha-profile-updated"));
    }

    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="page-shell">
        <section className="panel">
          <div className="panel-header">
            <h2>Loading profile</h2>
          </div>
          <div className="panel-copy">Fetching your saved identity details.</div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <div>
          <span className="eyebrow">Profile</span>
          <h1>Your account details</h1>
          <p>Keep your personal details current while the dashboard stays focused on planning and portfolio decisions.</p>
        </div>
        <div className="button-row">
          <Link className="button secondary" href="/">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="profile-layout">
        <div className="panel fade-in">
          <div className="panel-header">
            <h2>Profile Information</h2>
          </div>
          <form className="stack" onSubmit={handleSubmit}>
            <div className="field-grid">
              <div className="field">
                <label>Full name</label>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={email} readOnly />
              </div>
              <div className="field">
                <label>userId</label>
                <input value={userId} onChange={(event) => setUserId(event.target.value)} required />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  required
                />
              </div>
            </div>
            {error ? <div className="callout danger">{error}</div> : null}
            {status ? <div className="callout success">{status}</div> : null}
            <div className="button-row" style={{ padding: "0 24px 24px" }}>
              <button className="button" type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Update Profile"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
