import Link from 'next/link';

const kpis = [
  { label: '90+ PageSpeed Mobile', value: 'Fast by default' },
  { label: 'MPesa-first', value: 'STK in checkout' },
  { label: 'Insight-led', value: 'Owner dashboard' },
  { label: 'WhatsApp-native', value: 'Cart continuation' }
];

export default function HomePage() {
  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 28 }}>
          <span className="pill">Nairobi-first Commerce OS</span>
          <div className="cta-row" style={{ gap: 8 }}>
            <Link className="btn btn-secondary" href="/dashboard">Owner dashboard</Link>
            <Link className="btn btn-primary" href="/checkout">Try checkout</Link>
          </div>
        </div>

        <div className="panel" style={{ padding: '40px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
          <div>
            <h1 style={{ fontSize: 42, margin: '0 0 12px', lineHeight: 1.05 }}>Sell faster in Nairobi with MPesa, WhatsApp, and insight-rich storefronts.</h1>
            <p style={{ color: 'var(--muted)', fontSize: 18, marginBottom: 24 }}>
              Mobile-first storefronts, one-page checkout, and an owner dashboard that tells you exactly what to fix for conversion across electronics, fashion, watches, and home goods.
            </p>
            <div className="cta-row">
              <Link className="btn btn-primary" href="/checkout">Launch checkout demo</Link>
              <Link className="btn btn-secondary" href="/dashboard">View insights</Link>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
              {kpis.map((kpi) => (
                <div key={kpi.label} className="pill" style={{ background: '#ecfeff', color: '#0e7490' }}>
                  <span style={{ fontWeight: 700 }}>{kpi.value}</span>&nbsp;•&nbsp;{kpi.label}
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ border: '1px solid var(--border)', background: '#0b7a75', color: '#e7fbfa', boxShadow: 'var(--shadow)' }}>
            <div style={{ padding: 18, borderBottom: '1px solid rgba(255,255,255,0.14)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.82 }}>Insight Card</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Delivery fee is causing drop-off in Westlands</div>
              </div>
              <span className="pill-badge" style={{ background: '#fff3e0', color: '#c2410c' }}>Action</span>
            </div>
            <div style={{ padding: 18 }}>
              <p style={{ margin: '0 0 10px', fontSize: 16 }}>
                Lower Westlands delivery by 50 KES to lift conversion by ~7%. Customers choosing MPesa over COD for baskets above 5,000 KES.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="metric-card">
                  <div style={{ color: '#6b7280', fontSize: 13 }}>Checkout → Paid</div>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>67%</div>
                  <div style={{ fontSize: 13, color: '#4b5563' }}>+6.2% WoW</div>
                </div>
                <div className="metric-card">
                  <div style={{ color: '#6b7280', fontSize: 13 }}>Avg delivery fee</div>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>KES 340</div>
                  <div style={{ fontSize: 13, color: '#4b5563' }}>Westlands 420 • CBD 250</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
