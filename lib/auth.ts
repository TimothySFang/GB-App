import { getChatGPTUser } from "@/app/chatgpt-auth";
import { first, run } from "@/db";
import type { Role } from "@/lib/types";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
};

export type AuthState =
  | { status: "signed_out" }
  | { status: "authenticated"; user: AppUser };

export async function getAuthState(): Promise<AuthState> {
  const identity = await getChatGPTUser();
  if (!identity) return { status: "signed_out" };

  const existing = await first<AppUser>(
    "SELECT id, email, display_name AS displayName, role FROM users WHERE id = ?",
    identity.userId,
  );

  if (!existing) {
    const count = await first<{ count: number }>("SELECT COUNT(*) AS count FROM users");
    const role: Role = Number(count?.count ?? 0) === 0 ? "admin" : "member";
    await run(
      "INSERT INTO users (id, email, display_name, role) VALUES (?, ?, ?, ?)",
      identity.userId,
      identity.email.trim().toLowerCase(),
      identity.displayName,
      role,
    );
  } else if (existing.email !== identity.email || existing.displayName !== identity.displayName) {
    await run(
      "UPDATE users SET email = ?, display_name = ? WHERE id = ?",
      identity.email.trim().toLowerCase(),
      identity.displayName,
      identity.userId,
    );
  }

  const user = await first<AppUser>(
    "SELECT id, email, display_name AS displayName, role FROM users WHERE id = ?",
    identity.userId,
  );
  if (!user) throw new Error("Could not create the signed-in user");
  return { status: "authenticated", user };
}

export async function requireAuthenticatedUser(): Promise<AppUser | null> {
  const authState = await getAuthState();
  return authState.status === "authenticated" ? authState.user : null;
}

export function isAdmin(user: Pick<AppUser, "role">) {
  return user.role === "admin";
}
