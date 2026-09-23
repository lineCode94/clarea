import type { Metadata } from "next";
import Tracking from "./tracking";
export const metadata: Metadata = {
  title: "متابعة طلبك | Claréa",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <Tracking />;
}
