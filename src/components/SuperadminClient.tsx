"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import {
  adminCreateUser,
  adminDeleteUser,
  adminForceConfirmUser,
  adminListUsers,
  adminSetUserPassword,
  adminUpdateUserEmail,
  type AdminUserRow,
} from "@/app/actions/adminUsers";

export function SuperadminClient({
  email,
  profileSyncError,
  initialUsers,
  initialPerPage,
  initialListError,
}: {
  email: string;
  profileSyncError: string | null;
  initialUsers: AdminUserRow[];
  initialPerPage: number;
  initialListError: string | null;
}) {
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [loadError, setLoadError] = useState<string | null>(initialListError);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async (p: number) => {
    setLoadError(null);
    try {
      const { users: list, perPage: pp } = await adminListUsers(p);
      setUsers(list);
      setPerPage(pp);
      setPage(p);
    } catch (e) {
      setUsers([]);
      setLoadError(e instanceof Error ? e.message : "Failed to load users.");
    }
  }, []);

  const run = useCallback((fn: () => Promise<void>) => {
    setActionError(null);
    setActionOk(null);
    startTransition(async () => {
      try {
        await fn();
        setActionOk("Done.");
        await refresh(page);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }, [page, refresh]);

  const handleCreateUser = useCallback(
    async (fd: FormData) => {
      setActionError(null);
      setActionOk(null);
      startTransition(async () => {
        try {
          await adminCreateUser(fd);
          setActionOk("User created.");
          await refresh(1);
        } catch (e) {
          setActionError(e instanceof Error ? e.message : "Create failed.");
        }
      });
    },
    [refresh],
  );

  return (
    <div className="min-h-[100svh] bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Superadmin</h1>
            <p className="text-xs text-zinc-500">{email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Home
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        {profileSyncError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong className="font-semibold">Setup:</strong> {profileSyncError} Set{" "}
            <code className="rounded bg-amber-100/80 px-1">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
            <code className="rounded bg-amber-100/80 px-1">.env.local</code> (Dashboard → Settings → API).
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {loadError}
          </div>
        ) : null}

        {actionError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {actionError}
          </div>
        ) : null}

        {actionOk ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {actionOk}
          </div>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Create user</h2>
          <form action={handleCreateUser} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-500">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-500">Password</label>
              <input
                name="password"
                type="password"
                minLength={6}
                required
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="emailConfirm" value="on" className="rounded border-zinc-300" />
                Email already confirmed
              </label>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Create user
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Users</h2>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || isPending}
                onClick={() => void refresh(page - 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={users.length < perPage || isPending}
                onClick={() => void refresh(page + 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Confirmed</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow key={`${u.id}-${u.email ?? ""}`} u={u} disabled={isPending} run={run} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function UserRow({
  u,
  disabled,
  run,
}: {
  u: AdminUserRow;
  disabled: boolean;
  run: (fn: () => Promise<void>) => void;
}) {
  const confirmed = Boolean(u.email_confirmed_at);
  const banned = Boolean(u.banned_until);

  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="py-3 pr-3">
        <div className="max-w-[26rem]">
          <div className="truncate font-medium text-zinc-900" title={u.email ?? u.id}>
            {u.email ?? "—"}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-zinc-500" title={u.id}>
            {u.id}
          </div>
        </div>
      </td>
      <td className="py-3 pr-3">
        {banned ? (
          <span className="text-rose-600">Banned</span>
        ) : confirmed ? (
          <span className="text-emerald-600">Yes</span>
        ) : (
          <span className="text-amber-700">No</span>
        )}
      </td>
      <td className="py-3 pr-3 whitespace-nowrap text-zinc-600">
        {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
      </td>
      <td className="py-3">
        <div className="flex flex-wrap gap-2">
          {!confirmed ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => run(async () => adminForceConfirmUser(u.id))}
              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Force confirm
            </button>
          ) : null}

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const nextEmail = window.prompt("New email", u.email ?? "");
              if (!nextEmail) return;
              run(async () => adminUpdateUserEmail(u.id, nextEmail));
            }}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-40"
          >
            Change email
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const nextPass = window.prompt("New password (min 6 chars)");
              if (!nextPass) return;
              run(async () => adminSetUserPassword(u.id, nextPass));
            }}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-40"
          >
            Reset password
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!window.confirm(`Delete user ${u.email ?? u.id}? This cannot be undone.`)) return;
              run(async () => adminDeleteUser(u.id));
            }}
            className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
