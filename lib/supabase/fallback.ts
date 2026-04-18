import { User } from "@supabase/supabase-js";

import { UserAccountProfile } from "@/lib/types";

export function isMissingTableError(message?: string | null) {
  if (!message) return false;
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("relation") ||
    message.includes("does not exist")
  );
}

export function buildProfileFromAuthUser(user: User): UserAccountProfile {
  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: metadata.fullName ?? metadata.full_name ?? "Investor",
    userHandle: metadata.userId ?? metadata.user_handle ?? (user.email?.split("@")[0] ?? "investor"),
    phoneNumber: metadata.phoneNumber ?? metadata.phone_number ?? ""
  };
}
