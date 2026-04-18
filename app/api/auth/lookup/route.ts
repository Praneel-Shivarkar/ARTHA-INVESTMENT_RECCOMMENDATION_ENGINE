import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/db/supabase";
import { isMissingTableError } from "@/lib/supabase/fallback";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase server client is not configured." }, { status: 500 });
  }

  const { identifier, mode } = (await request.json()) as {
    identifier?: string;
    mode?: "resolve" | "availability";
  };

  const value = identifier?.trim();
  if (!value) {
    return NextResponse.json({ error: "Identifier is required." }, { status: 400 });
  }

  if (mode === "availability") {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("user_handle", value.toLowerCase())
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error.message)) {
        return NextResponse.json({ available: true, fallback: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ available: !data });
  }

  if (emailPattern.test(value)) {
    return NextResponse.json({ email: value.toLowerCase() });
  }

  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("user_handle", value.toLowerCase())
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message)) {
      return NextResponse.json(
        { error: "UserId login is unavailable until the Supabase profile tables are created. Please sign in with email." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.email) {
    return NextResponse.json({ error: "No account found for that email or userId." }, { status: 404 });
  }

  return NextResponse.json({ email: data.email });
}
