// ============================================================================
//  SparkPrice backend  —  api/search
//  ---------------------------------------------------------------------------
//  This is what makes price search REAL. It holds your API key (never exposed
//  to the browser) and returns results normalized to the shape the app expects.
//
//  DEPLOY (≈10 min, free tier):
//    1. npm init -y && npm install express node-fetch cors
//    2. Put this file as  api/search.js  (Vercel)  or  server.js  (Render)
//    3. Set env var EBAY_TOKEN (or SERPAPI_KEY) in the host dashboard
//    4. Deploy. Copy the live URL into BACKEND_URL in the app, set USE_DEMO=false
//
//  Two provider examples below — eBay Browse API and SerpApi (Google Shopping).
//  Pick ONE to start. Neither requires vendor status.
//  Later, swap/add your approved distributor feed (Punchout/cXML or their API)
//  using the same normalize() output shape.
// ============================================================================

import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

// --- The shape the frontend expects -----------------------------------------
// { id, name, cat, seller, price, unit, ship, stock, url }

// ---------------------------------------------------------------------------
//  TOP-10 SUPPLIER ALLOWLIST
//  Aggregated results are filtered down to ONLY these sellers.
//  Each entry has match strings (lowercased) to catch name variations that
//  appear in aggregator "source"/"seller" fields (e.g. "The Home Depot").
//  As you get direct trade-account feeds, add a real connector for that
//  supplier and it bypasses the aggregator entirely.
// ---------------------------------------------------------------------------
const SUPPLIERS = [
  { name: "Grainger",        match: ["grainger"] },
  { name: "Graybar",         match: ["graybar"] },
  { name: "Rexel",           match: ["rexel"] },
  { name: "Platt",           match: ["platt"] },
  { name: "Home Depot Pro",  match: ["home depot", "homedepot"] },
  { name: "Lowe's Pro",      match: ["lowe's", "lowes"] },
  { name: "Zoro",            match: ["zoro"] },
  { name: "City Electric",   match: ["city electric", "cesco"] },
  { name: "Border States",   match: ["border states"] },
  { name: "Gexpro",          match: ["gexpro"] },
  { name: "Gordon Electric Supply", match: ["gordon electric", "gordonelectric"] },
  { name: "SupplyHouse.com", match: ["supplyhouse", "supply house"] },
];

// Returns the canonical supplier name if the raw seller string matches one of
// our 10, otherwise null (so it gets filtered out).
function matchSupplier(rawSeller) {
  const s = (rawSeller || "").toLowerCase();
  for (const sup of SUPPLIERS) {
    if (sup.match.some((m) => s.includes(m))) return sup.name;
  }
  return null;
}

// Keep only results from the 10 suppliers; relabel seller to canonical name.
function filterToSuppliers(results) {
  return results
    .map((r) => {
      const canonical = matchSupplier(r.seller);
      return canonical ? { ...r, seller: canonical } : null;
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
//  OPTION A — eBay Browse API  (free, huge electrical-parts inventory)
//  Get a token at developer.ebay.com → Application access token
// ---------------------------------------------------------------------------
async function searchEbay(q, cat) {
  const token = process.env.EBAY_TOKEN;
  const url =
    "https://api.ebay.com/buy/browse/v1/item_summary/search" +
    `?q=${encodeURIComponent(q + " electrical")}&limit=20`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });
  if (!res.ok) throw new Error(`eBay API ${res.status}`);
  const data = await res.json();

  return (data.itemSummaries || []).map((it, i) => ({
    id: it.itemId || i,
    name: it.title,
    cat: cat || "all",
    seller: it.seller?.username || "eBay seller",
    price: parseFloat(it.price?.value || 0),
    unit: "/ea",
    ship:
      it.shippingOptions?.[0]?.shippingCost?.value === "0.00"
        ? "Free"
        : `$${it.shippingOptions?.[0]?.shippingCost?.value || "?"}`,
    stock: true,
    url: it.itemWebUrl,
  }));
}

// ---------------------------------------------------------------------------
//  OPTION B — SerpApi (Google Shopping)  pulls prices across many sellers
//  Get a key at serpapi.com
// ---------------------------------------------------------------------------
async function searchSerp(q, cat) {
  const key = process.env.SERPAPI_KEY;
  const url =
    "https://serpapi.com/search.json?engine=google_shopping" +
    `&q=${encodeURIComponent(q)}&api_key=${key}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpApi ${res.status}`);
  const data = await res.json();

  return (data.shopping_results || []).map((it, i) => ({
    id: it.product_id || i,
    name: it.title,
    cat: cat || "all",
    seller: it.source || "Seller",
    price: parseFloat(String(it.price).replace(/[^0-9.]/g, "")) || 0,
    unit: "/ea",
    ship: it.delivery || "—",
    stock: true,
    url: it.product_link || it.link,
  }));
}

// --- Route ------------------------------------------------------------------
app.get("/api/search", async (req, res) => {
  const q = req.query.q || "";
  const cat = req.query.cat || "all";
  try {
    // Choose your provider here:
    let results = await searchEbay(q, cat);
    // let results = await searchSerp(q, cat);

    // Keep ONLY the top-10 suppliers
    results = filterToSuppliers(results);

    // Sort cheapest first before returning
    results.sort((a, b) => a.price - b.price);
    res.json({ results });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: e.message, results: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SparkPrice backend on :${PORT}`));

// For Vercel serverless, export instead of listen:
// export default app;
