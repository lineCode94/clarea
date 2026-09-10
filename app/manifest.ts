import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
 return { id: "/", name: "Claréa | Beauty & Care", short_name: "Claréa", description: "Beauty, skincare and haircare from Claréa.", start_url: "/", scope: "/", display: "standalone", background_color: "#fbf7f2", theme_color: "#541c2b", icons: [ {src:"/pwa/icon-192.png",sizes:"192x192",type:"image/png",purpose:"any"}, {src:"/pwa/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any"}, {src:"/pwa/maskable-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"} ] };
}
