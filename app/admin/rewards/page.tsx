import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAdmin } from "../../lib/admin-auth";
import RewardVerification from "./panel";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Claréa | فحص الأكواد",
  robots: { index: false, follow: false },
};
export default async function Page() {
  if (!(await isAdmin())) redirect("/admin");
  return <RewardVerification />;
}
