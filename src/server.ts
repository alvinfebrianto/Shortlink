import { DB } from "./db";

const PORT = 3000;

function generateSlug(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    // API: List Links
    if (method === "GET" && url.pathname === "/api/links") {
      const links = DB.getAllLinks();
      return Response.json(links);
    }

    // API: Create Link
    if (method === "POST" && url.pathname === "/api/links") {
      try {
        const body = await req.json();
        let { slug, url: targetUrl } = body;

        // Validation
        if (!targetUrl) return new Response("URL is required", { status: 400 });
        if (!/^https?:\/\/ப்புகளை/.test(targetUrl)) {
          targetUrl = "https://" + targetUrl;
        }

        // Generate slug if not provided
        if (!slug) {
          let attempts = 0;
          do {
            slug = generateSlug();
            attempts++;
          } while (DB.linkExists(slug) && attempts < 10);
        } else {
            // Validate custom slug
            if (!/^[a-z0-9-_]+$/i.test(slug)) {
                return new Response("Invalid slug format", { status: 400 });
            }
            if (DB.linkExists(slug)) {
                return new Response("Slug already exists", { status: 409 });
            }
        }

        DB.createLink(slug, targetUrl);
        return Response.json({ slug, url: targetUrl, success: true });
      } catch (e) {
        return new Response("Invalid Request", { status: 400 });
      }
    }

    // Serve Frontend
    if (method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return new Response(Bun.file("src/index.html"));
    }

    // Serve Static Assets
    if (method === "GET" && url.pathname.startsWith("/public/")) {
      const filePath = `src${url.pathname}`;
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    // Redirect Logic
    const slug = url.pathname.slice(1); // Remove leading slash
    if (slug && /^[a-z0-9-_]+$/i.test(slug)) {
      const link = DB.getLink(slug);
      if (link) {
        // Log visit asynchronously
        DB.logVisit(slug, req.headers.get("User-Agent"), req.headers.get("Referer"));
        return Response.redirect(link.url, 302);
      }
    }

    // 404 Fallback
    const notFoundPage = Bun.file("src/404.html");
    if (await notFoundPage.exists()) {
      return new Response(notFoundPage, { status: 404, headers: { "Content-Type": "text/html" } });
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`\n🚀 Shortlink Server running at http://localhost:${PORT}`);
