const insightCards = [
  { title: 'Lower Westlands delivery by 50 KES', body: 'Expect +7% checkout → paid', tone: 'warn' },
  { title: 'Add more gallery photos to Watch Y', body: 'High views, low trust; boost CVR', tone: 'info' },
  { title: 'MPesa STK failures dropped to 1.2%', body: 'Hold steady; COD not needed', tone: 'info' },
  { title: 'Restock Noise Cancelling Headphones', body: '3 units left; 5.4x sell-through', tone: 'danger' }
];

const kpiCards = [
  { label: 'Revenue (7d)', value: 'KES 1.92M', delta: '+12.4%' },
  { label: 'Orders (7d)', value: '368', delta: '+9.1%' },
  { label: 'AOV', value: 'KES 5,217', delta: '+2.3%' },
  { label: 'Conversion', value: '3.8%', delta: '+0.6pp' }
];

const funnel = [
  { step: 'Product views', value: '42,100' },
  { step: 'Add to cart', value: '6,980', drop: '16.6%' },
  { step: 'Checkout start', value: '4,220', drop: '9.4%' },
  { step: 'Paid', value: '3,820', drop: '3.8%' }
];

export default function DashboardPage() {
  return (
    <div className="page">
      <div className="container" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <span className="pill">Owner dashboard • Insight-first</span>
        <div className="cta-row" style={{ gap: 8 }}>
          <button className="btn btn-secondary">Export report</button>
          <button className="btn btn-primary">Re-run insights</button>
        </div>
      </div>

      <div className="container" style={{ display: 'grid', gap: 18 }}>
        <div className="insights-grid">
          {insightCards.map((card) => (
            <div key={card.title} className={`insight-card ${card.tone === 'warn' ? 'warn' : ''} ${card.tone === 'danger' ? 'danger' : ''}`}>
              <div style={{ fontSize: 13, opacity: 0.92, textTransform: 'uppercase', letterSpacing: 0.4 }}>Insight</div>
              <div style={{ fontSize: 18, fontWeight: 800, margin: '6px 0' }}>{card.title}</div>
              <div style={{ opacity: 0.9 }}>{card.body}</div>
            </div>
          ))}
        </div>

        <div className="grid-2">
          <div className="panel" style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Sales performance</h2>
              <span className="pill-badge">Last 7 days</span>
            </div>
            <div className="grid-2">
              {kpiCards.map((kpi) => (
                <div key={kpi.label} className="metric-card">
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>{kpi.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{kpi.value}</div>
                  <div style={{ color: kpi.delta.startsWith('+') ? '#15803d' : '#b91c1c' }}>{kpi.delta}</div>
                </div>
              ))}
            </div>
            <div className="chart-placeholder">Chart placeholder: revenue/orders trend with channel split (web vs WhatsApp).</div>
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
                  {item.drop && <div style={{ color: '#b45309', marginTop: 4 }}>Drop: {item.drop}</div>}
                </div>
              ))}
            </div>
            <div className="chart-placeholder">Drop-off reasons: delivery cost, payment failure, price sensitivity.</div>
          </div>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Product intelligence</h2>
            <span className="pill-badge">Actionable</span>
          </div>
          <div style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 14px', background: '#f1f5f9', fontWeight: 700 }}>
              <span>Product</span><span>Views → Orders</span><span>Abandon</span><span>Action</span>
            </div>
            {[
              { name: 'Noise Cancelling Headphones', ratio: '12,800 → 640 (5%)', abandon: 'High', action: 'Add COD fallback? lower fee' },
              { name: 'Analog Watch', ratio: '9,100 → 820 (9%)', abandon: 'Medium', action: 'More photos, adjust price -3%' },
              { name: 'Smart TV 55"', ratio: '6,420 → 180 (2.8%)', abandon: 'High', action: 'Bundle delivery, show ETA' }
            ].map((row) => (
              <div key={row.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 14px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>{row.name}</div>
                <div>{row.ratio}</div>
                <div style={{ color: row.abandon === 'High' ? '#b91c1c' : '#92400e' }}>{row.abandon}</div>
                <div style={{ color: '#0f766e', fontWeight: 700 }}>{row.action}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
