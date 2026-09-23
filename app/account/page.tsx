import type { Metadata } from "next";
import Account from "./account";
export const metadata: Metadata = {
  title: "طلباتي | Claréa",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <Account />;
}
