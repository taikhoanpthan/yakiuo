import { mkdir, writeFile } from "node:fs/promises";

const configuredSiteUrl = process.env.VITE_SITE_URL;
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const rawSiteUrl = configuredSiteUrl
  ?? (vercelProductionUrl ? `https://${vercelProductionUrl}` : null)
  ?? "https://yakiuo.vercel.app";

let siteUrl;
try {
  siteUrl = new URL(rawSiteUrl);
} catch {
  throw new Error("VITE_SITE_URL must be a valid absolute URL, for example https://erp.example.com.");
}

if (!/^https?:$/.test(siteUrl.protocol)) {
  throw new Error("VITE_SITE_URL must use http or https.");
}

siteUrl.pathname = siteUrl.pathname.replace(/\/$/, "");
siteUrl.search = "";
siteUrl.hash = "";

const origin = siteUrl.toString().replace(/\/$/, "");
const privatePaths = [
  "/dashboard",
  "/users",
  "/feedback",
  "/notifications",
  "/profile",
  "/todos",
  "/admin/",
  "/chat",
  "/cfs",
  "/caro",
  "/maintenance",
];

const robots = [
  "User-agent: *",
  "Allow: /login",
  ...privatePaths.map((path) => `Disallow: ${path}`),
  "",
  `Sitemap: ${origin}/sitemap.xml`,
  "",
].join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/login</loc>
  </url>
</urlset>
`;

await mkdir("dist", { recursive: true });
await Promise.all([
  writeFile("dist/robots.txt", robots, "utf8"),
  writeFile("dist/sitemap.xml", sitemap, "utf8"),
]);
