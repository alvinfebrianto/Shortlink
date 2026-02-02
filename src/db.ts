import { Database } from "bun:sqlite";

const db = new Database("shortlink.sqlite");

db.run(`
  CREATE TABLE IF NOT EXISTS links (
    slug TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    visits_count INTEGER DEFAULT 0
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    user_agent TEXT,
    referrer TEXT,
    FOREIGN KEY(slug) REFERENCES links(slug)
  )
`);

export interface Link {
  slug: string;
  url: string;
  created_at: number;
  visits_count: number;
}

export const DB = {
  createLink: (slug: string, url: string) => {
    return db.run("INSERT INTO links (slug, url, created_at) VALUES (?, ?, ?)", [slug, url, Date.now()]);
  },

  getLink: (slug: string) => {
    return db.query("SELECT * FROM links WHERE slug = ?").get(slug) as Link | null;
  },

  getAllLinks: () => {
    return db.query("SELECT * FROM links ORDER BY created_at DESC").all() as Link[];
  },

  logVisit: (slug: string, userAgent: string | null, referrer: string | null) => {
    db.transaction(() => {
      db.run(
        "INSERT INTO visits (slug, timestamp, user_agent, referrer) VALUES (?, ?, ?, ?)",
        [slug, Date.now(), userAgent, referrer]
      );
      db.run("UPDATE links SET visits_count = visits_count + 1 WHERE slug = ?", [slug]);
    })();
  },

  linkExists: (slug: string) => {
    const result = db.query("SELECT 1 FROM links WHERE slug = ?").get(slug);
    return !!result;
  }
};
