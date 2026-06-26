import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireUser(role) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/admin/login");
  }
  if (role && user.role !== role) {
    redirect("/admin/login");
  }

  return user;
}