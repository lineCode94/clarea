import { redirect } from "next/navigation";
import { isAdmin } from "../../lib/admin-auth";
import Panel from "./panel";
export const dynamic = "force-dynamic";
export const metadata = { title: "Claréa | الطلبات", robots: { index: false, follow: false } };
export default async function Page() {
  if (!(await isAdmin())) redirect("/admin");
  return <Panel />;
}
