import type { Metadata } from "next";
import CatalogPage from "./components/catalog-page";
import { CatalogProvider } from "./components/catalog-provider";
import { publicCatalog } from "./lib/catalog-store";
const shareTitle = "Claréa | عناية وجمال من حول العالم";
const shareDescription =
  "اكتشفي منتجات العناية بالبشرة والشعر والجمال من براندات عالمية مع Claréa. اختيارات من حول العالم، في مكان واحد. Skincare, haircare & beauty from international brands.";
export const metadata: Metadata = {
  title: shareTitle,
  description: shareDescription,
  openGraph: {
    type: "website",
    url: "https://clarea-three.vercel.app/",
    siteName: "Claréa",
    title: shareTitle,
    description: shareDescription,
    images: [
      {
        url: "https://clarea-three.vercel.app/clarea_logo_horizontal.png",
        alt: "Claréa — Beauty & Care",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description: shareDescription,
    images: ["https://clarea-three.vercel.app/clarea_logo_horizontal.png"],
  },
};
export const dynamic = "force-dynamic";
export default async function Home() {
  const products = await publicCatalog();
  return (
    <CatalogProvider products={products}>
      <CatalogPage />
    </CatalogProvider>
  );
}
