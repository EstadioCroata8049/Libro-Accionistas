import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Dashboard } from "@/components/dashboard";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const loggedIn = cookieStore.get("logged_in")?.value === "1";

  if (!loggedIn) {
    redirect("/login?from=/dashboard");
  }

  return <Dashboard />;
}
