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
    const res = await authedFetch(`${apiUrl}/catalog/categories/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete category");
    await loadCatalog();
    localStorage.setItem("catalog-bump", Date.now().toString());
  }

  async function createProduct() {
    if (!newProductName || !newProductPrice) {
      setToast({ type: "error", text: "Name and price are required" });
      return;
    }
    if (!newProductImage) {
      setToast({ type: "error", text: "Primary image URL is required" });
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
    const res = await authedFetch(`${apiUrl}/catalog/products/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete product");
    await loadCatalog();
    localStorage.setItem("catalog-bump", Date.now().toString());
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
      <div className="container" style={{ display: "grid", gap: 18 }}>
        <div
          className="panel"
          style={{
            padding: 18,
            background: "linear-gradient(120deg, rgba(15,118,110,0.12), rgba(245,158,11,0.12))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12
          }}
        >
          <div>
            <div className="pill" style={{ marginBottom: 8 }}>
              Smart catalog workspace
            </div>
            <h1 style={{ margin: 0 }}>Curate Nairobi-ready products</h1>
            <div style={{ color: "#4b5563" }}>Fast admin flow, instant preview, pickup & COD ready storefront.</div>
            <div className="cta-row" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" onClick={loadCatalog} disabled={loading || !token}>
                {loading ? "Syncing..." : "Sync catalog"}
              </button>
              <a className="btn btn-secondary" href="/shop" target="_blank" rel="noreferrer">
                View shop
              </a>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
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
              <span style={{ color: "#0f766e" }}>{actionMsg || msg || (!token ? "Sign in at /admin to unlock" : "")}</span>
            </div>
            {toast && (
              <div
                className="panel"
                style={{
                  padding: 10,
                  background: toast.type === "error" ? "#fef2f2" : "#ecfdf3",
                  color: toast.type === "error" ? "#991b1b" : "#166534",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  marginTop: 8
                }}
              >
                {toast.text}
              </div>
            )}
          </div>
          <div className="metric-card" style={{ minWidth: 220 }}>
            <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>Snapshot</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{products.length} products</div>
            <div style={{ color: "#6b7280" }}>{categories.length} categories · {(products.length && categories.length) ? "Ready" : "Draft"}</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "minmax(620px, 2fr) minmax(300px, 1fr)"
          }}
        >
          <div className="panel" style={{ padding: 16, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Workspace</div>
                <div style={{ color: "#6b7280" }}>Create categories, products, and media without leaving this view.</div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#6b7280" }}>API URL</label>
                <input style={input} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
                <label style={{ fontSize: 12, color: "#6b7280" }}>Tenant</label>
                <input
                  style={input}
                  value={tenantId}
                  onChange={(e) => {
                    setTenantId(e.target.value);
                    localStorage.setItem("admintenant", e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="panel" style={{ padding: 14, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Categories</h3>
                  <span className="pill">{categories.length} total</span>
                </div>
                <input style={input} placeholder="Name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                <textarea
                  style={textarea}
                  placeholder="Description"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                />
                <input
                  style={input}
                  placeholder="Hero image URL"
                  value={newCategoryHero}
                  onChange={(e) => setNewCategoryHero(e.target.value)}
                />
                <input style={input} placeholder="Icon" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} />
                <div className="grid-2">
                  <input
                    style={input}
                    placeholder="Meta title"
                    value={newCategoryMetaTitle}
                    onChange={(e) => setNewCategoryMetaTitle(e.target.value)}
                  />
                  <input
                    style={input}
                    placeholder="Meta description"
                    value={newCategoryMetaDesc}
                    onChange={(e) => setNewCategoryMetaDesc(e.target.value)}
                  />
                </div>
                <button className="btn btn-secondary" onClick={createCategory} disabled={!newCategory}>
                  Save category
                </button>
                <div style={{ maxHeight: 150, overflow: "auto", display: "grid", gap: 6 }}>
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 6 }}
                    >
                      <span>
                        {c.name} <span style={{ color: "#6b7280" }}>({c.slug})</span>
                      </span>
                      <button className="btn btn-secondary" onClick={() => deleteCategory(c.id)}>
                        Delete
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && <div style={{ color: "#6b7280" }}>No categories yet.</div>}
                </div>
              </div>

              <div className="panel" style={{ padding: 14, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Products</h3>
                  <span className="pill">{products.length} total</span>
                </div>
                <input style={input} placeholder="Name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
                <div className="grid-2">
                  <input
                    style={input}
                    placeholder="Price (e.g. 19.99)"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                  />
                  <select style={input} value={newProductPrimaryCat} onChange={(e) => setNewProductPrimaryCat(e.target.value)}>
                    <option value="">Primary category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  style={textarea}
                  placeholder="Short description"
                  value={newProductShortDesc}
                  onChange={(e) => setNewProductShortDesc(e.target.value)}
                />
                <textarea
                  style={textarea}
                  placeholder="Description"
                  value={newProductDesc}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                />
                <div className="grid-2">
                  <input
                    style={input}
                    placeholder="Primary image URL (required)"
                    value={newProductImage}
                    onChange={(e) => setNewProductImage(e.target.value)}
                  />
                  <input
                    style={input}
                    placeholder="Primary image alt text"
                    value={newProductImageAlt}
                    onChange={(e) => setNewProductImageAlt(e.target.value)}
                  />
                </div>
                <div className="grid-2">
                  <input
                    style={input}
                    placeholder="Tags (comma-separated)"
                    value={newProductTags}
                    onChange={(e) => setNewProductTags(e.target.value)}
                  />
                  <input
                    style={input}
                    placeholder="Badges (comma-separated)"
                    value={newProductBadges}
                    onChange={(e) => setNewProductBadges(e.target.value)}
                  />
                </div>
                <div className="grid-2">
                  <input
                    style={input}
                    placeholder="Meta title"
                    value={newProductMetaTitle}
                    onChange={(e) => setNewProductMetaTitle(e.target.value)}
                  />
                  <input
                    style={input}
                    placeholder="Meta description"
                    value={newProductMetaDesc}
                    onChange={(e) => setNewProductMetaDesc(e.target.value)}
                  />
                </div>
                <div className="grid-2">
                  <input
                    style={input}
                    placeholder="Warranty text"
                    value={newProductWarranty}
                    onChange={(e) => setNewProductWarranty(e.target.value)}
                  />
                  <input
                    style={input}
                    placeholder="Return policy"
                    value={newProductReturn}
                    onChange={(e) => setNewProductReturn(e.target.value)}
                  />
                </div>
                <input
                  style={input}
                  placeholder="Support WhatsApp"
                  value={newProductWhatsapp}
                  onChange={(e) => setNewProductWhatsapp(e.target.value)}
                />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <label>
                    <input type="checkbox" checked={newProductCOD} onChange={(e) => setNewProductCOD(e.target.checked)} /> COD allowed
                  </label>
                  <label>
                    <input type="checkbox" checked={newProductMpesaOnly} onChange={(e) => setNewProductMpesaOnly(e.target.checked)} /> MPesa only over threshold
                  </label>
                </div>
                <button className="btn btn-secondary" onClick={createProduct} disabled={!newProductName}>
                  Save product
                </button>
                <div style={{ maxHeight: 140, overflow: "auto", display: "grid", gap: 6 }}>
                  {products.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: "1px solid #f1f5f9", paddingBottom: 6 }}>
                      <span>
                        {p.name} <span style={{ color: "#6b7280" }}>({(p.base_price_cents / 100).toFixed(2)} {p.currency})</span>
                      </span>
                      <button className="btn btn-secondary" onClick={() => deleteProduct(p.id)}>
                        Delete
                      </button>
                    </div>
                  ))}
                  {products.length === 0 && <div style={{ color: "#6b7280" }}>No products yet.</div>}
                </div>
              </div>
            </div>

            <div className="panel" style={{ padding: 14, display: "grid", gap: 10 }}>
              <h3 style={{ marginTop: 0 }}>Images</h3>
              <select style={input} value={imageUploadProductId} onChange={(e) => setImageUploadProductId(e.target.value)}>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input type="file" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              <input style={input} placeholder="Alt text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
              <button className="btn btn-primary" onClick={uploadImage} disabled={!imageUploadProductId || !imageFile}>
                Upload image
              </button>
            </div>
          </div>

          <div className="panel" style={{ padding: 16, display: "grid", gap: 12, position: "sticky", top: 30, alignSelf: "start" }}>
            <h3 style={{ margin: 0 }}>Live overview</h3>
            <div className="metric-card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Categories</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{categories.length}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {categories.slice(0, 10).map((c) => (
                  <span key={c.id} className="pill">
                    {c.name}
                  </span>
                ))}
                {categories.length === 0 && <span style={{ color: "#6b7280" }}>None yet</span>}
              </div>
            </div>
            <div className="metric-card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Products</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{products.length}</div>
              <div style={{ display: "grid", gap: 8, maxHeight: 200, overflow: "auto" }}>
                {products.slice(0, 12).map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span>{p.name}</span>
                    <span style={{ color: "#6b7280" }}>{(p.base_price_cents / 100).toFixed(0)} {p.currency}</span>
                  </div>
                ))}
                {products.length === 0 && <span style={{ color: "#6b7280" }}>No products yet</span>}
              </div>
            </div>
            <a className="btn btn-secondary" href="/shop" target="_blank" rel="noreferrer">
              View shop
            </a>
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
