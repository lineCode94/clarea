export type Language = "ar" | "en";
export type ProductDetails = {
  size: string;
  skinType: Record<Language, string>;
  ingredients: Record<Language, string[]>;
  usage: Record<Language, string[]>;
  caution: Record<Language, string>;
  contents?: Record<Language, string[]>;
};
export type Product = {
  id: string;
  brand: string;
  name: string;
  category: "skin" | "hair" | "supplements";
  available: boolean;
  stock_status?: "available" | "coming_soon" | "out_of_stock";
  images: string[];
  tone: string;
  label: Record<Language, string>;
  description: Record<Language, string>;
  source?: string;
  details?: ProductDetails;
  imageTransform?: string;
};
