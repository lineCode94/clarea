import CatalogPage from "./components/catalog-page";
import { CatalogProvider } from "./components/catalog-provider";
import { publicCatalog } from "./lib/catalog-store";
export const dynamic = "force-dynamic";
export default async function Home() {
  const products = await publicCatalog();
  return (
    <CatalogProvider products={products}>
      <CatalogPage />
    </CatalogProvider>
  );
}
