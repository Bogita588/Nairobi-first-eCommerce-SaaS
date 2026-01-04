"use client";

import { useEffect, useState } from "react";

type EventRow = {
  id: string;
  event_type: string;
  product_id?: string;
  order_id?: string;
  cart_id?: string;
  channel?: string;
  device?: string;
  city_area?: string;
  amount_cents?: number;
  occurred_at: string;
  properties?: Record<string, unknown>;
};

export default function EventsAdmin() {
  const [apiUrl, setApiUrl] = useState<string>(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api");
  const [tenantId, setTenantId] = useState<string>("00000000-0000-0000-0000-000000000000");
  const [token, setToken] = useState<string>("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("admintoken");
    const savedTenant = localStorage.getItem("admintenant");
    if (savedToken) setToken(savedToken);
    if (savedTenant) setTenantId(savedTenant);
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/events?limit=120`, {
        headers: {
          "Content-Type": "application/json",
          "X-API-Version": "1",
          "X-Tenant-ID": tenantId,
          Authorization: token ? `Bearer ${token}` : ""
        }
      });
      if (!res.ok) throw new Error("Failed to load events");
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
      setMsg(`Loaded ${Array.isArray(data) ? data.length : 0} events`);
    } catch (err) {
      setMsg("Failed to load events (check token/API)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ display: "grid", gap: 12 }}>
        <div className="panel" style={{ padding: 16, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>Events (analytics)</h1>
            <button className="btn btn-primary" onClick={loadEvents} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
          <div className="grid-2">
            <div>
              <label>API URL</label>
              <input style={input} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
            </div>
            <div>
              <label>Tenant ID</label>
              <input style={input} value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
            </div>
          </div>
          <div>
            <label>Bearer token</label>
            <input style={input} value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <div style={{ color: "#0f766e" }}>{msg || "Click refresh to load events"}</div>
        </div>

        <div className="panel" style={{ padding: 14, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "8px 6px" }}>Type</th>
                <th style={{ padding: "8px 6px" }}>Product</th>
                <th style={{ padding: "8px 6px" }}>Cart</th>
                <th style={{ padding: "8px 6px" }}>Order</th>
                <th style={{ padding: "8px 6px" }}>Channel</th>
                <th style={{ padding: "8px 6px" }}>Device</th>
                <th style={{ padding: "8px 6px" }}>Area</th>
                <th style={{ padding: "8px 6px" }}>Amount</th>
                <th style={{ padding: "8px 6px" }}>At</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 6px", fontWeight: 700 }}>{ev.event_type}</td>
                  <td style={{ padding: "8px 6px" }}>{ev.product_id || "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{ev.cart_id || "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{ev.order_id || "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{ev.channel || "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{ev.device || "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{ev.city_area || "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{ev.amount_cents ? (ev.amount_cents / 100).toFixed(2) : "—"}</td>
                  <td style={{ padding: "8px 6px", color: "#6b7280" }}>{new Date(ev.occurred_at).toLocaleString()}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "12px 6px", color: "#6b7280" }}>
                    No events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14
};
