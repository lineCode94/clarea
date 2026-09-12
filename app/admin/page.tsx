import type { Metadata } from "next";
import { isAdmin } from "../lib/admin-auth";
import AdminPanel from "./panel";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Claréa | إدارة المنتجات",
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  return <AdminPanel authenticated={await isAdmin()} />;
}
