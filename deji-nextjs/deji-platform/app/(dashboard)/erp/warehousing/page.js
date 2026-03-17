"use client";
import { useState, useEffect } from "react";
import {
  Plus, X, Edit, Trash2, ArrowRightLeft, Package,
  MapPin, Globe, RefreshCw, Eye, AlertTriangle, Search,
  ChevronDown, ChevronUp, Star,
} from "lucide-react";
import api from "@/lib/api";

const WAREHOUSE_TYPES = [
  { value:"local",        icon:"🏭", label:"Local",         desc:"Domestic warehouse"      },
  { value:"international",icon:"🌍", label:"International", desc:"Overseas location"        },
  { value:"3pl",          icon:"🚛", label:"3PL",            desc:"Third-party logistics"   },
  { value:"bonded",       icon:"🔒", label:"Bonded",         desc:"Customs bonded store"    },
  { value:"dropship",     icon:"📦", label:"Drop-ship",      desc:"Supplier ships direct"   },
  { value:"virtual",      icon:"☁️", label:"Virtual",        desc:"Digital / no physical"   },
];
const COUNTRIES = [
  "Nigeria","United Kingdom","United States","United Arab Emirates","Ghana","Kenya",
  "South Africa","Canada","Germany","France","China","India","Singapore","Australia",
  "Netherlands","Turkey","Saudi Arabia","Egypt","Ethiopia","Tanzania","Rwanda","Senegal",
];
const CURRENCIES = ["NGN","USD","GBP","EUR","AED","GHS","KES","ZAR","CAD"];
const EMPTY_FORM = {
  name:"", code:"", type:"local", country:"Nigeria", city:"", address:"",
  currency:"NGN", defaultDeliveryFee:"", contactName:"", contactPhone:"",
  contactEmail:"", notes:"", isActive:true,
};
const EMPTY_TRANSFER = {
  fromWarehouse:"", toWarehouse:"", productId:"",
  quantity:"", deliveryFee:"", carrier:"", trackingNumber:"", notes:"",
  variantId:"", variantName:"",
};

function safeArray(v) {
  if (Array.isArray(v))             return v;
  if (Array.isArray(v?.data))       return v.data;
  if (Array.isArray(v?.warehouses)) return v.warehouses;
  if (Array.isArray(v?.transfers))  return v.transfers;
  if (Array.isArray(v?.products))   return v.products;
  return [];
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
}
const TYPE_INFO = Object.fromEntries(WAREHOUSE_TYPES.map(t => [t.value, t]));

// Helper: get variants from product (DB variants take priority over customFields)
function getProductVariants(prod) {
  if (!prod) return [];
  if (Array.isArray(prod.variants) && prod.variants.length > 0) return prod.variants;
  const cf = prod.customFields || {};
  if (Array.isArray(cf.variants) && cf.variants.length > 0) return cf.variants;
  return [];
}

// Variant breakdown display component
function VariantBreakdown({ prod, indent = "ml-12" }) {
  const variants = getProductVariants(prod);
  if (!variants.length) return null;
  const total = variants.reduce((s,v) => s + (Number(v.stock)||0), 0);
  return (
    <div className={`mt-2 ${indent} flex flex-wrap gap-2`}>
      {variants.map((v,i) => (
        <div key={v.id||i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]"
          style={{background:"var(--bg-hover)", border:"1px solid var(--border)"}}>
          {v.imageUrl && <img src={v.imageUrl} className="w-3 h-3 rounded object-cover"/>}
          <span className="font-semibold" style={{color:"var(--text-primary)"}}>{v.name}</span>
          <span className={`font-bold ${(v.stock||0)<=0?"text-red-400":(v.stock||0)<=5?"text-orange-400":"text-green-400"}`}>
            {v.stock||0}
          </span>
          <span style={{color:"var(--text-muted)"}}>units</span>
        </div>
      ))}
      <div className="px-2 py-1 rounded-lg text-[10px] font-bold"
        style={{background:"var(--primary-dim)", color:"var(--primary)"}}>
        Total: {total}
      </div>
    </div>
  );
}

export default function WarehousingPage() {
  const [activeTab,     setActiveTab]     = useState("warehouses");
  const [warehouses,    setWarehouses]    = useState([]);
  const [transfers,     setTransfers]     = useState([]);
  const [inventory,     setInventory]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [showTransfer,  setShowTransfer]  = useState(false);
  const [showStockView, setShowStockView] = useState(null);
  const [editWH,        setEditWH]        = useState(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [transfer,      setTransfer]      = useState(EMPTY_TRANSFER);
  const [saving,        setSaving]        = useState(false);
  const [savingTx,      setSavingTx]      = useState(false);
  const [error,         setError]         = useState("");
  const [defaultWH,     setDefaultWH]     = useState(null);
  const [stockSearch,   setStockSearch]   = useState("");
  const [stockCat,      setStockCat]      = useState("all");
  const [txSearch,      setTxSearch]      = useState("");
  const [expandedWH,    setExpandedWH]    = useState(null);
  const [syncMsg,       setSyncMsg]       = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [wr, tr, ir, dr] = await Promise.allSettled([
      api.get("/warehouses"),
      api.get("/warehouses/transfers"),
      api.get("/products?limit=500"),
      api.get("/warehouses/default"),
    ]);
    setWarehouses(wr.status === "fulfilled" ? safeArray(wr.value?.data) : []);
    setTransfers (tr.status === "fulfilled" ? safeArray(tr.value?.data) : []);
    setInventory (ir.status === "fulfilled" ? safeArray(ir.value?.data) : []);
    if (dr.status === "fulfilled") setDefaultWH(dr.value?.data);
    setLoading(false);
  };

  const syncStock = async () => {
    setSyncMsg("🔄 Syncing...");
    try {
      const res = await api.post("/warehouses/sync-stock");
      setSyncMsg(`✅ Synced ${res.data.synced} products`);
      fetchAll();
    } catch(e) {
      setSyncMsg("❌ Sync failed: " + (e.message || "unknown error"));
    }
    setTimeout(() => setSyncMsg(""), 4000);
  };

  const openAdd  = () => { setForm(EMPTY_FORM); setEditWH(null); setShowModal(true); };
  const openEdit = (wh) => {
    setForm({
      name: wh.name, code: wh.code||"", type: wh.type||"local",
      country: wh.country, city: wh.city||"", address: wh.address||"",
      currency: wh.currency||"NGN", defaultDeliveryFee: wh.defaultDeliveryFee||"",
      contactName: wh.contactName||"", contactPhone: wh.contactPhone||"",
      contactEmail: wh.contactEmail||"", notes: wh.notes||"",
      isActive: wh.isActive !== false,
    });
    setEditWH(wh); setShowModal(true);
  };
  const saveWarehouse = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      editWH ? await api.patch(`/warehouses/${editWH.id}`, form)
             : await api.post("/warehouses", form);
      setShowModal(false); setEditWH(null); await fetchAll();
    } catch (err) { setError(err?.response?.data?.message || "Failed to save warehouse"); }
    finally { setSaving(false); }
  };
  const deleteWarehouse = async (wh) => {
    if (!confirm(`Permanently delete "${wh.name}"? This cannot be undone.`)) return;
    try { await api.delete(`/warehouses/${wh.id}`); await fetchAll(); }
    catch (err) { alert(err?.response?.data?.message || "Failed to delete warehouse"); }
  };
  const setAsDefault = async (wh) => {
    try { await api.patch(`/warehouses/${wh.id}`, { isDefault: true }); await fetchAll(); }
    catch { alert("Failed to set default warehouse"); }
  };

  const openTransfer = () => {
    setTransfer(p => ({ ...p, fromWarehouse: defaultWH?.id || "" }));
    setShowTransfer(true); setError("");
  };
  const submitTransfer = async () => {
    const { fromWarehouse, toWarehouse, productId, quantity } = transfer;
    if (!fromWarehouse || !toWarehouse || !productId || !quantity)
      return alert("Please fill all required fields.");
    setSavingTx(true); setError("");
    try {
      const variantNote = transfer.variantName ? `[Variant: ${transfer.variantName}] ` : "";
      await api.post("/warehouses/transfers", {
        fromWarehouseId: fromWarehouse, toWarehouseId: toWarehouse,
        productId, quantity: Number(quantity),
        deliveryFee: Number(transfer.deliveryFee||0),
        carrier: transfer.carrier,
        trackingNumber: transfer.trackingNumber,
        notes: variantNote + (transfer.notes||""),
        variantId: transfer.variantId || null,
      });
      setShowTransfer(false); setTransfer(EMPTY_TRANSFER); await fetchAll();
    } catch (err) {
      const msg = err?.response?.data?.message || "Transfer failed";
      setError(msg); alert(msg);
    } finally { setSavingTx(false); }
  };

  const totalDeliveryFees = transfers.reduce((s,t) => s + Number(t.deliveryFee||0), 0);
  const intlWarehouses    = warehouses.filter(w => w.country !== "Nigeria");
  const localWarehouses   = warehouses.filter(w => w.country === "Nigeria");
  const activeCount       = warehouses.filter(w => w.isActive !== false).length;

  const categories = ["all", ...new Set(inventory.map(p => p.category).filter(Boolean))];
  const filteredInventory = inventory.filter(p => {
    const matchSearch = !stockSearch || p.name?.toLowerCase().includes(stockSearch.toLowerCase()) || p.sku?.toLowerCase().includes(stockSearch.toLowerCase());
    const matchCat    = stockCat === "all" || p.category === stockCat;
    return matchSearch && matchCat;
  });

  const filteredTransfers = transfers.filter(t => {
    if (!txSearch) return true;
    const q = txSearch.toLowerCase();
    return t.product?.name?.toLowerCase().includes(q) ||
           t.fromWarehouse?.name?.toLowerCase().includes(q) ||
           t.toWarehouse?.name?.toLowerCase().includes(q) ||
           t.carrier?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 pb-20 lg:pb-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Warehousing</h1>
          <p className="page-subtitle">
            {loading ? "Loading..." : `${activeCount} active · ${intlWarehouses.length} international · ${transfers.length} transfers`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {syncMsg && <span className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}>{syncMsg}</span>}
          <button onClick={fetchAll} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={13}/> Refresh
          </button>
          <button onClick={syncStock} className="btn-secondary flex items-center gap-2 text-sm">
            🔄 Sync Products
          </button>
          <button onClick={openTransfer} className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowRightLeft size={13}/> Transfer Stock
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14}/> Add Warehouse
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Total Locations",  value: warehouses.length,                      icon:"🏭" },
          { label:"Local (Nigeria)",  value: localWarehouses.length,                 icon:"📍" },
          { label:"International",    value: intlWarehouses.length,                  icon:"🌍" },
          { label:"Logistics Spent",  value:`₦${totalDeliveryFees.toLocaleString()}`,icon:"🚚" },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-2xl mb-1">{k.icon}</div>
            <p className="text-xl font-bold" style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
              {loading ? "—" : k.value}
            </p>
            <p className="text-xs" style={{ color:"var(--text-muted)" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key:"warehouses", label:"🏭 Locations"  },
          { key:"transfers",  label:"🔄 Transfers"   },
          { key:"stock-map",  label:"🗺 Stock Map"   },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap"
            style={{
              background:  activeTab===t.key ? "var(--primary)" : "transparent",
              color:       activeTab===t.key ? "#fff" : "var(--text-muted)",
              borderColor: activeTab===t.key ? "var(--primary)" : "var(--border)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* WAREHOUSES TAB */}
      {activeTab === "warehouses" && (
        loading ? (
          <div className="deji-card p-12 text-center">
            <div className="text-4xl mb-3 animate-pulse">🏭</div>
            <p style={{ color:"var(--text-muted)" }}>Loading warehouses...</p>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="deji-card p-14 text-center">
            <div className="text-6xl mb-4">🏭</div>
            <h3 className="font-bold text-lg mb-2" style={{ color:"var(--text-primary)" }}>No warehouses yet</h3>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color:"var(--text-muted)" }}>
              Add your first location to start tracking stock by location.
            </p>
            <button onClick={openAdd} className="btn-primary flex items-center gap-2 mx-auto">
              <Plus size={14}/> Add First Warehouse
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {intlWarehouses.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color:"var(--text-muted)" }}>
                  <Globe size={11}/> International Locations
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {intlWarehouses.map(wh => (
                    <WarehouseCard key={wh.id} wh={wh} isDefault={defaultWH?.id === wh.id}
                      onEdit={openEdit} onDelete={deleteWarehouse}
                      onView={setShowStockView} onSetDefault={setAsDefault}
                      onTransfer={() => { setTransfer(p=>({...p, fromWarehouse: wh.id})); setShowTransfer(true); setError(""); }}
                    />
                  ))}
                </div>
              </div>
            )}
            {localWarehouses.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color:"var(--text-muted)" }}>
                  <MapPin size={11}/> Nigeria Locations
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {localWarehouses.map(wh => (
                    <WarehouseCard key={wh.id} wh={wh} isDefault={defaultWH?.id === wh.id}
                      onEdit={openEdit} onDelete={deleteWarehouse}
                      onView={setShowStockView} onSetDefault={setAsDefault}
                      onTransfer={() => { setTransfer(p=>({...p, fromWarehouse: wh.id})); setShowTransfer(true); setError(""); }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* TRANSFERS TAB */}
      {activeTab === "transfers" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--text-muted)" }}/>
              <input value={txSearch} onChange={e=>setTxSearch(e.target.value)}
                placeholder="Search transfers..." className="deji-input pl-8 text-sm" style={{ minWidth:220 }}/>
            </div>
            <button onClick={openTransfer} className="btn-primary flex items-center gap-2 text-sm">
              <ArrowRightLeft size={13}/> New Transfer
            </button>
          </div>
          {filteredTransfers.length === 0 ? (
            <div className="deji-card p-12 text-center">
              <div className="text-5xl mb-3">🔄</div>
              <p className="mb-4" style={{ color:"var(--text-muted)" }}>{txSearch ? "No transfers match your search." : "No stock transfers yet."}</p>
              {!txSearch && <button onClick={openTransfer} className="btn-primary flex items-center gap-2 mx-auto"><ArrowRightLeft size={14}/> Create First Transfer</button>}
            </div>
          ) : (
            <div className="deji-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="deji-table w-full">
                  <thead>
                    <tr><th>Date</th><th>Product</th><th>From</th><th>To</th><th>Qty</th><th>Carrier</th><th>Fee</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {filteredTransfers.map((t,idx) => (
                      <tr key={t.id||idx}>
                        <td><span className="text-xs" style={{ color:"var(--text-muted)" }}>{fmtDate(t.createdAt)}</span></td>
                        <td>
                          <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{t.product?.name||"—"}</p>
                          {t.notes?.includes("[Variant:") && <p className="text-[10px] text-indigo-400">{t.notes.match(/\[Variant:[^\]]+\]/)?.[0]}</p>}
                        </td>
                        <td><span className="text-xs" style={{ color:"var(--text-muted)" }}>{t.fromWarehouse?.name||"—"}{t.fromWarehouse?.country !== "Nigeria" && " 🌍"}</span></td>
                        <td><span className="text-xs" style={{ color:"var(--text-muted)" }}>{t.toWarehouse?.name||"—"}{t.toWarehouse?.country !== "Nigeria" && " 🌍"}</span></td>
                        <td><span className="text-sm font-bold" style={{ color:"var(--text-primary)" }}>{t.quantity}</span></td>
                        <td><span className="text-xs" style={{ color:"var(--text-muted)" }}>{t.carrier||"—"}</span></td>
                        <td>{Number(t.deliveryFee||0) > 0 ? <span className="text-sm font-bold text-orange-400">₦{Number(t.deliveryFee).toLocaleString()}</span> : <span style={{ color:"var(--text-muted)" }}>—</span>}</td>
                        <td><span className={`badge text-xs ${t.status==="completed"?"badge-green":t.status==="in-transit"?"badge-orange":"badge-blue"}`}>{t.status||"completed"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:"2px solid var(--border)", background:"var(--bg-hover)" }}>
                      <td colSpan={6} className="p-3"><span className="text-xs font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{filteredTransfers.length} transfers</span></td>
                      <td className="p-3"><span className="text-sm font-bold text-orange-400">₦{totalDeliveryFees.toLocaleString()}</span></td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STOCK MAP TAB */}
      {activeTab === "stock-map" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--text-muted)" }}/>
              <input value={stockSearch} onChange={e=>setStockSearch(e.target.value)}
                placeholder="Search products..." className="deji-input pl-8 text-sm" style={{ minWidth:200 }}/>
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.slice(0,8).map(cat => (
                <button key={cat} onClick={()=>setStockCat(cat)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{ background: stockCat===cat?"var(--primary)":"transparent", color: stockCat===cat?"#fff":"var(--text-muted)", borderColor: stockCat===cat?"var(--primary)":"var(--border)" }}>
                  {cat === "all" ? "All Categories" : cat}
                </button>
              ))}
            </div>
          </div>

          {warehouses.length === 0 ? (
            <div className="deji-card p-12 text-center"><div className="text-5xl mb-3">🗺</div><p style={{ color:"var(--text-muted)" }}>Add warehouses first.</p></div>
          ) : filteredInventory.length === 0 ? (
            <div className="deji-card p-12 text-center"><div className="text-5xl mb-3">📦</div><p style={{ color:"var(--text-muted)" }}>No products match your search.</p></div>
          ) : (
            <div className="space-y-3">
              {warehouses.map(wh => {
                const whStocks   = wh.warehouseStocks || [];
                const isExpanded = expandedWH === wh.id;
                const isDefWH    = defaultWH?.id === wh.id;
                const totalUnits = whStocks.reduce((s,ws) => s+ws.quantity, 0);
                const lowCount   = whStocks.filter(ws => ws.quantity <= (ws.product?.lowStockThreshold||5) && ws.quantity > 0).length;
                const outCount   = whStocks.filter(ws => ws.quantity <= 0).length;
                const grouped    = {};
                whStocks.forEach(ws => {
                  const cat = ws.product?.category || "Uncategorised";
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push(ws);
                });

                return (
                  <div key={wh.id} className="deji-card overflow-hidden">
                    <button className="w-full flex items-center justify-between p-4 text-left"
                      onClick={() => setExpandedWH(isExpanded ? null : wh.id)}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{TYPE_INFO[wh.type]?.icon||"🏭"}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>{wh.name}</p>
                            {isDefWH && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:"rgba(34,197,94,0.15)",color:"#22c55e"}}>⚡ Default</span>}
                            {wh.country !== "Nigeria" && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{background:"rgba(59,130,246,0.1)",color:"#3b82f6"}}>🌍 {wh.country}</span>}
                          </div>
                          <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                            {wh.city ? `${wh.city} · ` : ""}{whStocks.length} products · {totalUnits.toLocaleString()} units
                            {lowCount > 0 && <span className="text-orange-400 ml-2">· {lowCount} low</span>}
                            {outCount > 0 && <span className="text-red-400 ml-2">· {outCount} out</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex gap-4 text-center">
                          <div><p className="text-sm font-bold" style={{color:"var(--text-primary)"}}>{whStocks.length}</p><p className="text-[10px]" style={{color:"var(--text-muted)"}}>Products</p></div>
                          <div><p className="text-sm font-bold" style={{color:"var(--text-primary)"}}>{totalUnits.toLocaleString()}</p><p className="text-[10px]" style={{color:"var(--text-muted)"}}>Units</p></div>
                        </div>
                        {isExpanded ? <ChevronUp size={16} style={{color:"var(--text-muted)"}}/> : <ChevronDown size={16} style={{color:"var(--text-muted)"}}/>}
                      </div>
                    </button>

                    {isExpanded && (
                      <div style={{ borderTop:"1px solid var(--border)" }}>
                        {whStocks.length === 0 ? (
                          <div className="p-8 text-center">
                            <div className="text-3xl mb-2">📦</div>
                            <p className="text-sm mb-3" style={{ color:"var(--text-muted)" }}>No stock here yet.</p>
                            <button onClick={() => { setTransfer(p=>({...p, toWarehouse: wh.id})); setShowTransfer(true); setError(""); }}
                              className="btn-secondary text-xs flex items-center gap-1 mx-auto">
                              <ArrowRightLeft size={11}/> Transfer stock here
                            </button>
                          </div>
                        ) : Object.entries(grouped).map(([cat, items]) => (
                          <div key={cat}>
                            <div className="px-4 py-2" style={{ background:"var(--bg-hover)", borderBottom:"1px solid var(--border)" }}>
                              <p className="text-xs font-bold uppercase tracking-widest" style={{ color:"var(--text-muted)" }}>{cat}</p>
                            </div>
                            <div className="divide-y" style={{ borderColor:"var(--border)" }}>
                              {items.map(ws => {
                                const prod     = ws.product;
                                const qty      = ws.quantity;
                                const low      = qty <= (prod?.lowStockThreshold||5) && qty > 0;
                                const out      = qty <= 0;
                                const cf       = prod?.customFields || {};
                                const variants = getProductVariants(prod);
                                return (
                                  <div key={ws.id} className="px-4 py-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        {prod?.imageUrl
                                          ? <img src={prod.imageUrl} alt={prod.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" style={{border:"1px solid var(--border)"}}/>
                                          : <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm" style={{background:"var(--bg-hover)"}}>📦</div>
                                        }
                                        <div>
                                          <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{prod?.name||"Unknown"}</p>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {prod?.sku  && <span className="text-[10px]" style={{ color:"var(--text-muted)" }}>SKU: {prod.sku}</span>}
                                            {prod?.unit && <span className="text-[10px]" style={{ color:"var(--text-muted)" }}>· {prod.unit}</span>}
                                            {cf.brand   && <span className="text-[10px]" style={{ color:"var(--text-muted)" }}>· {cf.brand}</span>}
                                            {variants.length > 0 && (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{background:"rgba(99,102,241,0.1)",color:"#6366f1"}}>
                                                {variants.length} {cf.variantLabel||"variants"}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <p className={`text-sm font-bold ${out?"text-red-400":low?"text-orange-400":"text-green-400"}`}>
                                            {qty} {prod?.unit||"units"}
                                          </p>
                                          {out && <p className="text-[10px] text-red-400">Out of stock</p>}
                                          {low && !out && <p className="text-[10px] text-orange-400">Low stock</p>}
                                        </div>
                                        <button onClick={() => { setTransfer(p=>({...p, fromWarehouse: wh.id, productId: prod?.id||""})); setShowTransfer(true); setError(""); }}
                                          className="p-1.5 rounded-lg transition-all" style={{color:"var(--text-muted)"}} title="Transfer">
                                          <ArrowRightLeft size={13}/>
                                        </button>
                                      </div>
                                    </div>
                                    {variants.length > 0 && <VariantBreakdown prod={prod} indent="ml-12"/>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Cross-warehouse matrix */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:"var(--text-muted)" }}>📊 Cross-Warehouse Matrix</p>
                <div className="deji-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="deji-table w-full">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Category</th>
                          {warehouses.map(wh => (
                            <th key={wh.id} className="text-center">
                              <p className="flex items-center justify-center gap-1">
                                {wh.isDefault && <span>⚡</span>}
                                {wh.country !== "Nigeria" && <span>🌍</span>}
                                {wh.name}
                              </p>
                              <p className="text-[10px] font-normal opacity-60">{wh.city||wh.country}</p>
                            </th>
                          ))}
                          <th className="text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory.slice(0,100).map(prod => {
                          const variants   = getProductVariants(prod);
                          const totalStock = variants.length
                            ? variants.reduce((s,v) => s+(Number(v.stock)||0), 0)
                            : (prod.stock || 0);
                          return (
                            <tr key={prod.id}>
                              <td>
                                <div className="flex items-center gap-2">
                                  {prod.imageUrl
                                    ? <img src={prod.imageUrl} className="w-7 h-7 rounded-lg object-cover flex-shrink-0"/>
                                    : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0" style={{background:"var(--bg-hover)"}}>📦</div>
                                  }
                                  <div>
                                    <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{prod.name}</p>
                                    {variants.length > 0 && (
                                      <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>
                                        {variants.map(v => `${v.name}:${v.stock||0}`).join(" · ")}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td><span className="text-xs" style={{color:"var(--text-muted)"}}>{prod.category||"—"}</span></td>
                              {warehouses.map(wh => {
                                const ws  = prod.warehouseStocks?.find(s => s.warehouseId === wh.id);
                                const qty = ws?.quantity ?? 0;
                                return (
                                  <td key={wh.id} className="text-center">
                                    <span className={`text-sm font-bold ${qty<=0?"text-red-400":qty<=5?"text-orange-400":"text-green-400"}`}>{qty}</span>
                                  </td>
                                );
                              })}
                              <td className="text-center">
                                <span className="text-sm font-bold" style={{ color:"var(--text-primary)" }}>{totalStock}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW STOCK MODAL */}
      {showStockView && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowStockView(null)}>
          <div className="deji-card p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold" style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>{showStockView.name}</h2>
                  {defaultWH?.id === showStockView.id && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:"rgba(34,197,94,0.15)",color:"#22c55e"}}>⚡ Default</span>}
                </div>
                <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                  {TYPE_INFO[showStockView.type]?.icon} {TYPE_INFO[showStockView.type]?.label}
                  {showStockView.city ? ` · ${showStockView.city},` : " ·"} {showStockView.country}
                </p>
              </div>
              <button onClick={() => setShowStockView(null)} style={{ color:"var(--text-muted)" }}><X size={18}/></button>
            </div>

            {(showStockView.warehouseStocks||[]).length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📦</div>
                <p style={{ color:"var(--text-muted)" }}>No stock assigned to this location yet.</p>
              </div>
            ) : (() => {
              const grouped = {};
              (showStockView.warehouseStocks||[]).forEach(ws => {
                const cat = ws.product?.category || "Uncategorised";
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(ws);
              });
              return Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:"var(--text-muted)" }}>{cat}</p>
                  <div className="space-y-2">
                    {items.map(ws => {
                      const prod     = ws.product;
                      const qty      = ws.quantity;
                      const cf       = prod?.customFields || {};
                      const variants = getProductVariants(prod);
                      const low      = qty <= (prod?.lowStockThreshold||5) && qty > 0;
                      const out      = qty <= 0;
                      return (
                        <div key={ws.id} className="p-3 rounded-xl" style={{ background:"var(--bg-hover)" }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {prod?.imageUrl
                                ? <img src={prod.imageUrl} className="w-8 h-8 rounded-lg object-cover"/>
                                : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{background:"var(--border)"}}>📦</div>
                              }
                              <div>
                                <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{prod?.name||"Unknown"}</p>
                                <div className="flex gap-2 flex-wrap">
                                  {prod?.sku && <span className="text-[10px]" style={{ color:"var(--text-muted)" }}>{prod.sku}</span>}
                                  {cf.brand  && <span className="text-[10px]" style={{ color:"var(--text-muted)" }}>· {cf.brand}</span>}
                                  {variants.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{background:"rgba(99,102,241,0.1)",color:"#6366f1"}}>{variants.length} variants</span>}
                                </div>
                              </div>
                            </div>
                            <span className={`text-sm font-bold ${out?"text-red-400":low?"text-orange-400":"text-green-400"}`}>
                              {qty} {prod?.unit||"units"}
                            </span>
                          </div>
                          {variants.length > 0 && <VariantBreakdown prod={prod} indent="ml-10"/>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowTransfer(false)}>
          <div className="deji-card p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>Transfer Stock</h2>
              <button onClick={() => setShowTransfer(false)} style={{ color:"var(--text-muted)" }}><X size={18}/></button>
            </div>
            {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444" }}>⚠ {error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="deji-label">From Warehouse *</label>
                  <select value={transfer.fromWarehouse} onChange={e=>setTransfer(p=>({...p,fromWarehouse:e.target.value,productId:"",variantId:"",variantName:""}))} className="deji-input">
                    <option value="">Select source...</option>
                    {warehouses.filter(w=>w.isActive!==false).map(w=>(
                      <option key={w.id} value={w.id}>{w.isDefault?"⚡ ":""}{w.name} ({w.country})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="deji-label">To Warehouse *</label>
                  <select value={transfer.toWarehouse} onChange={e=>setTransfer(p=>({...p,toWarehouse:e.target.value}))} className="deji-input">
                    <option value="">Select destination...</option>
                    {warehouses.filter(w=>w.isActive!==false&&w.id!==transfer.fromWarehouse).map(w=>(
                      <option key={w.id} value={w.id}>{w.name} ({w.country})</option>
                    ))}
                  </select>
                </div>
              </div>

              {transfer.fromWarehouse && transfer.toWarehouse && (() => {
                const from = warehouses.find(w=>w.id===transfer.fromWarehouse);
                const to   = warehouses.find(w=>w.id===transfer.toWarehouse);
                const intl = from?.country !== to?.country;
                return (
                  <div className="p-3 rounded-2xl flex items-center justify-center gap-3" style={{ background:"var(--bg-hover)" }}>
                    <span className="text-xs font-bold" style={{ color:"var(--primary)" }}>{TYPE_INFO[from?.type]?.icon} {from?.name}</span>
                    <span style={{ color:"var(--text-muted)" }}>{intl?"✈️ →":"🚚 →"}</span>
                    <span className="text-xs font-bold" style={{ color:"var(--primary)" }}>{TYPE_INFO[to?.type]?.icon} {to?.name}</span>
                    {intl && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background:"rgba(59,130,246,0.1)", color:"#3b82f6" }}>🌍 Cross-border</span>}
                  </div>
                );
              })()}

              <div>
                <label className="deji-label">Product *</label>
                <select value={transfer.productId} onChange={e=>setTransfer(p=>({...p,productId:e.target.value,variantId:"",variantName:""}))} className="deji-input">
                  <option value="">Select product...</option>
                  {(() => {
                    const fromWH = warehouses.find(w=>w.id===transfer.fromWarehouse);
                    const prods = transfer.fromWarehouse
                      ? (fromWH?.warehouseStocks||[]).filter(ws=>ws.quantity>0).map(ws=>ws.product).filter(Boolean)
                      : inventory.filter(p=>p.type!=="bundle");
                    return prods.map(p => {
                      const fromWH2 = warehouses.find(w => w.id === transfer.fromWarehouse);
                      const ws = fromWH2?.warehouseStocks?.find(s => s.productId === p.id);
                      const stockQty = ws?.quantity ?? p.stock ?? 0;
                      return (
                        <option key={p.id} value={p.id}>{p.name} · {p.category||""} · stock: {stockQty}</option>
                      );
                    });
                  })()}
                </select>
                {transfer.fromWarehouse && <p className="text-[10px] mt-1" style={{color:"var(--text-muted)"}}>Showing products in selected source warehouse</p>}
              </div>

              <div>
                <label className="deji-label">Quantity *</label>
                <input type="number" min="1" value={transfer.quantity}
                  onChange={e=>setTransfer(p=>({...p,quantity:e.target.value}))} className="deji-input"/>
                {transfer.productId && (() => {
                  const fromWH = warehouses.find(w => w.id === transfer.fromWarehouse);
                  const ws = fromWH?.warehouseStocks?.find(s => s.productId === transfer.productId);
                  const availableStock = ws?.quantity ?? 0;
                  const prod = inventory.find(p => p.id === transfer.productId);
                  const variants = getProductVariants(prod);
                  const hasVariants = variants.length > 0;
                  return (
                    <>
                      <p className="text-xs mt-1" style={{ color: Number(transfer.quantity)>availableStock?"#ef4444":"var(--text-muted)" }}>
                        Warehouse stock: {availableStock} units{Number(transfer.quantity)>availableStock&&" — ⚠ Exceeds available stock"}
                      </p>
                      {hasVariants && (
                        <div className="mt-3">
                          <label className="deji-label">Variant (optional)</label>
                          <select value={transfer.variantId||""}
                            onChange={e=>setTransfer(p=>({...p,variantId:e.target.value,variantName:variants.find(v=>v.id===e.target.value)?.name||""}))}
                            className="deji-input">
                            <option value="">All variants (transfer total qty)</option>
                            {variants.map(v=>(
                              <option key={v.id} value={v.id}>{v.name} — {v.stock||0} units</option>
                            ))}
                          </select>
                          <p className="text-[10px] mt-1" style={{color:"var(--text-muted)"}}>Select a variant to track which was transferred</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="p-4 rounded-2xl space-y-3" style={{ background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.15)" }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color:"#f97316" }}>🚚 Logistics Cost</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="deji-label">Delivery Fee (₦)</label>
                    <input type="number" min="0" value={transfer.deliveryFee}
                      onChange={e=>setTransfer(p=>({...p,deliveryFee:e.target.value}))} className="deji-input" placeholder="0"/>
                  </div>
                  <div>
                    <label className="deji-label">Carrier</label>
                    <input value={transfer.carrier} onChange={e=>setTransfer(p=>({...p,carrier:e.target.value}))}
                      className="deji-input" placeholder="DHL, GIG, Fastway..."/>
                  </div>
                </div>
                <div>
                  <label className="deji-label">Tracking Number</label>
                  <input value={transfer.trackingNumber} onChange={e=>setTransfer(p=>({...p,trackingNumber:e.target.value}))}
                    className="deji-input" placeholder="Optional"/>
                </div>
                {Number(transfer.deliveryFee)>0&&<p className="text-xs text-orange-400">₦{Number(transfer.deliveryFee).toLocaleString()} logged as a Logistics expense.</p>}
              </div>

              <div>
                <label className="deji-label">Notes</label>
                <textarea value={transfer.notes} onChange={e=>setTransfer(p=>({...p,notes:e.target.value}))}
                  className="deji-input resize-none" rows={2} placeholder="e.g. Batch #3, urgent restocking..."/>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={()=>setShowTransfer(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={submitTransfer} disabled={savingTx} className="btn-primary flex-1">
                  {savingTx?"Processing...":"Transfer Stock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT WAREHOUSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={()=>{setShowModal(false);setEditWH(null);}}>
          <div className="deji-card p-6 w-full max-w-xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
                {editWH?"Edit Warehouse":"Add Warehouse"}
              </h2>
              <button onClick={()=>{setShowModal(false);setEditWH(null);}} style={{ color:"var(--text-muted)" }}><X size={18}/></button>
            </div>
            {error&&<div className="mb-4 p-3 rounded-xl text-sm" style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444" }}>⚠ {error}</div>}
            <form onSubmit={saveWarehouse} className="space-y-4">
              <div>
                <label className="deji-label">Warehouse Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {WAREHOUSE_TYPES.map(t => (
                    <button key={t.value} type="button" onClick={()=>setForm(p=>({...p,type:t.value}))}
                      className="p-3 rounded-xl text-left border transition-all"
                      style={{ borderColor:form.type===t.value?"var(--primary)":"var(--border)", background:form.type===t.value?"var(--primary-dim)":"transparent" }}>
                      <p className="text-lg mb-0.5">{t.icon}</p>
                      <p className="text-xs font-bold" style={{ color:"var(--text-primary)" }}>{t.label}</p>
                      <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="deji-label">Warehouse Name *</label>
                  <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                    className="deji-input" required placeholder="e.g. Lagos Main, Dubai Hub"/>
                </div>
                <div>
                  <label className="deji-label">Short Code</label>
                  <input value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} className="deji-input" placeholder="LGS, DXB"/>
                </div>
                <div>
                  <label className="deji-label">Country *</label>
                  <select value={form.country} onChange={e=>setForm(p=>({...p,country:e.target.value}))} className="deji-input">
                    {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="deji-label">City</label>
                  <input value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))} className="deji-input" placeholder="Lagos, Dubai..."/>
                </div>
                <div>
                  <label className="deji-label">Currency</label>
                  <select value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))} className="deji-input">
                    {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="deji-label">Default Delivery Fee (₦)</label>
                  <input type="number" min="0" value={form.defaultDeliveryFee} onChange={e=>setForm(p=>({...p,defaultDeliveryFee:e.target.value}))} className="deji-input" placeholder="0"/>
                </div>
                <div className="col-span-2">
                  <label className="deji-label">Address</label>
                  <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} className="deji-input" placeholder="Full warehouse address"/>
                </div>
              </div>
              <div style={{ borderTop:"1px solid var(--border)", paddingTop:"1rem" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:"var(--text-muted)" }}>Contact Person</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="deji-label">Name</label><input value={form.contactName} onChange={e=>setForm(p=>({...p,contactName:e.target.value}))} className="deji-input" placeholder="Warehouse manager"/></div>
                  <div><label className="deji-label">Phone</label><input value={form.contactPhone} onChange={e=>setForm(p=>({...p,contactPhone:e.target.value}))} className="deji-input" placeholder="+234..."/></div>
                  <div className="col-span-2"><label className="deji-label">Email</label><input type="email" value={form.contactEmail} onChange={e=>setForm(p=>({...p,contactEmail:e.target.value}))} className="deji-input" placeholder="warehouse@email.com"/></div>
                </div>
              </div>
              <div>
                <label className="deji-label">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="deji-input resize-none" rows={2} placeholder="e.g. Open Mon-Fri..."/>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl" style={{ background:"var(--bg-hover)" }}>
                <input type="checkbox" checked={form.isActive} onChange={e=>setForm(p=>({...p,isActive:e.target.checked}))} className="accent-green-500 w-4 h-4"/>
                <div>
                  <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>Active Warehouse</p>
                  <p className="text-xs" style={{ color:"var(--text-muted)" }}>Inactive locations are hidden from transfers</p>
                </div>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>{setShowModal(false);setEditWH(null);}} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving?"Saving...":editWH?"Update Warehouse":"Create Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function WarehouseCard({ wh, onEdit, onDelete, onView, onSetDefault, onTransfer, isDefault = false }) {
  const info     = TYPE_INFO[wh.type] || TYPE_INFO.local;
  const stocks   = wh.warehouseStocks || [];
  const totalQty = stocks.reduce((s,ws) => s+(ws.quantity||0), 0);
  const lowItems = stocks.filter(ws => ws.quantity>0 && ws.quantity<=(ws.product?.lowStockThreshold||5)).length;
  const outItems = stocks.filter(ws => ws.quantity<=0).length;
  const categories = [...new Set(stocks.map(ws=>ws.product?.category).filter(Boolean))];

  return (
    <div className="deji-card p-5 space-y-4" style={{ opacity:wh.isActive===false?0.55:1 }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background:"var(--bg-hover)" }}>{info.icon}</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>{wh.name}</p>
              {isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:"rgba(34,197,94,0.15)",color:"#22c55e"}}>⚡ Default</span>}
            </div>
            <p className="text-xs" style={{ color:"var(--text-muted)" }}>{info.label} · {wh.city?`${wh.city}, `:""}{wh.country}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={()=>onView(wh)} className="p-1.5 rounded-lg" style={{ color:"var(--text-muted)" }} title="View stock"><Eye size={14}/></button>
          <button onClick={()=>onEdit(wh)} className="p-1.5 rounded-lg" style={{ color:"var(--text-muted)" }} title="Edit"><Edit size={14}/></button>
          <button onClick={onTransfer} className="p-1.5 rounded-lg" style={{ color:"var(--text-muted)" }} title="Transfer"><ArrowRightLeft size={14}/></button>
          {!isDefault && <button onClick={()=>onSetDefault(wh)} className="p-1.5 rounded-lg" style={{ color:"var(--text-muted)" }} title="Set as default">⚡</button>}
          <button onClick={()=>onDelete(wh)} className="p-1.5 rounded-lg" style={{ color: isDefault?"#ef444460":"var(--text-muted)" }} title={isDefault?"Cannot delete default":"Delete"}><Trash2 size={14}/></button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl text-center" style={{ background:"var(--bg-hover)" }}>
          <p className="text-sm font-bold" style={{ color:"var(--text-primary)" }}>{stocks.length}</p>
          <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>Products</p>
        </div>
        <div className="p-2.5 rounded-xl text-center" style={{ background:"var(--bg-hover)" }}>
          <p className="text-sm font-bold" style={{ color:"var(--text-primary)" }}>{totalQty.toLocaleString()}</p>
          <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>Units</p>
        </div>
        <div className="p-2.5 rounded-xl text-center" style={{ background: lowItems>0?"rgba(249,115,22,0.08)":outItems>0?"rgba(239,68,68,0.08)":"var(--bg-hover)" }}>
          <p className="text-sm font-bold" style={{ color: lowItems>0?"#f97316":outItems>0?"#ef4444":"var(--text-primary)" }}>{lowItems||outItems}</p>
          <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>{outItems>0?"Out of Stock":"Low Stock"}</p>
        </div>
      </div>
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {categories.slice(0,4).map(cat=>(
            <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}>{cat}</span>
          ))}
          {categories.length > 4 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}>+{categories.length-4} more</span>}
        </div>
      )}
      <div className="flex items-center justify-between pt-1" style={{ borderTop:"1px solid var(--border)" }}>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${wh.isActive!==false?"bg-green-400":"bg-gray-500"}`}/>
          <span className="text-[10px]" style={{ color:"var(--text-muted)" }}>{wh.isActive!==false?"Active":"Inactive"}</span>
        </div>
        {wh.currency && wh.currency!=="NGN" && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background:"rgba(59,130,246,0.1)", color:"#3b82f6" }}>{wh.currency}</span>}
        {wh.contactName && <span className="text-[10px]" style={{ color:"var(--text-muted)" }}>📋 {wh.contactName}</span>}
      </div>
    </div>
  );
}