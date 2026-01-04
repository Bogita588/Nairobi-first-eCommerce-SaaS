/** @jsxImportSource react */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type EventCount = { event_type: string; count: number };
type TopProduct = { id: string; name: string; main_image_url?: string; views?: number; add_to_carts?: number };

export default function DashboardPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  const tenantId = "00000000-0000-0000-0000-000000000000";
  const router = useRouter();

  const [counts, setCounts] = useState<EventCount[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("admintoken") : null;
    if (!savedToken) {
      router.push("/admin");
      return;
    }
    setToken(savedToken);
    loadSummary();
    const onFocus = () => loadSummary();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(() => loadSummary(true), 10000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, []);

  async function loadSummary(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/events/summary?days=7`, {
        headers: { "X-API-Version": "1", "X-Tenant-ID": tenantId, Authorization: token ? `Bearer ${token}` : "" }
      });
      const data = await res.json();
      setCounts(Array.isArray(data?.counts) ? data.counts : []);
      setTopProducts(Array.isArray(data?.topProducts) ? data.topProducts : []);
      setMsg("Live in the last 7 days");
      setLastUpdated(new Date());
    } catch (err) {
      setMsg("Failed to load analytics summary");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const getCount = (type: string) => counts.find((c) => c.event_type === type)?.count || 0;
  const funnel = [
    { step: "Product views", value: getCount("product_view") },
    { step: "Add to cart", value: getCount("add_to_cart") },
    { step: "Checkout start", value: getCount("checkout_start") },
    { step: "Paid", value: getCount("payment_result") }
  ];

  return (
    <div className="page">
      <div className="container" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <span className="pill">Owner dashboard • Insight-first</span>
        <div className="cta-row" style={{ gap: 8 }}>
          <button className="btn btn-secondary" onClick={loadSummary} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button className="btn btn-primary">Re-run insights</button>
        </div>
      </div>

      <div className="container" style={{ display: 'grid', gap: 18 }}>
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for data..."}
        </div>

        <div className="insights-grid">
          {topProducts.slice(0, 3).map((p) => (
            <div key={p.id} className="insight-card">
              <div style={{ fontSize: 13, opacity: 0.92, textTransform: 'uppercase', letterSpacing: 0.4 }}>Product insight</div>
              <div style={{ fontSize: 18, fontWeight: 800, margin: '6px 0' }}>{p.name}</div>
              <div style={{ opacity: 0.9 }}>Views: {p.views || 0} • Add to cart: {p.add_to_carts || 0}</div>
              <div style={{ opacity: 0.9 }}>Action: improve media or adjust delivery fee</div>
            </div>
          ))}
          {topProducts.length === 0 && <div className="insight-card warn">No events yet. Trigger product views/add-to-cart to see insights.</div>}
        </div>

        <div className="grid-2">
          <div className="panel" style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Engagement (last 7d)</h2>
              <span className="pill-badge">{msg || "Last 7 days"}</span>
            </div>
            <div className="grid-2">
              <div className="metric-card">
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Product views</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{getCount("product_view")}</div>
              </div>
              <div className="metric-card">
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Add to cart</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{getCount("add_to_cart")}</div>
              </div>
              <div className="metric-card">
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Checkout start</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{getCount("checkout_start")}</div>
              </div>
              <div className="metric-card">
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Payment results</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{getCount("payment_result")}</div>
              </div>
            </div>
            <div className="chart-placeholder">Future: revenue/orders trend with channel split (web vs WhatsApp).</div>
          </div>

          <div className="panel" style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Conversion funnel</h2>
              <span className="pill-badge">Electronics</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {funnel.map((item, idx) => (
                <div key={item.step} style={{ background: '#f9fafb', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{idx + 1}. {item.step}</strong>
                    <span style={{ fontWeight: 800 }}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="chart-placeholder">Drop-off reasons: delivery cost, payment failure, price sensitivity.</div>
          </div>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Top products (last 7d)</h2>
            <span className="pill-badge">Actionable</span>
          </div>
          <div className="featured-grid">
            {topProducts.map((p) => (
              <div key={p.id} className="panel" style={{ padding: 12, border: '1px solid var(--border)', display: 'grid', gap: 8 }}>
                {p.main_image_url && (
                  <div style={{ width: '100%', height: 120, overflow: 'hidden', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                    <img src={p.main_image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
                <div style={{ fontWeight: 800 }}>{p.name}</div>
                <div style={{ color: '#6b7280' }}>Views: {p.views || 0} • Adds: {p.add_to_carts || 0}</div>
              </div>
            ))}
            {topProducts.length === 0 && <div style={{ color: '#6b7280' }}>No products yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
