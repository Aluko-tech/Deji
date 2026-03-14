"use client";
import { useCurrency } from "@/lib/currencyContext";
import { useState, useEffect, useRef } from "react";
import {
  Search, Plus, Minus, X, ShoppingCart, Printer,
  CheckCircle, Tag, AlertTriangle, RefreshCw, Globe,
} from "lucide-react";
import { getInventory, processPOSSale } from "@/lib/api";

const PAYMENT_METHODS = ["Cash", "Transfer", "Card", "POS Machine"];

function effectivePrice(p) {
  if (!p.discountType || p.discountType === "none") return p.sellingPrice || 0;
  if (p.discountType === "percent")
    return (p.sellingPrice || 0) * (1 - (p.discountValue || 0) / 100);
  return Math.max(0, (p.sellingPrice || 0) - (p.discountValue || 0));
}

function getSettings() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("tenantSettings") || "{}"); } catch { return {}; }
}

// ─── Receipt ──────────────────────────────────────────────────────────────────
function Receipt({ receipt, onNewSale }) {
  const settings = getSettings();
  const ref = useRef();

  const handlePrint = () => {
    const content = ref.current?.innerHTML;
    if (!content) return;
    const w = window.open("", "_blank", "width=400,height=600");
    w.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: monospace; font-size: 12px; padding: 16px; max-width: 320px; margin: 0 auto; }
        .center { text-align: center; }
        .bold   { font-weight: bold; }
        .row    { display: flex; justify-content: space-between; margin: 3px 0; }
        .divider{ border-top: 1px dashed #999; margin: 8px 0; }
        .large  { font-size: 15px; font-weight: bold; }
      </style></head>
      <body>${content}</body></html>
    `);
    w.document.close();
    w.print();
    w.close();
  };

  return (
    <div className="max-w-sm mx-auto animate-fade-up py-4">
      <div className="deji-card p-6 text-center mb-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{background:"var(--primary-dim)"}}>
          <CheckCircle size={32} style={{color:"var(--primary)"}}/>
        </div>
        <h2 className="text-2xl font-bold mb-1"
          style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>
          Sale Complete!
        </h2>
        <p className="text-sm mb-1" style={{color:"var(--text-muted)"}}>
          #{receipt.saleId}
        </p>
        {receipt.source === "website" && (
          <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full mb-3"
            style={{background:"rgba(99,102,241,0.1)", color:"#6366f1"}}>
            <Globe size={10}/> Website Order
          </div>
        )}

        {/* Printable receipt */}
        <div ref={ref} className="text-left p-4 rounded-2xl mb-5"
          style={{background:"var(--bg-hover)"}}>
          <div className="text-center mb-3">
            {settings.receiptLogoUrl && (
              <img src={settings.receiptLogoUrl} alt="logo"
                className="w-14 h-14 object-contain mx-auto mb-2 rounded-xl"/>
            )}
            <p className="font-bold"
              style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>
              {settings.businessName || "Your Business"}
            </p>
            {settings.address && (
              <p className="text-xs" style={{color:"var(--text-muted)"}}>{settings.address}</p>
            )}
            {settings.phone && (
              <p className="text-xs" style={{color:"var(--text-muted)"}}>{settings.phone}</p>
            )}
          </div>

          <div className="border-t border-dashed my-2" style={{borderColor:"var(--border)"}}/>

          <div className="space-y-0.5 mb-2">
            <p className="text-xs" style={{color:"var(--text-muted)"}}>
              {receipt.date.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
              {" · "}
              {receipt.date.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
            </p>
            {receipt.customerName  && (
              <p className="text-xs" style={{color:"var(--text-muted)"}}>
                Customer: {receipt.customerName}
              </p>
            )}
            {receipt.customerPhone && (
              <p className="text-xs" style={{color:"var(--text-muted)"}}>
                Phone: {receipt.customerPhone}
              </p>
            )}
            {receipt.source === "website" && (
              <p className="text-xs" style={{color:"#6366f1"}}>🌐 Website Order</p>
            )}
          </div>

          <div className="border-t border-dashed my-2" style={{borderColor:"var(--border)"}}/>

          <div className="space-y-2">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-semibold truncate" style={{color:"var(--text-primary)"}}>
                    {item.name}
                  </p>
                  <p className="text-xs" style={{color:"var(--text-muted)"}}>
                    x{item.quantity} @ {format(Math.round(item.unitPrice))}
                  </p>
                </div>
                <span className="text-xs font-bold flex-shrink-0" style={{color:"var(--text-primary)"}}>
                  {format(Math.round(item.unitPrice * item.quantity))}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed my-2" style={{borderColor:"var(--border)"}}/>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span style={{color:"var(--text-muted)"}}>Subtotal</span>
              <span style={{color:"var(--text-primary)"}}>{format(Math.round(receipt.subtotal))}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span style={{color:"var(--text-muted)"}}>Discount</span>
                <span className="text-red-400">-{format(Math.round(receipt.discountAmount))}</span>
              </div>
            )}
            {receipt.note && (
              <div className="flex justify-between text-xs">
                <span style={{color:"var(--text-muted)"}}>Note</span>
                <span style={{color:"var(--text-muted)"}}>{receipt.note}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1"
              style={{borderTop:"1px solid var(--border)"}}>
              <span style={{color:"var(--text-primary)"}}>TOTAL</span>
              <span style={{color:"var(--primary)"}}>{format(Math.round(receipt.total))}</span>
            </div>
            <p className="text-xs pt-0.5" style={{color:"var(--text-muted)"}}>
              Paid via {receipt.paymentMethod}
            </p>
          </div>

          <div className="border-t border-dashed mt-2 pt-2" style={{borderColor:"var(--border)"}}>
            <p className="text-xs text-center font-semibold" style={{color:"var(--text-muted)"}}>
              {settings.receiptFooter || "Thank you for your business!"}
            </p>
            <p className="text-xs text-center mt-0.5" style={{color:"var(--text-muted)"}}>
              Powered by Deji
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handlePrint}
            className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Printer size={14}/> Print
          </button>
          <button onClick={onNewSale} className="btn-primary flex-1">
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main POS ─────────────────────────────────────────────────────────────────
export default function POSPage() {
  const [products,   setProducts]   = useState([]);
  const { format, symbol } = useCurrency();
  const [cart,       setCart]       = useState([]);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("all");
  const [customer,   setCustomer]   = useState({ name:"", phone:"" });
  const [payment,    setPayment]    = useState("Cash");
  const [discount,   setDiscount]   = useState({ type:"fixed", value:"" });
  const [note,       setNote]       = useState("");
  const [source,     setSource]     = useState("pos"); // "pos" | "website"
  const [processing, setProcessing] = useState(false);
  const [receipt,    setReceipt]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [stockError, setStockError] = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  // Clear stock error after 3 seconds
  useEffect(() => {
    if (!stockError) return;
    const t = setTimeout(() => setStockError(null), 3000);
    return () => clearTimeout(t);
  }, [stockError]);

  const fetchProducts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getInventory({ limit:500 });
      const all = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.products || [];

      if (!all.length) {
        setProducts([]);
        setLoadError("no_products");
        return;
      }

      // Show all products — include out-of-stock but mark them
      setProducts(all);
    } catch(e) {
      console.error(e);
      setLoadError("fetch_failed");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const cats = ["all", ...[...new Set(products.map(p => p.category).filter(Boolean))]];

  const addToCart = (prod) => {
    if (!prod.isBundle && prod.stock <= 0) {
      setStockError(`${prod.name} is out of stock`);
      return;
    }
    const price = effectivePrice(prod);
    setCart(c => {
      const ex = c.find(i => i.productId === prod.id);
      if (ex) {
        // Enforce stock limit
        if (!prod.isBundle && ex.quantity >= prod.stock) {
          setStockError(`Only ${prod.stock} units of ${prod.name} available`);
          return c;
        }
        return c.map(i =>
          i.productId === prod.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...c, {
        productId:  prod.id,
        name:       prod.name,
        unitPrice:  price,
        quantity:   1,
        maxStock:   prod.isBundle ? 9999 : prod.stock,
        isBundle:   prod.isBundle || false,
        imageUrl:   prod.imageUrl || "",
      }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(c => {
      return c
        .map(i => {
          if (i.productId !== productId) return i;
          const newQty = i.quantity + delta;
          if (newQty > i.maxStock) {
            setStockError(`Only ${i.maxStock} units available`);
            return i;
          }
          return { ...i, quantity: Math.max(0, newQty) };
        })
        .filter(i => i.quantity > 0);
    });
  };

  const removeItem  = (productId) => setCart(c => c.filter(i => i.productId !== productId));

  const clearCart = () => {
    setCart([]);
    setCustomer({ name:"", phone:"" });
    setNote("");
    setDiscount({ type:"fixed", value:"" });
    setSource("pos");
  };

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discAmt  = discount.value
    ? discount.type === "percent"
      ? subtotal * (Number(discount.value) / 100)
      : Number(discount.value)
    : 0;
  const total = Math.max(0, subtotal - discAmt);

  const filtered = products.filter(p => {
    if (filterCat !== "all" && p.category !== filterCat) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const processSale = async () => {
    if (cart.length === 0) return;
    if (!payment) return alert("Select a payment method");
    setProcessing(true);
    try {
      const payload = {
        items:          cart.map(i => ({
          productId:  i.productId,
          name:       i.name,
          unitPrice:  Math.round(i.unitPrice),
          quantity:   i.quantity,
          isBundle:   i.isBundle,
        })),
        customerName:   customer.name.trim() || null,
        customerPhone:  customer.phone.trim() || null,
        paymentMethod:  payment,
        subtotal:       Math.round(subtotal),
        discountAmount: Math.round(discAmt),
        total:          Math.round(total),
        note:           note.trim() || null,
        source,
      };

      const res    = await processPOSSale(payload);
      const saleId = res.data?.saleId || res.data?.id
        || "POS-" + Date.now().toString(36).toUpperCase();

      setReceipt({
        ...payload,
        items: cart, // keep unitPrice as number for display
        saleId,
        date: new Date(),
      });
      clearCart();
      fetchProducts(); // refresh stock
    } catch(e) {
      alert(e.message || "Sale failed — please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // ── Receipt view ─────────────────────────────────────────────────────────────
  if (receipt) {
    return (
      <Receipt
        receipt={receipt}
        onNewSale={() => setReceipt(null)}
      />
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-4 animate-fade-up pb-4" style={{height:"calc(100vh - 5rem)"}}>

      {/* ── Left: Product Grid ── */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden min-w-0">

        {/* Search + filter */}
        <div className="flex gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{color:"var(--text-muted)"}}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products..." className="deji-input pl-9"/>
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="deji-input w-auto">
            {cats.map(c => (
              <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
            ))}
          </select>
          <button onClick={fetchProducts}
            className="btn-secondary px-3 flex items-center gap-1.5" title="Refresh products">
            <RefreshCw size={14}/>
          </button>
        </div>

        {/* Stock error toast */}
        {stockError && (
          <div className="flex items-center gap-2 p-3 rounded-xl flex-shrink-0"
            style={{background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)"}}>
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0"/>
            <p className="text-sm text-red-400 font-semibold">{stockError}</p>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_,i) => (
                <div key={i} className="skeleton h-44 rounded-2xl animate-pulse"/>
              ))}
            </div>
          ) : loadError === "fetch_failed" ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="font-semibold mb-1" style={{color:"var(--text-primary)"}}>
                Could not load products
              </p>
              <p className="text-sm mb-4" style={{color:"var(--text-muted)"}}>
                Check your connection and try again
              </p>
              <button onClick={fetchProducts}
                className="btn-primary flex items-center gap-2">
                <RefreshCw size={14}/> Retry
              </button>
            </div>
          ) : loadError === "no_products" ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-5xl mb-4">📦</div>
              <p className="font-semibold mb-1" style={{color:"var(--text-primary)"}}>
                No products in inventory
              </p>
              <p className="text-sm mb-4" style={{color:"var(--text-muted)"}}>
                Add products in Inventory before making a sale
              </p>
              <a href="/erp/inventory" className="btn-primary">Go to Inventory →</a>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">🔍</div>
              <p style={{color:"var(--text-muted)"}}>No products match your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(p => {
                const price    = effectivePrice(p);
                const inCart   = cart.find(i => i.productId === p.id);
                const hasDisc  = p.discountType && p.discountType !== "none";
                const outOfStock = !p.isBundle && p.stock <= 0;
                const lowStock   = !p.isBundle && p.stock > 0 && p.stock <= 5;
                const atMax      = inCart && !p.isBundle && inCart.quantity >= p.stock;

                return (
                  <button key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className="deji-card p-3 text-left transition-all relative"
                    style={{
                      borderColor: inCart ? "var(--primary)" : undefined,
                      opacity:     outOfStock ? 0.5 : 1,
                      cursor:      outOfStock ? "not-allowed" : "pointer",
                      transform:   outOfStock ? "none" : undefined,
                    }}>

                    {/* Product image or placeholder */}
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name}
                        className="w-full h-24 object-cover rounded-xl mb-2"
                        style={{border:"1px solid var(--border)"}}/>
                    ) : (
                      <div className="w-full h-24 rounded-xl mb-2 flex items-center justify-center text-3xl"
                        style={{background:"var(--primary-dim)"}}>
                        {p.isBundle ? "🎁" : "📦"}
                      </div>
                    )}

                    {/* Discount badge */}
                    {hasDisc && !outOfStock && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-0.5"
                        style={{background:"#ef4444", color:"#fff"}}>
                        <Tag size={7}/>
                        {p.discountType === "percent"
                          ? p.discountValue + "% OFF"
                          : format(p.discountValue) + " OFF"}
                      </div>
                    )}

                    {/* Out of stock badge */}
                    {outOfStock && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-[9px] font-bold"
                        style={{background:"#ef4444", color:"#fff"}}>
                        Out of Stock
                      </div>
                    )}

                    {/* Cart quantity badge */}
                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{background: atMax ? "#f97316" : "var(--primary)"}}>
                        {inCart.quantity}
                      </div>
                    )}

                    <p className="text-xs font-semibold truncate mb-1"
                      style={{color:"var(--text-primary)"}}>{p.name}</p>

                    {p.isBundle && (
                      <p className="text-[10px] text-purple-400 mb-0.5">🎁 Bundle</p>
                    )}

                    <div className="flex items-baseline gap-1.5">
                      <p className="text-sm font-bold" style={{color:"var(--primary)"}}>
                        {format(price)}
                      </p>
                      {hasDisc && (
                        <p className="text-xs line-through" style={{color:"var(--text-muted)"}}>
                          {format(p.sellingPrice)}
                        </p>
                      )}
                    </div>

                    {!p.isBundle && (
                      <p className="text-[10px] mt-0.5 font-semibold"
                        style={{color: outOfStock ? "#ef4444" : lowStock ? "#fb923c" : "var(--text-muted)"}}>
                        {outOfStock ? "Out of stock"
                          : lowStock ? `⚠ Only ${p.stock} left`
                          : `Stock: ${p.stock}`}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart ── */}
      <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden rounded-2xl"
        style={{border:"1px solid var(--border)"}}>

        {/* Cart header */}
        <div className="p-4 flex items-center gap-2 flex-shrink-0"
          style={{background:"var(--bg-surface)", borderBottom:"1px solid var(--border)"}}>
          <ShoppingCart size={16} style={{color:"var(--primary)"}}/>
          <h2 className="font-bold"
            style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>
            Cart
          </h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
            style={{background:"var(--primary)", color:"#fff"}}>
            {cart.reduce((s,i) => s+i.quantity, 0)}
          </span>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs ml-1"
              style={{color:"var(--text-muted)"}}>Clear</button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2"
          style={{background:"var(--bg-surface)"}}>
          {cart.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">🛒</div>
              <p className="text-xs" style={{color:"var(--text-muted)"}}>Tap a product to add it</p>
            </div>
          ) : cart.map(item => (
            <div key={item.productId} className="p-2.5 rounded-xl"
              style={{background:"var(--bg-hover)"}}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0"/>
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{background:"var(--primary-dim)"}}>
                      {item.isBundle ? "🎁" : "📦"}
                    </div>
                  )}
                  <span className="text-xs font-semibold truncate"
                    style={{color:"var(--text-primary)"}}>{item.name}</span>
                </div>
                <button onClick={() => removeItem(item.productId)}
                  className="text-red-400 flex-shrink-0 ml-1">
                  <X size={12}/>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.productId, -1)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{background:"var(--bg-card)", color:"var(--text-muted)"}}>
                    <Minus size={10}/>
                  </button>
                  <span className="text-sm font-bold w-5 text-center"
                    style={{color:"var(--text-primary)"}}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{background:"var(--bg-card)", color:"var(--text-muted)"}}>
                    <Plus size={10}/>
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{color:"var(--primary)"}}>
                    {format(Math.round(item.unitPrice * item.quantity))}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-[9px]" style={{color:"var(--text-muted)"}}>
                      {format(Math.round(item.unitPrice))} each
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart footer */}
        <div className="p-4 space-y-3 flex-shrink-0"
          style={{borderTop:"1px solid var(--border)", background:"var(--bg-surface)"}}>

          {/* Customer */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="deji-label">Customer</label>
              <input value={customer.name}
                onChange={e => setCustomer(p => ({...p, name:e.target.value}))}
                className="deji-input text-xs" placeholder="Name (optional)"/>
            </div>
            <div>
              <label className="deji-label">Phone</label>
              <input value={customer.phone}
                onChange={e => setCustomer(p => ({...p, phone:e.target.value}))}
                className="deji-input text-xs" placeholder="08012345678"/>
            </div>
          </div>

          {/* Sale source toggle */}
          <div>
            <label className="deji-label">Sale Source</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {[
                { k:"pos",     label:"🏪 In-Store" },
                { k:"website", label:"🌐 Website"  },
              ].map(s => (
                <button key={s.k} type="button" onClick={() => setSource(s.k)}
                  className="py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background:  source===s.k ? "var(--primary)" : "transparent",
                    color:       source===s.k ? "#fff" : "var(--text-muted)",
                    borderColor: source===s.k ? "var(--primary)" : "var(--border)",
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="deji-label">Payment Method</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {PAYMENT_METHODS.map(m => (
                <button key={m} type="button" onClick={() => setPayment(m)}
                  className="py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background:  payment===m ? "var(--primary)" : "transparent",
                    color:       payment===m ? "#fff" : "var(--text-muted)",
                    borderColor: payment===m ? "var(--primary)" : "var(--border)",
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="deji-label">Disc Type</label>
              <select value={discount.type}
                onChange={e => setDiscount(p => ({...p, type:e.target.value}))}
                className="deji-input text-xs">
                <option value="fixed">{symbol} Fixed</option>
                <option value="percent">% Pct</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="deji-label">Discount</label>
              <input type="number" min="0" value={discount.value}
                onChange={e => setDiscount(p => ({...p, value:e.target.value}))}
                className="deji-input text-sm" placeholder="0"/>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="deji-label">Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              className="deji-input text-xs" placeholder="e.g. Gift wrapping, special request..."/>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 p-3 rounded-xl" style={{background:"var(--bg-hover)"}}>
            <div className="flex justify-between text-sm">
              <span style={{color:"var(--text-muted)"}}>Subtotal</span>
              <span style={{color:"var(--text-primary)"}}>{format(Math.round(subtotal))}</span>
            </div>
            {discAmt > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{color:"var(--text-muted)"}}>Discount</span>
                <span className="text-red-400">-{format(Math.round(discAmt))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1.5"
              style={{borderTop:"1px solid var(--border)"}}>
              <span style={{color:"var(--text-primary)"}}>Total</span>
              <span style={{color:"var(--primary)"}}>{format(Math.round(total))}</span>
            </div>
          </div>

          {/* Charge button */}
          <button
            onClick={processSale}
            disabled={processing || cart.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold"
            style={{opacity: cart.length === 0 ? 0.5 : 1}}>
            {processing
              ? <><RefreshCw size={14} className="animate-spin"/> Processing...</>
              : `Charge ${format(Math.round(total))} →`}
          </button>
        </div>
      </div>
    </div>
  );
}