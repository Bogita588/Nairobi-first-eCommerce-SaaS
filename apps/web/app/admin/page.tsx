"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState<string>(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api");
  const [tenantId, setTenantId] = useState<string>("00000000-0000-0000-0000-000000000000");
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("password123");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("admintoken");
    const savedRefresh = localStorage.getItem("adminrefresh");
    const savedTenant = localStorage.getItem("admintenant");
    if (savedTenant) setTenantId(savedTenant);
    if (savedToken && savedRefresh) {
      router.push("/admin/catalog");
    }
  }, [router]);

  async function login() {
    setLoading(true);
    setMsg("Signing in...");
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Version": "1",
        "X-Tenant-ID": tenantId
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data?.message || "Login failed");
      setLoading(false);
      return;
    }
    localStorage.setItem("admintoken", data.accessToken);
    localStorage.setItem("adminrefresh", data.refreshToken);
    localStorage.setItem("admintenant", tenantId);
    setMsg("Signed in — redirecting...");
    router.push("/admin/catalog");
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 520, marginTop: 48, display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Admin sign in</h1>
        <div className="panel" style={{ padding: 16, display: "grid", gap: 10 }}>
          <label>API URL</label>
          <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} style={input} />
          <label>Tenant ID</label>
          <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={input} />
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
          <button className="btn btn-primary" onClick={login} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <div style={{ color: "#0f766e" }}>{msg}</div>
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
