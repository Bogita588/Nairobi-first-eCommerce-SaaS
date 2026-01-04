"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; base_price_cents: number; currency: string; slug: string; main_image_url?: string };
type Category = { id: string; name: string; slug: string };

export default function CatalogAdmin() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState<string>(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api");
  const [tenantId, setTenantId] = useState<string>("00000000-0000-0000-0000-000000000000");
  const [token, setToken] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const [newCategory, setNewCategory] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [newCategoryHero, setNewCategoryHero] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [newCategoryMetaTitle, setNewCategoryMetaTitle] = useState("");
  const [newCategoryMetaDesc, setNewCategoryMetaDesc] = useState("");

  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("1999");
  const [newProductShortDesc, setNewProductShortDesc] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductTags, setNewProductTags] = useState("");
  const [newProductBadges, setNewProductBadges] = useState("");
  const [newProductPrimaryCat, setNewProductPrimaryCat] = useState("");
  const [newProductMetaTitle, setNewProductMetaTitle] = useState("");
  const [newProductMetaDesc, setNewProductMetaDesc] = useState("");
  const [newProductWarranty, setNewProductWarranty] = useState("");
  const [newProductReturn, setNewProductReturn] = useState("");
  const [newProductWhatsapp, setNewProductWhatsapp] = useState("");
  const [newProductImage, setNewProductImage] = useState("");
  const [newProductImageAlt, setNewProductImageAlt] = useState("");
  const [newProductCOD, setNewProductCOD] = useState(true);
  const [newProductMpesaOnly, setNewProductMpesaOnly] = useState(false);

  const [imageUploadProductId, setImageUploadProductId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionState, setActionState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("admintoken");
    const savedTenant = localStorage.getItem("admintenant");
    const savedRefresh = localStorage.getItem("adminrefresh");
    if (savedTenant) setTenantId(savedTenant);
    if (savedToken) setToken(savedToken);
    if (savedRefresh) setRefreshToken(savedRefresh);
    if (!savedToken || !savedRefresh) {
      router.push("/admin");
    }
  }, []);

  const baseHeaders = {
    "Content-Type": "application/json",
    "X-API-Version": "1",
    "X-Tenant-ID": tenantId
  };

  async function refreshIfNeeded() {
    if (!refreshToken) return false;
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) {
      setMsg("Refresh failed – please login again");
      return false;
    }
    const data = await res.json();
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    localStorage.setItem("admintoken", data.accessToken);
    localStorage.setItem("adminrefresh", data.refreshToken);
    return true;
  }

  async function authedFetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = {
      ...baseHeaders,
      ...(init?.headers || {}),
      Authorization: token ? `Bearer ${token}` : ""
    };
    let res = await fetch(url, { ...init, headers });
    if (res.status === 401 && refreshToken) {
      const refreshed = await refreshIfNeeded();
      if (refreshed) {
        const retryHeaders = {
          ...baseHeaders,
          ...(init?.headers || {}),
          Authorization: `Bearer ${localStorage.getItem("admintoken") || token}`
        };
        res = await fetch(url, { ...init, headers: retryHeaders });
      }
    }
    return res;
  }

  async function loadCatalog() {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        authedFetch(`${apiUrl}/catalog/categories`),
        authedFetch(`${apiUrl}/catalog/products`)
      ]);
      const cats = await catRes.json();
      const prods = await prodRes.json();
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
      if (!imageUploadProductId && Array.isArray(prods) && prods.length > 0) {
        setImageUploadProductId(prods[0].id);
      }
      setMsg("Loaded catalog");
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setMsg("Failed to load catalog. Check token and API.");
    } finally {
      setLoading(false);
    }
  }

  async function createCategory() {
    if (!newCategory) return;
    setActionState("saving");
    setActionMsg("Saving category...");
    const res = await authedFetch(`${apiUrl}/catalog/categories`, {
      method: "POST",
      body: JSON.stringify({
        name: newCategory,
        slug: newCategory.toLowerCase().replace(/\s+/g, "-"),
        description: newCategoryDesc,
        heroImageUrl: newCategoryHero,
        icon: newCategoryIcon,
        metaTitle: newCategoryMetaTitle,
        metaDescription: newCategoryMetaDesc
      })
    });
    if (!res.ok) throw new Error("Failed to save category");
    setActionMsg("Category saved");
    setActionState("saved");
    setToast({ type: "success", text: "Category saved" });
    setNewCategory("");
    setNewCategoryDesc("");
    setNewCategoryHero("");
    setNewCategoryIcon("");
    setNewCategoryMetaTitle("");
    setNewCategoryMetaDesc("");
    await loadCatalog();
    localStorage.setItem("catalog-bump", Date.now().toString());
  }

  async function deleteCategory(id: string) {
    if (!window.confirm("Delete this category? Products remain but lose the link.")) return;
    setBusyCategoryId(id);
    try {
      const res = await authedFetch(`${apiUrl}/catalog/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      await loadCatalog();
      localStorage.setItem("catalog-bump", Date.now().toString());
    } finally {
      setBusyCategoryId(null);
    }
  }

  async function createProduct() {
    if (!newProductName || !newProductPrice || !newProductImage) {
      setToast({ type: "error", text: "Name, price, and primary image are required" });
      return;
    }
    setActionState("saving");
    setActionMsg("Saving product...");
    const priceCents = Math.round(parseFloat(newProductPrice) * 100);
    const res = await authedFetch(`${apiUrl}/catalog/products`, {
      method: "POST",
      body: JSON.stringify({
        name: newProductName,
        slug: newProductName.toLowerCase().replace(/\s+/g, "-"),
        basePriceCents: priceCents,
        description: newProductDesc,
        shortDescription: newProductShortDesc,
        categoryId: newProductPrimaryCat || undefined,
        primaryCategoryId: newProductPrimaryCat || undefined,
        tags: newProductTags ? newProductTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        badges: newProductBadges ? newProductBadges.split(",").map((t) => t.trim()).filter(Boolean) : [],
        metaTitle: newProductMetaTitle,
        metaDescription: newProductMetaDesc,
        warrantyText: newProductWarranty,
        returnPolicy: newProductReturn,
        supportWhatsapp: newProductWhatsapp,
        codAllowed: newProductCOD,
        mpesaOnlyOverThreshold: newProductMpesaOnly
      })
    });
    if (!res.ok) throw new Error("Failed to save product");
    const created = await res.json();

    // attach primary image immediately
    const imgRes = await authedFetch(`${apiUrl}/catalog/products/${created.id}/images`, {
      method: "POST",
      body: JSON.stringify({ url: newProductImage, altText: newProductImageAlt || newProductName, position: 0 })
    });
    if (!imgRes.ok) throw new Error("Saved product but failed to attach image");

    setNewProductName("");
    setNewProductPrice("1999");
    setNewProductShortDesc("");
    setNewProductDesc("");
    setNewProductTags("");
    setNewProductBadges("");
    setNewProductPrimaryCat("");
    setNewProductMetaTitle("");
    setNewProductMetaDesc("");
    setNewProductWarranty("");
    setNewProductReturn("");
    setNewProductWhatsapp("");
    setNewProductImage("");
    setNewProductImageAlt("");
    setNewProductCOD(true);
    setNewProductMpesaOnly(false);
    await loadCatalog();
    localStorage.setItem("catalog-bump", Date.now().toString());
    setActionMsg("Product saved");
    setActionState("saved");
  }

  async function deleteProduct(id: string) {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    setBusyProductId(id);
    try {
      const res = await authedFetch(`${apiUrl}/catalog/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      await loadCatalog();
      localStorage.setItem("catalog-bump", Date.now().toString());
    } finally {
      setBusyProductId(null);
    }
  }

  async function uploadImage() {
    if (!imageUploadProductId) {
      setToast({ type: "error", text: "Select a product first" });
      return;
    }
    if (!imageFile) {
      setToast({ type: "error", text: "Choose a file first" });
      return;
    }
    setActionState("saving");
    setActionMsg("Uploading image...");
    try {
      const signRes = await authedFetch(
        `${apiUrl}/media/upload-sign?filename=${encodeURIComponent(imageFile.name)}&contentType=${encodeURIComponent(imageFile.type)}`
      );
      if (!signRes.ok) throw new Error("Failed to sign upload");
      const sign = await signRes.json();
      let imageUrl = sign.directUrl || sign.uploadUrl;
      if (sign.provider !== "stub") {
        const putRes = await fetch(sign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": imageFile.type },
          body: imageFile
        });
        if (!putRes.ok) throw new Error("Upload failed");
        imageUrl = sign.key ? `https://${sign.bucket || sign.uploadUrl.split("/")[2]}/${sign.key}` : sign.uploadUrl;
      }
      const res = await authedFetch(`${apiUrl}/catalog/products/${imageUploadProductId}/images`, {
        method: "POST",
        body: JSON.stringify({ url: imageUrl, altText: imageAlt })
      });
      if (!res.ok) throw new Error("Failed to attach image");
      setImageFile(null);
      setImageAlt("");
      await loadCatalog();
      setToast({ type: "success", text: "Image uploaded" });
      setActionState("saved");
      setActionMsg("Image attached");
    } catch (err: any) {
      console.error("Upload failed", err);
      setToast({ type: "error", text: err?.message || "Upload failed" });
      setActionState("error");
      setActionMsg("Upload failed");
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ display: "grid", gap: 16 }}>
        <div className="panel hero-banner">
          <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
            <div className="pill" style={{ marginBottom: 4 }}>Smart catalog workspace</div>
            <h1 style={{ margin: 0 }}>Curate Nairobi-ready products</h1>
            <div className="subtext">Fast admin-only flow, instant preview, pickup & COD-ready storefront.</div>
            <div className="cta-row" style={{ marginTop: 6 }}>
              <button className="btn btn-primary" onClick={loadCatalog} disabled={loading || !token}>
                {loading ? "Syncing..." : "Sync catalog"}
              </button>
              <a className="btn btn-secondary" href="/shop" target="_blank" rel="noreferrer">
                View shop
              </a>
              <a className="btn btn-secondary" href="/dashboard" target="_blank" rel="noreferrer">
                Admin dashboard
              </a>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background:
                    actionState === "saving" ? "#f59e0b" : actionState === "saved" ? "#22c55e" : actionState === "error" ? "#ef4444" : "#d1d5db",
                  display: "inline-block"
                }}
              />
              <span className="subtext">
                {actionMsg || msg || (!token ? "Sign in at /admin to unlock" : "Ready to edit catalog")}{" "}
                {lastUpdated && `· Last updated ${lastUpdated}`}
              </span>
            </div>
            {toast && (
              <div
                className="panel"
                style={{
                  padding: 10,
                  background: toast.type === "error" ? "#fef2f2" : "#ecfdf3",
                  color: toast.type === "error" ? "#991b1b" : "#166534",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10
                }}
              >
                {toast.text}
              </div>
            )}
          </div>
          <div className="metric-card" style={{ minWidth: 240 }}>
            <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>Snapshot</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{products.length} products</div>
            <div className="subtext">{categories.length} categories · {(products.length && categories.length) ? "Ready" : "Draft"}</div>
          </div>
        </div>

        <div className="layout-split">
          <div className="card-stack">
            <div className="panel" style={{ display: "grid", gap: 12 }}>
              <div className="section-head">
                <div>
                  <div style={{ fontWeight: 800 }}>Connection & session</div>
                  <div className="subtext">Tenant + API used for all admin actions.</div>
                </div>
                <span className="pill">{token ? "Admin signed in" : "Login required"}</span>
              </div>
              <div className="form-grid">
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  API URL
                  <input style={input} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Tenant ID
                  <input
                    style={input}
                    value={tenantId}
                    onChange={(e) => {
                      setTenantId(e.target.value);
                      localStorage.setItem("admintenant", e.target.value);
                    }}
                  />
                </label>
              </div>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={loadCatalog} disabled={loading || !token}>
                  {loading ? "Syncing..." : "Refresh data"}
                </button>
                <a className="btn btn-secondary" href="/shop" target="_blank" rel="noreferrer">
                  Go to shop
                </a>
              </div>
            </div>

            <div className="panel" style={{ display: "grid", gap: 12 }}>
              <div className="section-head">
                <div>
                  <div style={{ fontWeight: 800 }}>Categories</div>
                  <div className="subtext">Organize electronics, fashion, watches, house items.</div>
                </div>
                <span className="pill">{categories.length} total</span>
              </div>
              <div className="form-grid">
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Name
                  <input style={input} placeholder="e.g. Electronics" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Hero image URL
                  <input
                    style={input}
                    placeholder="https://"
                    value={newCategoryHero}
                    onChange={(e) => setNewCategoryHero(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Description
                  <textarea
                    style={textarea}
                    placeholder="Short description for SEO"
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Icon / emoji
                  <input style={input} placeholder="🔌" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Meta title
                  <input
                    style={input}
                    placeholder="Great electronics in Nairobi"
                    value={newCategoryMetaTitle}
                    onChange={(e) => setNewCategoryMetaTitle(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Meta description
                  <input
                    style={input}
                    placeholder="Affordable gadgets with fast pickup"
                    value={newCategoryMetaDesc}
                    onChange={(e) => setNewCategoryMetaDesc(e.target.value)}
                  />
                </label>
              </div>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={createCategory} disabled={!newCategory}>
                  Save category
                </button>
              </div>
              <div className="item-list">
                {categories.map((c) => (
                  <div key={c.id} className="item-row" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>
                    <div style={{ display: "grid", gap: 2 }}>
                      <span style={{ fontWeight: 700 }}>{c.name}</span>
                      <span className="subtext">/{c.slug}</span>
                    </div>
                    <button className="btn btn-secondary" onClick={() => deleteCategory(c.id)} disabled={busyCategoryId === c.id || loading}>
                      Delete
                    </button>
                  </div>
                ))}
                {categories.length === 0 && <div className="subtext">No categories yet.</div>}
              </div>
            </div>

            <div className="panel" style={{ display: "grid", gap: 12 }}>
              <div className="section-head">
                <div>
                  <div style={{ fontWeight: 800 }}>Products</div>
                  <div className="subtext">Require primary image; auto shows in shop & dashboard.</div>
                </div>
                <span className="pill">{products.length} total</span>
              </div>
              <div className="form-grid">
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Name
                  <input style={input} placeholder="Laptop, TV, Watch" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Price (KES)
                  <input
                    style={input}
                    placeholder="19,999"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Primary category
                  <select style={input} value={newProductPrimaryCat} onChange={(e) => setNewProductPrimaryCat(e.target.value)}>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Primary image URL (required)
                  <input
                    style={input}
                    placeholder="https://"
                    value={newProductImage}
                    onChange={(e) => setNewProductImage(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Image alt text
                  <input
                    style={input}
                    placeholder="Front of the laptop"
                    value={newProductImageAlt}
                    onChange={(e) => setNewProductImageAlt(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Short description
                  <textarea
                    style={textarea}
                    placeholder="One-liner shown in cards"
                    value={newProductShortDesc}
                    onChange={(e) => setNewProductShortDesc(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Full description
                  <textarea
                    style={textarea}
                    placeholder="Details, delivery, warranty"
                    value={newProductDesc}
                    onChange={(e) => setNewProductDesc(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Tags (comma-separated)
                  <input
                    style={input}
                    placeholder="laptop, gaming, 16gb"
                    value={newProductTags}
                    onChange={(e) => setNewProductTags(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Badges (comma-separated)
                  <input
                    style={input}
                    placeholder="bestseller, new"
                    value={newProductBadges}
                    onChange={(e) => setNewProductBadges(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Meta title
                  <input
                    style={input}
                    placeholder="Buy laptops in Nairobi"
                    value={newProductMetaTitle}
                    onChange={(e) => setNewProductMetaTitle(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Meta description
                  <input
                    style={input}
                    placeholder="Fast delivery, COD + pickup"
                    value={newProductMetaDesc}
                    onChange={(e) => setNewProductMetaDesc(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Warranty text
                  <input
                    style={input}
                    placeholder="12 months warranty"
                    value={newProductWarranty}
                    onChange={(e) => setNewProductWarranty(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Return policy
                  <input
                    style={input}
                    placeholder="7-day returns"
                    value={newProductReturn}
                    onChange={(e) => setNewProductReturn(e.target.value)}
                  />
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Support WhatsApp
                  <input
                    style={input}
                    placeholder="+2547..."
                    value={newProductWhatsapp}
                    onChange={(e) => setNewProductWhatsapp(e.target.value)}
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <label>
                  <input type="checkbox" checked={newProductCOD} onChange={(e) => setNewProductCOD(e.target.checked)} /> COD allowed
                </label>
                <label>
                  <input type="checkbox" checked={newProductMpesaOnly} onChange={(e) => setNewProductMpesaOnly(e.target.checked)} /> MPesa only over
                  threshold
                </label>
              </div>
              {(!newProductName || !newProductPrice || !newProductImage) && (
                <div className="subtext" style={{ color: "#b91c1c", fontWeight: 700 }}>
                  Name, price, and primary image are required before saving.
                </div>
              )}
              <div className="btn-row">
                <button
                  className="btn btn-secondary"
                  onClick={createProduct}
                  disabled={!newProductName || !newProductImage || !newProductPrice || loading}
                >
                  Save product
                </button>
              </div>
              <div className="item-list">
                {products.map((p) => (
                  <div key={p.id} className="item-row" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                      {p.main_image_url ? (
                        <img
                          src={p.main_image_url}
                          alt={p.name}
                          style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            border: "1px dashed #cbd5e1",
                            display: "grid",
                            placeItems: "center",
                            color: "#6b7280"
                          }}
                        >
                          —
                        </div>
                      )}
                      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{p.name}</span>
                        <span className="subtext">
                          {(p.base_price_cents / 100).toFixed(0)} {p.currency} · /{p.slug}
                        </span>
                      </div>
                    </div>
                    <button className="btn btn-secondary" onClick={() => deleteProduct(p.id)} disabled={busyProductId === p.id || loading}>
                      Delete
                    </button>
                  </div>
                ))}
                {products.length === 0 && <div className="subtext">No products yet.</div>}
              </div>
            </div>

            <div className="panel" style={{ display: "grid", gap: 12 }}>
              <div className="section-head">
                <div>
                  <div style={{ fontWeight: 800 }}>Images</div>
                  <div className="subtext">Attach more images to any saved product.</div>
                </div>
              </div>
              <div className="form-grid">
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Product
                  <select style={input} value={imageUploadProductId} onChange={(e) => setImageUploadProductId(e.target.value)}>
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontWeight: 700, fontSize: 13, display: "grid", gap: 6 }}>
                  Alt text
                  <input style={input} placeholder="Front view" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
                </label>
              </div>
              <input type="file" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              <div className="btn-row">
                <button className="btn btn-primary" onClick={uploadImage} disabled={!imageUploadProductId || !imageFile}>
                  Upload image
                </button>
              </div>
            </div>
          </div>

          <div className="panel sticky-card" style={{ padding: 16, display: "grid", gap: 14 }}>
            <div className="section-head">
              <div>
                <div style={{ fontWeight: 800 }}>Live overview</div>
                <div className="subtext">Pinned for quick checks while you edit.</div>
              </div>
            </div>
            <div className="metric-card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Categories</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{categories.length}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {categories.slice(0, 10).map((c) => (
                  <span key={c.id} className="pill">
                    {c.name}
                  </span>
                ))}
                {categories.length === 0 && <span className="subtext">None yet</span>}
              </div>
            </div>
            <div className="metric-card" style={{ padding: 12, display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 700 }}>Products</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{products.length}</div>
              <div style={{ display: "grid", gap: 10, maxHeight: 260, overflow: "auto" }}>
                {products.slice(0, 12).map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div style={{ display: "grid", gap: 2 }}>
                      <span style={{ fontWeight: 700 }}>{p.name}</span>
                      <span className="subtext">{(p.base_price_cents / 100).toFixed(0)} {p.currency}</span>
                    </div>
                    {p.main_image_url && (
                      <img src={p.main_image_url} alt={p.name} style={{ width: 42, height: 42, objectFit: "cover", borderRadius: 8 }} />
                    )}
                  </div>
                ))}
                {products.length === 0 && <span className="subtext">No products yet</span>}
              </div>
            </div>
            <div className="btn-row" style={{ justifyContent: "flex-start" }}>
              <a className="btn btn-secondary" href="/shop" target="_blank" rel="noreferrer">
                View shop
              </a>
              <a className="btn btn-secondary" href="/dashboard" target="_blank" rel="noreferrer">
                Dashboard
              </a>
            </div>
          </div>
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

const textarea: React.CSSProperties = {
  ...input,
  minHeight: 80
};
