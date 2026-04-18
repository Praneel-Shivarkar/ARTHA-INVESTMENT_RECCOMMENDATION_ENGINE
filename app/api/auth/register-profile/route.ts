import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/db/supabase";
import { isMissingTableError } from "@/lib/supabase/fallback";

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase server client is not configured." }, { status: 500 });
  }

  const payload = (await request.json()) as {
    id?: string;
    email?: string;
    fullName?: string;
    userId?: string;
    phoneNumber?: string;
  };

  if (!payload.id || !payload.email || !payload.fullName || !payload.userId || !payload.phoneNumber) {
    return NextResponse.json({ error: "Incomplete profile payload." }, { status: 400 });
  }

  const { error } = await supabase.from("users").upsert(
    {
      id: payload.id,
      email: payload.email.toLowerCase(),
      full_name: payload.fullName,
      user_handle: payload.userId.toLowerCase(),
      phone_number: payload.phoneNumber
    },
    { onConflict: "id" }
  );

  if (error) {
    if (isMissingTableError(error.message)) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "Public users table is not available yet. Continuing with auth metadata only."
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
