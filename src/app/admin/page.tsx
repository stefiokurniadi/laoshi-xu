import { adminListUsers, syncSuperadminProfile } from "@/app/actions/adminUsers";
import { SuperadminClient } from "@/components/SuperadminClient";
import { isSuperadminEmail } from "@/lib/superadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isSuperadminEmail(user.email)) {
    redirect("/");
  }

  let profileSyncError: string | null = null;
  try {
    await syncSuperadminProfile();
  } catch (e) {
    profileSyncError = e instanceof Error ? e.message : "Could not sync admin profile.";
  }

  let initialUsers: Awaited<ReturnType<typeof adminListUsers>>["users"] = [];
  let initialPerPage = 50;
  let listError: string | null = null;
  try {
    const r = await adminListUsers(1);
    initialUsers = r.users;
    initialPerPage = r.perPage;
  } catch (e) {
    listError = e instanceof Error ? e.message : "Failed to load users.";
  }

  return (
    <SuperadminClient
      email={user.email}
      profileSyncError={profileSyncError}
      initialUsers={initialUsers}
      initialPerPage={initialPerPage}
      initialListError={listError}
    />
  );
}
