import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Emilda Governance OS",
    short_name: "Emilda",
    description: "Process governance for owner-led businesses",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f8",
    theme_color: "#17324d",
    icons: [
      {
        src: "/icons/emilda.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
