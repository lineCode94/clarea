import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./components/pwa-register";
import SiteLoading from "./components/site-loading";
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
        url: "/favicon.ico?v=logo-3",
        type: "image/x-icon",
        sizes: "192x192",
      },
      {
        url: "/clarea-logo-icon-v3.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    shortcut: "/favicon.ico?v=logo-3",
    apple: [
      {
        url: "/pwa/apple-touch-icon-logo-v3.png",
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
      <body>
        <PwaRegister />
        <SiteLoading>{children}</SiteLoading>
      </body>
    </html>
  );
}
