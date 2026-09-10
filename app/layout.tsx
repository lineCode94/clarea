import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./components/pwa-register";
export const viewport: Viewport = { themeColor: "#541c2b" };

export const metadata: Metadata = {
  title: "Claréa | Beauty & Care",
  description:
    "اكتشفي العناية بالبشرة والشعر من Claréa، وتصفّحي المنتجات واطلبي عبر واتساب. Explore beauty and care and order through WhatsApp.",
  applicationName: "Claréa",
  appleWebApp: { capable: true, title: "Claréa", statusBarStyle: "default" },
  icons: {
    icon: [
      {
        url: "/favicon.ico?v=rose-2",
        type: "image/x-icon",
        sizes: "32x32 256x256",
      },
      {
        url: "/clarea-tab-rose-v2.png",
        type: "image/png",
        sizes: "32x32",
      },
    ],
    shortcut: "/favicon.ico?v=rose-2",
    apple: [
      {
        url: "/pwa/apple-touch-icon.png",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
