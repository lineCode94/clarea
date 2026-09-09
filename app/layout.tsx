import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claréa | Korean Skincare",
  description:
    "اكتشفي العناية الكورية من Claréa، وتصفّحي المنتجات واطلبي عبر واتساب. Explore Korean skincare and order through WhatsApp.",
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
        url: "/clarea-flower-rose.png",
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
      <body>{children}</body>
    </html>
  );
}
