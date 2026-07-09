import { redirect } from "next/navigation";
import { exigirUid } from "@/lib/sessao";
import { EH_DONO } from "@/lib/admin";
import { AdminClient } from "@/components/admin/admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const uid = await exigirUid();
  if (!EH_DONO(uid)) redirect("/");
  return <AdminClient />;
}
