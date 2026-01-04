import Link from "next/link";

type Category = { id: string; name: string; slug: string };
type Product = { id: string; name: string; slug: string; base_price_cents: number; currency: string; short_description?: string; main_image_url?: string };

const kpis = [
  { label: "Conversion focus", value: "One-page checkout" },
  { label: "WhatsApp native", value: "Cart continuation" },
  { label: "Pickup or COD", value: "Nairobi ready" },
  { label: "SEO/ISR", value: "Area & category pages" }
];

async function fetchCatalog() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  const tenantId = "00000000-0000-0000-0000-000000000000";
  try {
    const [catRes, prodRes] = await Promise.all([
      fetch(`${apiUrl}/catalog/public/categories?tenantId=${tenantId}`, {
        cache: "no-store",
        headers: { "X-API-Version": "1" }
      }),
      fetch(`${apiUrl}/catalog/public/products?tenantId=${tenantId}`, {
        cache: "no-store",
        headers: { "X-API-Version": "1" }
      })
    ]);
    const categories = await catRes.json();
    const products = await prodRes.json();
    return {
      categories: Array.isArray(categories) ? categories : [],
      products: Array.isArray(products) ? products : []
    };
  } catch (err) {
    return { categories: [], products: [] };
  }
}

export default async function HomePage() {
  const { categories, products } = await fetchCatalog();
  const featuredCategories = categories.slice(0, 4);
  const featuredProducts = products.slice(0, 6);

  return (
    <div className="page">
      <div className="container" style={{ display: "grid", gap: 24 }}>
        {/* Nav */}
        <nav className="nav-bar">
          <div className="nav-brand">
            <span className="pill">Nairobi-first Commerce</span>
            <span className="nav-title">SokoOS</span>
          </div>
          <div className="cta-row nav-actions">
            <Link className="btn btn-secondary" href="/shop">Shop</Link>
            <Link className="btn btn-secondary" href="/checkout">Checkout demo</Link>
            <Link className="btn btn-primary" href="/admin">Admin</Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="panel landing-hero">
          <div>
            <h1 style={{ fontSize: 42, margin: "0 0 12px", lineHeight: 1.05 }}>
              Sell faster in Nairobi with WhatsApp orders, COD/pickup, and insight-rich storefronts.
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 18, marginBottom: 24 }}>
              Mobile-first storefronts and a checkout that respects Nairobi buyers: quick delivery quotes, COD/pickup, and a WhatsApp handoff when needed.
            </p>
            <div className="cta-row">
              <Link className="btn btn-primary" href="/shop">Browse products</Link>
              <Link className="btn btn-secondary" href="/checkout">Try checkout</Link>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              {kpis.map((kpi) => (
                <div key={kpi.label} className="pill" style={{ background: "#ecfeff", color: "#0e7490" }}>
                  <span style={{ fontWeight: 700 }}>{kpi.value}</span>&nbsp;•&nbsp;{kpi.label}
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ border: "1px solid var(--border)", background: "#0b7a75", color: "#e7fbfa", boxShadow: "var(--shadow)" }}>
            <div style={{ padding: 18, borderBottom: "1px solid rgba(255,255,255,0.14)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.82 }}>Insight Card</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Delivery fee is causing drop-off in Westlands</div>
              </div>
              <span className="pill-badge" style={{ background: "#fff3e0", color: "#c2410c" }}>Action</span>
            </div>
            <div style={{ padding: 18 }}>
              <p style={{ margin: "0 0 10px", fontSize: 16 }}>
                Lower Westlands delivery by 50 KES to lift conversion by ~7%. Buyers choosing COD/pickup; WhatsApp handoff recommended for high-value carts.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="metric-card">
                  <div style={{ color: "#6b7280", fontSize: 13 }}>Checkout → Paid</div>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>67%</div>
                  <div style={{ fontSize: 13, color: "#4b5563" }}>+6.2% WoW</div>
                </div>
                <div className="metric-card">
                  <div style={{ color: "#6b7280", fontSize: 13 }}>COD / Pickup mix</div>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>58 / 42</div>
                  <div style={{ fontSize: 13, color: "#4b5563" }}>Westlands favor pickup</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured categories */}
        <div className="panel" style={{ padding: 20 }}>
          <div className="section-head">
            <div>
              <h3 style={{ margin: 0 }}>Popular categories</h3>
              <div style={{ color: "#6b7280" }}>Electronics, fashion, watches, home goods.</div>
            </div>
            <Link className="btn btn-secondary" href="/shop">View shop</Link>
          </div>
          <div className="featured-grid small">
            {featuredCategories.length === 0 && <div style={{ color: "#6b7280" }}>No categories yet.</div>}
            {featuredCategories.map((c) => (
              <div key={c.id} className="panel" style={{ padding: 12, border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 800 }}>{c.name}</div>
                <div style={{ color: "#6b7280" }}>{c.slug}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured products */}
        <div className="panel" style={{ padding: 20 }}>
          <div className="section-head">
            <div>
              <h3 style={{ margin: 0 }}>Featured products</h3>
              <div style={{ color: "#6b7280" }}>Loaded live from the shop catalog.</div>
            </div>
            <Link className="btn btn-secondary" href="/shop">Browse all</Link>
          </div>
          <div className="featured-grid">
            {featuredProducts.length === 0 && <div style={{ color: "#6b7280" }}>No products yet.</div>}
            {featuredProducts.map((p) => (
              <div key={p.id} className="panel" style={{ padding: 12, border: "1px solid var(--border)", display: "grid", gap: 8 }}>
                {p.main_image_url && (
                  <div style={{ width: "100%", height: 140, overflow: "hidden", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                    <img src={p.main_image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                )}
                <div style={{ fontWeight: 800 }}>{p.name}</div>
                <div style={{ color: "#4b5563" }}>
                  {(p.base_price_cents / 100).toFixed(2)} {p.currency}
                </div>
                <div style={{ color: "#6b7280", minHeight: 36 }}>{p.short_description}</div>
                <Link className="btn btn-primary" href="/shop">
                  View in shop
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="panel" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Nairobi-first eCommerce OS</div>
            <div style={{ color: "#6b7280" }}>MPesa-ready, WhatsApp-native, COD/pickup friendly.</div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn btn-secondary" href="/shop">Shop</Link>
            <Link className="btn btn-secondary" href="/checkout">Checkout</Link>
            <Link className="btn btn-secondary" href="/admin">Admin</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
