"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/dashboard-shell";
import {
  createEmptyPortfolio,
  createEmptySimulation,
  createEmptyTargetPlan,
  createInitialGoal,
  createInitialProfileInput
} from "@/lib/core/defaults";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function Page() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [authState, setAuthState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setError("Supabase environment variables are missing.");
      setAuthState("error");
      return;
    }

    let isActive = true;

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!isActive) return;

      if (sessionError) {
        setError(sessionError.message);
        setAuthState("error");
        return;
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      const search = typeof window !== "undefined" ? window.location.search : "";
      if (!search.includes("beginner=1")) {
        const meta = (data.session.user?.user_metadata ?? {}) as { experienceYears?: number };
        const expLocal = typeof window !== "undefined" ? Number(window.localStorage.getItem("artha-experience-years") ?? "NaN") : NaN;
        const exp = typeof meta.experienceYears === "number" ? meta.experienceYears : expLocal;
        const onboarded = typeof window !== "undefined" && window.localStorage.getItem("artha-beginner-onboarded") === "1";
        if (Number.isFinite(exp) && exp < 1 && !onboarded) {
          router.replace("/onboarding/beginner");
          return;
        }
      }

      setAuthState("ready");
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setAuthState("ready");
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (authState === "loading") {
    return (
      <main className="page-shell">
        <section className="panel">
          <div className="panel-header">
            <h2>Checking session</h2>
          </div>
          <div className="panel-copy">Loading your Artha dashboard.</div>
        </section>
      </main>
    );
  }

  if (authState === "error") {
    return (
      <main className="page-shell">
        <section className="panel">
          <div className="panel-header">
            <h2>Authentication unavailable</h2>
          </div>
          <div className="panel-copy">{error}</div>
          <div className="button-row" style={{ marginTop: 16 }}>
            <Link className="button" href="/login">
              Go to login
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <DashboardShell
      initialGoal={createInitialGoal()}
      initialPortfolio={createEmptyPortfolio()}
      initialSimulation={createEmptySimulation()}
      initialTargetPlan={createEmptyTargetPlan()}
      initialProfileInput={createInitialProfileInput()}
    />
  );
}
