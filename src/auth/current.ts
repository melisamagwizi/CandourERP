import { redirect } from "next/navigation";
import { getSession } from "./session";

/** Returns the current session or redirects to /login. Use in protected pages. */
export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
