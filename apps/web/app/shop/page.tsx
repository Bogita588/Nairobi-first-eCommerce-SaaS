"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  base_price_cents: number;
  currency: string;
  description?: string;
  short_description?: string;
  main_image_url?: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  name: string;
  slug: string;
};

type CartPayload = {
  cartToken: string;
  status: string;
  currency: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
  items: CartItem[];
};

export default function ShopPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  const tenantId = "00000000-0000-0000-0000-000000000000";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [cart, setCart] = useState<CartPayload | null>(null);
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const [cityArea, setCityArea] = useState("Westlands");
  const [streetAddress, setStreetAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "pickup">("cod");
  const pickupLocation = {
    name: "CBD Outlet – Moi Avenue, Nairobi",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Moi+Avenue+Nairobi"
  };
  const storeWhatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "254745347544"; // default demo number without leading 0
  const [lastSync, setLastSync] = useState<number>(Date.now());

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "X-API-Version": "1",
      "X-Tenant-ID": tenantId
    }),
    [tenantId]
  );

  async function fireEvent(eventType: string, properties: Record<string, unknown> = {}) {
    try {
      await fetch(`${apiUrl}/events`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          eventType,
          cartId: cart?.cartToken,
          productId: properties.productId,
          amountCents: properties.amountCents,
          cityArea: cityArea,
          channel: "web",
          device: typeof window !== "undefined" && window.navigator.userAgent.includes("Mobile") ? "mobile" : "desktop",
          properties
        })
      });
    } catch (err) {
      // ignore analytics failures
    }
  }

  const ensureCart = useCallback(async () => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("cartToken") : null;
    const body = saved ? { cartToken: saved, channel: "web" } : { channel: "web" };
    const res = await fetch(`${apiUrl}/checkout/cart/init`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    setCart(data);
    localStorage.setItem("cartToken", data.cartToken);
    return data.cartToken as string;
  }, [apiUrl, headers]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch(`${apiUrl}/catalog/public/categories?tenantId=${tenantId}`, { headers }),
        fetch(`${apiUrl}/catalog/public/products?tenantId=${tenantId}`, { headers })
      ]);
      const cats = await catRes.json();
      const prods = await prodRes.json();
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
      setMsg("Loaded catalog");
    } catch (err) {
      setMsg("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, tenantId]);

  useEffect(() => {
    loadCatalog();
    ensureCart();
    const onFocus = () => loadCatalog();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(() => loadCatalog(), 15000);
    const storageListener = (e: StorageEvent) => {
      if (e.key === "catalog-bump") {
        loadCatalog();
        setLastSync(Date.now());
      }
    };
    window.addEventListener("storage", storageListener);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", storageListener);
      clearInterval(interval);
    };
  }, [loadCatalog, ensureCart]);

  async function loadImages(productId: string) {
    const res = await fetch(`${apiUrl}/catalog/public/products/${productId}/images`);
    const data = await res.json();
    setImages((prev) => ({ ...prev, [productId]: Array.isArray(data) ? data.map((i: any) => i.url) : [] }));
  }

  async function refreshCart(token?: string) {
    const cartToken = token || cart?.cartToken || localStorage.getItem("cartToken");
    if (!cartToken) return;
    const res = await fetch(`${apiUrl}/checkout/cart/${cartToken}`, { headers });
    if (res.ok) {
      const data = await res.json();
      setCart(data);
    }
  }

  async function addToCart(productId: string) {
    setCheckoutMsg("");
    const token = cart?.cartToken || (await ensureCart());
    const res = await fetch(`${apiUrl}/checkout/cart/${token}/items`, {
      method: "POST",
      headers,
      body: JSON.stringify({ productId, quantity: 1 })
    });
    if (res.ok) {
      const data = await res.json();
      setCart(data);
      setMsg("Added to cart");
      fireEvent("add_to_cart", { productId });
    } else {
      setMsg("Failed to add item");
    }
  }

  async function updateQty(itemId: string, qty: number) {
    if (!cart?.cartToken) return;
    const res = await fetch(`${apiUrl}/checkout/cart/${cart.cartToken}/items/${itemId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ quantity: qty })
    });
    if (res.ok) {
      const data = await res.json();
      setCart(data);
    }
  }

  async function deleteItem(itemId: string) {
    if (!cart?.cartToken) return;
    const res = await fetch(`${apiUrl}/checkout/cart/${cart.cartToken}/items/${itemId}`, {
      method: "DELETE",
      headers
    });
    if (res.ok) {
      const data = await res.json();
      setCart(data);
    }
  }

  async function quoteDelivery() {
    if (!cart?.cartToken) return;
    const res = await fetch(`${apiUrl}/checkout/quote`, {
      method: "POST",
      headers,
      body: JSON.stringify({ cartToken: cart.cartToken, cityArea })
    });
    if (res.ok) {
      const data = await res.json();
      setMsg(`Delivery fee: ${(data.feeCents / 100).toFixed(2)} KES, ETA ~${data.etaMinutes} mins`);
      refreshCart();
    }
  }

  async function submitCheckout() {
    if (!cart?.cartToken) return;
    setCheckoutMsg("");
    fireEvent("checkout_start", { cartId: cart.cartToken });
    const res = await fetch(`${apiUrl}/checkout/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        cartToken: cart.cartToken,
        cityArea,
        streetAddress,
        paymentMethod,
        phone,
        email,
        firstName,
        lastName
      })
    });
    const data = await res.json();
    if (res.ok) {
      setCheckoutMsg(
        `Order ${data.orderNumber} created. Payment: ${paymentMethod === "pickup" ? "pay at pickup point" : "pay on delivery"}. Ref: ${
          data.payment?.providerReference
        }`
      );
      refreshCart();
      fireEvent("payment_result", { cartId: cart.cartToken, orderId: data.orderId, amountCents: data.totalCents, status: data.payment?.status });
    } else {
      setCheckoutMsg(data?.message || "Checkout failed");
    }
  }

  function sendWhatsAppOrder() {
    if (!cart || (cart.items || []).length === 0) {
      setCheckoutMsg("Add items to cart first");
      return;
    }
    const target = storeWhatsapp.replace(/[^0-9]/g, ""); // sanitize
    const summaryLines = cart.items.map(
      (i) => `- ${i.quantity} x ${i.name} @ ${(i.unitPriceCents / 100).toFixed(2)} ${cart.currency} = ${(i.lineTotalCents / 100).toFixed(2)}`
    );
    const message = [
      "Order via WhatsApp",
      `Name: ${firstName} ${lastName}`.trim(),
      `Phone: ${phone}`,
      `Delivery: ${paymentMethod === "pickup" ? "Pickup" : cityArea}`,
      `Payment: ${paymentMethod === "pickup" ? "Pay at pickup" : "Pay on delivery"}`,
      "Items:",
      ...summaryLines,
      `Subtotal: ${(cart.subtotalCents / 100).toFixed(2)} ${cart.currency}`,
      `Delivery: ${(cart.deliveryFeeCents / 100).toFixed(2)} ${cart.currency}`,
      `Total: ${(cart.totalCents / 100).toFixed(2)} ${cart.currency}`
    ].join("\n");
    const url = `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    fireEvent("whatsapp_handoff", { cartId: cart.cartToken, cityArea, paymentMethod });
  }

  const filteredProducts = selectedCategory
    ? products.filter((p: any) => p.category_id === selectedCategory || p.primary_category_id === selectedCategory)
    : products;

  return (
    <div className="page">
      <div className="container" style={{ display: "grid", gap: 18 }}>
        <div
          className="panel"
          style={{
            padding: 18,
            background: "linear-gradient(120deg, rgba(15,118,110,0.12), rgba(245,158,11,0.12))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap"
          }}
        >
          <div>
            <div className="pill" style={{ marginBottom: 8 }}>
              Nairobi storefront
            </div>
            <h1 style={{ margin: 0 }}>Fast cart + checkout</h1>
            <div style={{ color: "#4b5563" }}>Filter by category, add to cart, COD or pickup in one flow.</div>
          </div>
          <div className="metric-card" style={{ minWidth: 260 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Cart token</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{cart?.cartToken?.slice(0, 8) || "pending..."}</div>
            <div style={{ color: "#6b7280" }}>{loading ? "Syncing..." : msg || "Ready"}</div>
          </div>
        </div>

        <div className="panel" style={{ padding: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => loadCatalog()}>
            Refresh
          </button>
          <button className="btn btn-secondary" onClick={() => { setSelectedCategory(""); setSelectedProduct(null); }}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`btn ${selectedCategory === c.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => { setSelectedCategory(c.id); setSelectedProduct(null); }}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "minmax(640px, 2fr) minmax(340px, 1fr)"
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div className="panel" style={{ padding: 14, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Products</h3>
                <div className="pill">{filteredProducts.length} visible</div>
              </div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="panel"
                    style={{
                      padding: 12,
                      border: "1px solid var(--border)",
                      display: "grid",
                      gap: 8,
                      background: "#ffffff"
                    }}
                  >
                    {p.main_image_url && (
                      <div style={{ width: "100%", height: 140, overflow: "hidden", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                        <img
                          src={p.main_image_url}
                          alt={p.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </div>
                    )}
                    <div style={{ fontWeight: 800 }}>{p.name}</div>
                    <div style={{ color: "#4b5563", fontSize: 14 }}>
                      {(p.base_price_cents / 100).toFixed(2)} {p.currency}
                    </div>
                    <div style={{ color: "#6b7280", minHeight: 38 }}>{p.short_description || p.description}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedProduct(p);
                          if (!images[p.id]) loadImages(p.id);
                          fireEvent("product_view", { productId: p.id });
                        }}
                      >
                        View
                      </button>
                      <button className="btn btn-primary" onClick={() => addToCart(p.id)}>
                        Add to cart
                      </button>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && <div style={{ color: "#6b7280" }}>No products found.</div>}
              </div>
            </div>

            <div className="panel" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Product details</h3>
              {selectedProduct ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {selectedProduct.main_image_url && (
                    <div style={{ width: "100%", maxWidth: 360 }}>
                      <img
                        src={selectedProduct.main_image_url}
                        alt={selectedProduct.name}
                        style={{ width: "100%", borderRadius: 12, border: "1px solid #e5e7eb", objectFit: "cover" }}
                      />
                    </div>
                  )}
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{selectedProduct.name}</div>
                  <div style={{ color: "#4b5563", fontSize: 18 }}>
                    {(selectedProduct.base_price_cents / 100).toFixed(2)} {selectedProduct.currency}
                  </div>
                  <div style={{ color: "#374151" }}>{selectedProduct.short_description || selectedProduct.description}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(images[selectedProduct.id] || []).map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt={selectedProduct.name}
                        style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12 }}
                      />
                    ))}
                    {(images[selectedProduct.id] || []).length === 0 && (
                      <div style={{ color: "#6b7280" }}>No images yet.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ color: "#6b7280" }}>Select a product to view details.</div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, position: "sticky", top: 30, alignSelf: "start" }}>
            <div className="panel" style={{ padding: 14, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ marginTop: 0 }}>Cart</h3>
                <div className="pill">{cart?.items.length || 0} items</div>
              </div>
              {cart && cart.items.length > 0 ? (
                <>
                  <div style={{ display: "grid", gap: 8, maxHeight: 220, overflow: "auto" }}>
                    {cart.items.map((item) => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: 8, border: "1px solid var(--border)", borderRadius: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{item.name}</div>
                          <div style={{ color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}>
                            {(item.unitPriceCents / 100).toFixed(2)} x
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              style={{ width: 60 }}
                              onChange={(e) => updateQty(item.id, Number(e.target.value))}
                            />
                          </div>
                          <div style={{ color: "#4b5563", fontWeight: 700 }}>
                            {(item.lineTotalCents / 100).toFixed(2)} KES
                          </div>
                        </div>
                        <button className="btn btn-secondary" onClick={() => deleteItem(item.id)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "grid", gap: 4 }}>
                    <div>Subtotal: {(cart.subtotalCents / 100).toFixed(2)} KES</div>
                    <div>Delivery: {(cart.deliveryFeeCents / 100).toFixed(2)} KES</div>
                    <div style={{ fontWeight: 800 }}>Total: {(cart.totalCents / 100).toFixed(2)} KES</div>
                  </div>
                  <div className="panel" style={{ padding: 10 }}>
                    <div style={{ fontWeight: 700 }}>Delivery quote (Nairobi)</div>
                    <input
                      style={input}
                      placeholder="City area e.g. Westlands"
                      value={cityArea}
                      onChange={(e) => setCityArea(e.target.value)}
                    />
                    <button className="btn btn-secondary" onClick={quoteDelivery} disabled={!cart}>
                      Update delivery fee
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ color: "#6b7280" }}>Cart is empty.</div>
              )}
            </div>

            <div className="panel" style={{ padding: 14, display: "grid", gap: 10 }}>
              <h3 style={{ marginTop: 0 }}>Checkout</h3>
              <input style={input} placeholder="Phone (MPesa)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <input style={input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input style={input} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <input style={input} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <textarea
                style={{ ...input, minHeight: 80 }}
                placeholder="Street / estate"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
              />
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="radio" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} /> Pay on delivery
                (cash/MPesa on arrival)
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="radio" checked={paymentMethod === "pickup"} onChange={() => setPaymentMethod("pickup")} /> Pickup & pay
                in-store
              </label>
              {paymentMethod === "pickup" && (
                <div className="panel" style={{ padding: 10, background: "#f3f4f6" }}>
                  <div style={{ fontWeight: 700 }}>{pickupLocation.name}</div>
                  <div style={{ color: "#4b5563", marginBottom: 6 }}>
                    You’ll pay on collection. Show this order number and phone at the counter.
                  </div>
                  <a className="btn btn-secondary" href={pickupLocation.mapUrl} target="_blank" rel="noreferrer">
                    View map
                  </a>
                </div>
              )}
              <button className="btn btn-primary" onClick={submitCheckout} disabled={!cart || !phone}>
                Place order
              </button>
              <button className="btn btn-secondary" onClick={sendWhatsAppOrder} disabled={!cart || (cart.items || []).length === 0}>
                Send order on WhatsApp
              </button>
              <div style={{ color: "#0f766e" }}>{checkoutMsg}</div>
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
