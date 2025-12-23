const SummaryLine = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
    <span style={{ color: 'var(--muted)' }}>{label}</span>
    <span style={{ fontWeight: 700 }}>{value}</span>
  </div>
);

export default function CheckoutPage() {
  return (
    <div className="page">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 20 }}>
        <span className="pill">One-page checkout • MPesa-first</span>
        <div className="cta-row" style={{ gap: 8 }}>
          <button className="btn btn-secondary">Share cart via WhatsApp</button>
          <button className="btn btn-primary">Trigger MPesa STK</button>
        </div>
      </div>

      <div className="container grid-2">
        <div className="panel" style={{ padding: 18, display: 'grid', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Contact & Delivery</h2>
              <span className="pill-badge">Secure</span>
            </div>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>Phone-first with Nairobi area selection and live fee preview.</p>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <input style={inputStyle} placeholder="Phone number (MPesa)" defaultValue="+2547..." />
            <input style={inputStyle} placeholder="Full name" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input style={inputStyle} placeholder="Estate / Area (e.g., Westlands)" defaultValue="Westlands" />
              <input style={inputStyle} placeholder="Building / Street" />
            </div>
            <textarea style={{ ...inputStyle, minHeight: 90 }} placeholder="Delivery notes (gate, floor, landmark)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, background: '#ecfeff', border: '1px solid #bae6fd' }}>
            <div style={{ width: 10, height: 10, borderRadius: '999px', background: '#16a34a' }} />
            <div>
              <div style={{ fontWeight: 700 }}>Live delivery fee for Westlands: KES 350 • ETA 35 mins</div>
              <div style={{ color: '#0f172a' }}>Cheaper than COD; MPesa preferred for baskets over KES 5,000.</div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: 18, display: 'grid', gap: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>Order summary</h2>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>Fast edits, inline variant chips, trust markers.</p>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="panel" style={{ padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 72, height: 72, borderRadius: 10, background: '#e5e7eb' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Noise Cancelling Headphones</strong>
                    <span style={{ fontWeight: 700 }}>KES 12,900</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span className="pill-badge">Black</span>
                    <span className="pill-badge">Model X1</span>
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: 6 }}>Qty 1</div>
                </div>
              </div>
            </div>
            <div className="panel" style={{ padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 72, height: 72, borderRadius: 10, background: '#e5e7eb' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Analog Watch</strong>
                    <span style={{ fontWeight: 700 }}>KES 6,200</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span className="pill-badge">Leather strap</span>
                    <span className="pill-badge">42mm</span>
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: 6 }}>Qty 1</div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ padding: 12, border: '1px solid var(--border)', background: '#fff7ed' }}>
            <SummaryLine label="Subtotal" value="KES 19,100" />
            <SummaryLine label="Delivery (Westlands)" value="KES 350" />
            <SummaryLine label="Discount" value="- KES 500" />
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <strong>Total</strong>
              <strong>KES 18,950</strong>
            </div>
          </div>

          <div className="panel" style={{ padding: 12, border: '1px solid var(--border)', background: '#ecfdf3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800 }}>Pay via MPesa STK</div>
                <div style={{ color: '#166534' }}>Fastest, higher success vs COD for electronics</div>
              </div>
              <button className="btn btn-primary">Trigger STK</button>
            </div>
            <div style={{ marginTop: 8, color: '#166534' }}>Fallbacks: COD or continue on WhatsApp.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 12px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  fontSize: 15,
  background: '#fffdf8'
};
import React from 'react';
