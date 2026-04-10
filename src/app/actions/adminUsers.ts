"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { isSuperadminEmail } from "@/lib/superadmin";

async function requireSuperadmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user?.email || !isSuperadminEmail(user.email)) {
    throw new Error("Forbidden");
  }
  return user;
}

export type AdminUserRow = {
  id: string;
  email: string | undefined;
  created_at: string;
  email_confirmed_at: string | null;
  banned_until: string | null;
};

export async function syncSuperadminProfile() {
  const user = await requireSuperadmin();
  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin.from("profiles").upsert(
    { id: user.id, email: user.email ?? null, total_points: 0 },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function adminListUsers(page: number = 1): Promise<{
  users: AdminUserRow[];
  perPage: number;
}> {
  await requireSuperadmin();
  const admin = createSupabaseServiceRoleClient();
  const perPage = 50;
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
  if (error) throw error;
  const users = (data.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    email_confirmed_at: u.email_confirmed_at ?? null,
    banned_until: u.banned_until ?? null,
  }));
  return { users, perPage };
}

export async function adminCreateUser(formData: FormData) {
  await requireSuperadmin();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const emailConfirm =
    formData.get("emailConfirm") === "on" ||
    formData.get("emailConfirm") === "true" ||
    formData.get("emailConfirm") === "1";
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: emailConfirm,
  });
  if (error) throw error;
  if (data.user) {
    const { error: pErr } = await admin.from("profiles").upsert(
      { id: data.user.id, email: data.user.email ?? email, total_points: 0 },
      { onConflict: "id" },
    );
    if (pErr) throw pErr;
  }
  revalidatePath("/admin");
}

export async function adminDeleteUser(userId: string) {
  const me = await requireSuperadmin();
  if (userId === me.id) {
    throw new Error("You cannot delete your own account.");
  }
  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
  revalidatePath("/admin");
}

export async function adminForceConfirmUser(userId: string) {
  await requireSuperadmin();
  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) throw error;
  revalidatePath("/admin");
}

export async function adminUpdateUserEmail(userId: string, newEmail: string) {
  await requireSuperadmin();
  const email = newEmail.trim();
  if (!email) throw new Error("Email is required.");
  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { email });
  if (error) throw error;
  const { error: pErr } = await admin.from("profiles").update({ email }).eq("id", userId);
  if (pErr) throw pErr;
  revalidatePath("/admin");
}

export async function adminSetUserPassword(userId: string, password: string) {
  await requireSuperadmin();
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw error;
  revalidatePath("/admin");
}
