import React, { useState, useMemo, useEffect } from "react";
import { Search, ArrowUpDown, ExternalLink, Zap, Loader2, AlertCircle, Filter, X } from "lucide-react";

// ============================================================================
//  SparkPrice — electrical-parts price comparison
//  ---------------------------------------------------------------------------
//  HOW IT WORKS:
//  - The UI below is fully functional.
//  - It calls a backend endpoint (BACKEND_URL) that you deploy yourself.
//    That backend holds your API key (eBay Browse / SerpApi / etc.) and
//    returns normalized results. See the backend file I provide separately.
//  - Until your backend is live, the app runs in DEMO mode with sample data
//    so you can see and test everything. Flip USE_DEMO to false once deployed.
// ============================================================================

const USE_DEMO = true;
const BACKEND_URL = "https://YOUR-BACKEND.vercel.app/api/search"; // <- change after deploy

// --- Demo dataset: realistic electrical parts across sellers --------------
const DEMO_DB = [
  { id: 1, name: '12 AWG THHN Stranded Copper Wire — 500 ft, Black', cat: 'wire', seller: 'Graybar', price: 142.50, unit: '/500ft', ship: 'Free', stock: true, url: '#' },
  { id: 2, name: '12 AWG THHN Stranded Copper Wire — 500 ft, Black', cat: 'wire', seller: 'Home Depot Pro', price: 138.99, unit: '/500ft', ship: '$12.00', stock: true, url: '#' },
  { id: 3, name: '12 AWG THHN Stranded Copper Wire — 500 ft, Black', cat: 'wire', seller: 'Grainger', price: 151.20, unit: '/500ft', ship: 'Free', stock: true, url: '#' },
  { id: 4, name: '12 AWG THHN Stranded Copper Wire — 500 ft, Black', cat: 'wire', seller: 'Zoro', price: 134.75, unit: '/500ft', ship: 'Free over $50', stock: true, url: '#' },
  { id: 5, name: '12-2 NM-B Romex w/ Ground — 250 ft', cat: 'wire', seller: 'Home Depot Pro', price: 189.00, unit: '/250ft', ship: 'Free', stock: true, url: '#' },
  { id: 6, name: '12-2 NM-B Romex w/ Ground — 250 ft', cat: 'wire', seller: 'Lowe\'s Pro', price: 197.50, unit: '/250ft', ship: '$15.00', stock: false, url: '#' },
  { id: 7, name: '1/2 in. EMT Conduit Connector, Set-Screw (50 pk)', cat: 'fitting', seller: 'Graybar', price: 28.40, unit: '/50pk', ship: 'Free', stock: true, url: '#' },
  { id: 8, name: '1/2 in. EMT Conduit Connector, Set-Screw (50 pk)', cat: 'fitting', seller: 'Grainger', price: 31.10, unit: '/50pk', ship: 'Free', stock: true, url: '#' },
  { id: 9, name: '1/2 in. EMT Conduit Connector, Set-Screw (50 pk)', cat: 'fitting', seller: 'Zoro', price: 24.95, unit: '/50pk', ship: 'Free over $50', stock: true, url: '#' },
  { id: 10, name: '3/4 in. Liquidtight Straight Connector', cat: 'fitting', seller: 'Home Depot Pro', price: 4.18, unit: '/ea', ship: '$8.00', stock: true, url: '#' },
  { id: 11, name: '20A Single-Pole Breaker, QO Series', cat: 'breaker', seller: 'Graybar', price: 12.85, unit: '/ea', ship: 'Free', stock: true, url: '#' },
  { id: 12, name: '20A Single-Pole Breaker, QO Series', cat: 'breaker', seller: 'Grainger', price: 14.20, unit: '/ea', ship: 'Free', stock: true, url: '#' },
  { id: 13, name: '20A Single-Pole Breaker, QO Series', cat: 'breaker', seller: 'Rexel', price: 11.95, unit: '/ea', ship: '$9.50', stock: true, url: '#' },
  { id: 14, name: '15A Decorator Receptacle, Tamper-Resistant (10 pk)', cat: 'device', seller: 'Zoro', price: 21.40, unit: '/10pk', ship: 'Free over $50', stock: true, url: '#' },
  { id: 15, name: '15A Decorator Receptacle, Tamper-Resistant (10 pk)', cat: 'device', seller: 'Home Depot Pro', price: 23.97, unit: '/10pk', ship: 'Free', stock: true, url: '#' },
  { id: 16, name: '4 in. Square Junction Box, 1-1/2 in. Deep', cat: 'fitting', seller: 'Graybar', price: 2.10, unit: '/ea', ship: 'Free', stock: true, url: '#' },
];

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'wire', label: 'Wire & Cable' },
  { id: 'fitting', label: 'Fittings & Conduit' },
  { id: 'breaker', label: 'Breakers' },
  { id: 'device', label: 'Devices' },
];

function fakeSearch(query, cat) {
  const q = query.trim().toLowerCase();
  return DEMO_DB.filter((r) => {
    const matchQ = !q || r.name.toLowerCase().includes(q) || r.seller.toLowerCase().includes(q);
    const matchC = cat === 'all' || r.cat === cat;
    return matchQ && matchC;
  });
}

export default function SparkPrice() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("12 AWG THHN");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("price");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runSearch(q, c) {
    setLoading(true);
    setError(null);
    try {
      if (USE_DEMO) {
        await new Promise((r) => setTimeout(r, 450));
        setResults(fakeSearch(q, c));
      } else {
        const res = await fetch(`${BACKEND_URL}?q=${encodeURIComponent(q)}&cat=${c}`);
        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (e) {
      setError(e.message || "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runSearch(submitted, cat); /* eslint-disable-next-line */ }, [submitted, cat]);

  const view = useMemo(() => {
    let r = [...results];
    if (inStockOnly) r = r.filter((x) => x.stock);
    r.sort((a, b) => {
      if (sort === "price") return a.price - b.price;
      if (sort === "priceDesc") return b.price - a.price;
      if (sort === "seller") return a.seller.localeCompare(b.seller);
      return 0;
    });
    return r;
  }, [results, sort, inStockOnly]);

  const best = view.length ? Math.min(...view.map((r) => r.price)) : null;

  return (
    <div style={S.page}>
      <style>{KEYFRAMES}</style>

      {/* Header */}
      <header style={S.header}>
        <div style={S.brandRow}>
          <div style={S.logoMark}><Zap size={20} strokeWidth={2.5} /></div>
          <div>
            <div style={S.brand}>SPARKPRICE</div>
            <div style={S.tagline}>electrical parts · live price compare</div>
          </div>
          {USE_DEMO && <div style={S.demoBadge}>DEMO DATA</div>}
        </div>

        {/* Search bar */}
        <div style={S.searchWrap}>
          <Search size={18} style={{ color: "#8a8577", flexShrink: 0 }} />
          <input
            style={S.input}
            placeholder="Search parts, e.g. 12 AWG THHN, EMT connector, 20A breaker…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSubmitted(query); }}
          />
          {query && (
            <button style={S.clearBtn} onClick={() => setQuery("")}><X size={16} /></button>
          )}
          <button style={S.goBtn} onClick={() => setSubmitted(query)}>SEARCH</button>
        </div>

        {/* Category pills */}
        <div style={S.pills}>
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{ ...S.pill, ...(cat === c.id ? S.pillActive : {}) }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      {/* Controls */}
      <div style={S.controls}>
        <div style={S.resultCount}>
          {loading ? "Searching…" : `${view.length} result${view.length !== 1 ? "s" : ""}`}
          {submitted && !loading && <span style={{ color: "#8a8577" }}> for "{submitted}"</span>}
        </div>
        <div style={S.controlBtns}>
          <button
            style={{ ...S.ctrlBtn, ...(inStockOnly ? S.ctrlBtnActive : {}) }}
            onClick={() => setInStockOnly((v) => !v)}
          >
            <Filter size={14} /> In stock
          </button>
          <button style={S.ctrlBtn} onClick={() => setSort((s) => (s === "price" ? "priceDesc" : "price"))}>
            <ArrowUpDown size={14} /> Price {sort === "priceDesc" ? "↓" : "↑"}
          </button>
        </div>
      </div>

      {/* Results */}
      <main style={S.main}>
        {loading && (
          <div style={S.center}><Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#d4a017" }} /></div>
        )}

        {error && (
          <div style={S.errorBox}>
            <AlertCircle size={18} />
            <div>
              <strong>Couldn't reach the price backend.</strong>
              <div style={{ fontSize: 13, marginTop: 4, color: "#a89a7a" }}>{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && view.length === 0 && (
          <div style={S.center}><div style={{ color: "#8a8577" }}>No matches. Try a broader term.</div></div>
        )}

        {!loading && view.map((r, i) => (
          <div key={r.id} style={{ ...S.card, animationDelay: `${i * 40}ms` }}>
            <div style={S.cardMain}>
              <div style={S.cardName}>{r.name}</div>
              <div style={S.cardMeta}>
                <span style={S.seller}>{r.seller}</span>
                <span style={{ ...S.stock, color: r.stock ? "#3d8b40" : "#b04b3a" }}>
                  {r.stock ? "● In stock" : "○ Backordered"}
                </span>
                <span style={S.ship}>Ship: {r.ship}</span>
              </div>
            </div>
            <div style={S.cardRight}>
              <div style={S.priceWrap}>
                <span style={{ ...S.price, ...(r.price === best ? S.priceBest : {}) }}>
                  ${r.price.toFixed(2)}
                </span>
                <span style={S.unit}>{r.unit}</span>
                {r.price === best && <span style={S.bestTag}>LOWEST</span>}
              </div>
              <a href={r.url} target="_blank" rel="noreferrer" style={S.viewBtn}>
                View <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ))}
      </main>

      <footer style={S.footer}>
        Prices are {USE_DEMO ? "sample data" : "from connected sellers"} · always verify on the seller's site before ordering
      </footer>
    </div>
  );
}

const KEYFRAMES = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
* { box-sizing: border-box; }
`;

const S = {
  page: { fontFamily: "'DM Sans', system-ui, sans-serif", background: "#1a1814", minHeight: "100vh", color: "#ece6d8", maxWidth: 760, margin: "0 auto" },
  header: { padding: "20px 18px 14px", background: "linear-gradient(160deg,#222019,#1a1814)", borderBottom: "1px solid #332f26", position: "sticky", top: 0, zIndex: 10 },
  brandRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 18 },
  logoMark: { width: 38, height: 38, borderRadius: 9, background: "linear-gradient(135deg,#d4a017,#b8860b)", display: "grid", placeItems: "center", color: "#1a1814", boxShadow: "0 2px 12px rgba(212,160,23,.35)" },
  brand: { fontWeight: 800, letterSpacing: "0.12em", fontSize: 17, color: "#f4efe2" },
  tagline: { fontSize: 11, color: "#8a8577", letterSpacing: "0.03em", marginTop: 1 },
  demoBadge: { marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#d4a017", border: "1px solid #5a4d22", padding: "4px 8px", borderRadius: 6, background: "#2a2418" },
  searchWrap: { display: "flex", alignItems: "center", gap: 10, background: "#0f0e0b", border: "1px solid #3a352a", borderRadius: 12, padding: "10px 12px" },
  input: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#ece6d8", fontSize: 15, fontFamily: "inherit" },
  clearBtn: { background: "transparent", border: "none", color: "#8a8577", cursor: "pointer", padding: 2, display: "grid", placeItems: "center" },
  goBtn: { background: "#d4a017", color: "#1a1814", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", cursor: "pointer" },
  pills: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" },
  pill: { background: "#262219", border: "1px solid #3a352a", color: "#b3ab97", borderRadius: 20, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" },
  pillActive: { background: "#d4a017", color: "#1a1814", borderColor: "#d4a017", fontWeight: 600 },
  controls: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 8px", flexWrap: "wrap", gap: 10 },
  resultCount: { fontSize: 13, color: "#b3ab97" },
  controlBtns: { display: "flex", gap: 8 },
  ctrlBtn: { display: "flex", alignItems: "center", gap: 5, background: "#262219", border: "1px solid #3a352a", color: "#b3ab97", borderRadius: 8, padding: "6px 11px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  ctrlBtnActive: { background: "#2a2418", borderColor: "#5a4d22", color: "#d4a017" },
  main: { padding: "8px 18px 24px", display: "flex", flexDirection: "column", gap: 10 },
  center: { padding: "48px 0", display: "grid", placeItems: "center" },
  errorBox: { display: "flex", gap: 12, background: "#2a1d18", border: "1px solid #5a3328", color: "#e0b4a8", borderRadius: 10, padding: "14px 16px", alignItems: "flex-start" },
  card: { display: "flex", gap: 12, background: "#221f18", border: "1px solid #2f2b21", borderRadius: 12, padding: "14px 16px", animation: "riseIn .3s ease both", justifyContent: "space-between" },
  cardMain: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 14.5, fontWeight: 600, color: "#f4efe2", lineHeight: 1.35, marginBottom: 8 },
  cardMeta: { display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 },
  seller: { color: "#d4a017", fontWeight: 600 },
  stock: { fontSize: 11.5 },
  ship: { color: "#8a8577" },
  cardRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 },
  priceWrap: { display: "flex", flexDirection: "column", alignItems: "flex-end", position: "relative" },
  price: { fontSize: 20, fontWeight: 800, color: "#ece6d8", lineHeight: 1 },
  priceBest: { color: "#7bc47f" },
  unit: { fontSize: 11, color: "#8a8577", marginTop: 2 },
  bestTag: { fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#1a1814", background: "#7bc47f", padding: "2px 6px", borderRadius: 4, marginTop: 5 },
  viewBtn: { display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "1px solid #3a352a", color: "#ece6d8", borderRadius: 8, padding: "6px 12px", fontSize: 12, textDecoration: "none", fontWeight: 600 },
  footer: { padding: "16px 18px 28px", fontSize: 11, color: "#6b665a", textAlign: "center", borderTop: "1px solid #2a2620" },
};
