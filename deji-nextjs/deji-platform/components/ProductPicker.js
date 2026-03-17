// deji-nextjs/deji-platform/components/ProductPicker.js
// Reusable product + variant + warehouse picker
// Used in: Lead edit modal, Finance invoice line items

"use client";
import { useState, useEffect } from "react";
import { Search, Package, ChevronDown, X } from "lucide-react";
import api from "@/lib/api";

// Fetch products with variants and warehouse stock
async function fetchInventory() {
  const [prodRes, whRes] = await Promise.allSettled([
    api.get("/products?limit=500"),
    api.get("/warehouses"),
  ]);
  const products   = prodRes.status === "fulfilled"
    ? (Array.isArray(prodRes.value?.data) ? prodRes.value.data
      : Array.isArray(prodRes.value?.data?.data) ? prodRes.value.data.data
      : prodRes.value?.data?.products || [])
    : [];
  const warehouses = whRes.status === "fulfilled"
    ? (Array.isArray(whRes.value?.data) ? whRes.value.data : [])
    : [];
  return { products, warehouses };
}

// ── Single product line picker ────────────────────────────────────────────────
// Props:
//   value        = { productId, productName, variantId, variantName, warehouseId, warehouseName, quantity, unitPrice }
//   onChange     = (newValue) => void
//   showWarehouse = true/false
//   label        = string (optional header)
export function ProductLinePicker({ value = {}, onChange, showWarehouse = true, label = "Product" }) {
  const [inventory,  setInventory]  = useState({ products: [], warehouses: [] });
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [open,       setOpen]       = useState(false);

  useEffect(() => {
    fetchInventory().then(data => { setInventory(data); setLoading(false); });
  }, []);

  const selectedProduct  = inventory.products.find(p => p.id === value.productId);
  const availableVariants = selectedProduct?.variants?.filter(v => v.isActive !== false) || [];

  // Warehouses that have stock of selected product
  const warehousesWithStock = inventory.warehouses.filter(wh => {
    if (!value.productId) return true;
    const ws = (wh.warehouseStocks || []).find(s => s.productId === value.productId);
    return ws && ws.quantity > 0;
  });

  const filteredProducts = inventory.products.filter(p =>
    p.type !== "service" &&
    p.isActive !== false &&
    (!search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()))
  );

  const selectProduct = (prod) => {
    const variants = prod.variants?.filter(v => v.isActive !== false) || [];
    const firstVariant = variants[0];
    const price = firstVariant?.sellingPrice || prod.price || 0;

    // Find warehouse with stock
    const wh = inventory.warehouses.find(w =>
      (w.warehouseStocks || []).some(s => s.productId === prod.id && s.quantity > 0)
    ) || inventory.warehouses.find(w => w.isDefault);

    onChange({
      ...value,
      productId:    prod.id,
      productName:  prod.name,
      sku:          prod.sku || "",
      category:     prod.category || "",
      variantId:    firstVariant?.id    || "",
      variantName:  firstVariant?.name  || "",
      warehouseId:  wh?.id   || "",
      warehouseName:wh?.name || "",
      unitPrice:    price,
      quantity:     value.quantity || 1,
      description:  firstVariant
        ? `${prod.name} — ${firstVariant.name}`
        : prod.name,
    });
    setOpen(false);
    setSearch("");
  };

  const selectVariant = (variant) => {
    onChange({
      ...value,
      variantId:   variant.id,
      variantName: variant.name,
      unitPrice:   variant.sellingPrice || selectedProduct?.price || value.unitPrice || 0,
      description: `${selectedProduct?.name} — ${variant.name}`,
    });
  };

  const selectWarehouse = (wh) => {
    // Get available stock for this product/variant in this warehouse
    const ws = (wh.warehouseStocks || []).find(s => s.productId === value.productId);
    onChange({
      ...value,
      warehouseId:   wh.id,
      warehouseName: wh.name,
      maxStock:      ws?.quantity || 0,
    });
  };

  const clear = () => {
    onChange({ productId:"", productName:"", variantId:"", variantName:"", warehouseId:"", warehouseName:"", unitPrice:0, quantity:1, description:"" });
  };

  // Stock info for selected product in selected warehouse
  const selectedWH = inventory.warehouses.find(w => w.id === value.warehouseId);
  const warehouseStock = selectedWH
    ? (selectedWH.warehouseStocks || []).find(s => s.productId === value.productId)?.quantity ?? 0
    : 0;

  return (
    <div className="space-y-2">
      {label && <label className="deji-label">{label}</label>}

      {/* Product selector */}
      <div className="relative">
        <button type="button"
          onClick={() => setOpen(o => !o)}
          className="deji-input w-full text-left flex items-center justify-between gap-2"
          style={{color: value.productId ? "var(--text-primary)" : "var(--text-muted)"}}>
          <div className="flex items-center gap-2 min-w-0">
            <Package size={13} style={{color:"var(--text-muted)", flexShrink:0}}/>
            <span className="truncate text-sm">
              {value.productId ? value.productName || "Product selected" : "Select product..."}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {value.productId && (
              <span onClick={e=>{e.stopPropagation();clear();}}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500/20"
                style={{color:"var(--text-muted)"}}>
                <X size={10}/>
              </span>
            )}
            <ChevronDown size={13} style={{color:"var(--text-muted)"}}/>
          </div>
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden shadow-2xl"
            style={{background:"var(--bg-card)", border:"1px solid var(--border)", maxHeight:280}}>
            <div className="p-2" style={{borderBottom:"1px solid var(--border)"}}>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
                <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg outline-none"
                  style={{background:"var(--bg-hover)", color:"var(--text-primary)"}}/>
              </div>
            </div>
            <div className="overflow-y-auto" style={{maxHeight:220}}>
              {loading ? (
                <p className="text-xs p-3 text-center" style={{color:"var(--text-muted)"}}>Loading...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-xs p-3 text-center" style={{color:"var(--text-muted)"}}>No products found</p>
              ) : filteredProducts.map(prod => {
                const totalStock = prod.variants?.length
                  ? prod.variants.reduce((s,v) => s+(Number(v.stock)||0), 0)
                  : (prod.stock || 0);
                const outOfStock = totalStock <= 0;
                return (
                  <button key={prod.id} type="button"
                    onClick={() => !outOfStock && selectProduct(prod)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                    style={{
                      background: value.productId===prod.id ? "var(--primary-dim)" : "transparent",
                      opacity: outOfStock ? 0.45 : 1,
                      cursor: outOfStock ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.background="var(--bg-hover)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = value.productId===prod.id ? "var(--primary-dim)" : "transparent"; }}>
                    {prod.imageUrl
                      ? <img src={prod.imageUrl} className="w-8 h-8 rounded-lg object-cover flex-shrink-0"/>
                      : <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                          style={{background:"var(--bg-hover)"}}>📦</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{color:"var(--text-primary)"}}>{prod.name}</p>
                      <p className="text-[10px]" style={{color:"var(--text-muted)"}}>
                        {prod.category && <span>{prod.category} · </span>}
                        {prod.sku && <span>SKU: {prod.sku} · </span>}
                        {prod.variants?.length
                          ? <span>{prod.variants.length} variants</span>
                          : <span>{totalStock} in stock</span>
                        }
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold" style={{color:"var(--primary)"}}>
                        ₦{Number(prod.price||0).toLocaleString()}
                      </p>
                      <p className={`text-[10px] font-semibold ${outOfStock?"text-red-400":totalStock<=5?"text-orange-400":"text-green-400"}`}>
                        {outOfStock ? "Out of stock" : `${totalStock} units`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Variant selector — only shown if product has variants */}
      {value.productId && availableVariants.length > 0 && (
        <div>
          <label className="deji-label">Variant</label>
          <select
            value={value.variantId || ""}
            onChange={e => {
              const v = availableVariants.find(v => v.id === e.target.value);
              if (v) selectVariant(v);
            }}
            className="deji-input">
            <option value="">All variants</option>
            {availableVariants.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.stock||0} units{v.sellingPrice ? ` · ₦${Number(v.sellingPrice).toLocaleString()}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Warehouse selector */}
      {showWarehouse && value.productId && (
        <div>
          <label className="deji-label">Dispatch from Warehouse</label>
          <select
            value={value.warehouseId || ""}
            onChange={e => {
              const wh = inventory.warehouses.find(w => w.id === e.target.value);
              if (wh) selectWarehouse(wh);
            }}
            className="deji-input">
            <option value="">Auto (highest stock)</option>
            {inventory.warehouses.filter(w => w.isActive !== false).map(wh => {
              const ws = (wh.warehouseStocks || []).find(s => s.productId === value.productId);
              const qty = ws?.quantity ?? 0;
              return (
                <option key={wh.id} value={wh.id} disabled={qty <= 0}>
                  {wh.isDefault ? "⚡ " : ""}{wh.name} ({wh.country}) — {qty} units{qty <= 0 ? " [Out of stock]" : ""}
                </option>
              );
            })}
          </select>
          {value.warehouseId && (
            <p className="text-[10px] mt-1"
              style={{color: warehouseStock <= 5 ? "#f97316" : "var(--text-muted)"}}>
              {warehouseStock <= 0
                ? "⚠ No stock at this warehouse"
                : warehouseStock <= 5
                  ? `⚠ Low stock: ${warehouseStock} units remaining`
                  : `✓ ${warehouseStock} units available`
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Multi-item picker for invoice line items ───────────────────────────────────
// Props:
//   items    = [{ description, quantity, unitPrice, productId, variantId, warehouseId, ... }]
//   onChange = (newItems) => void
export function InvoiceItemsPicker({ items = [], onChange }) {
  const [inventory, setInventory] = useState({ products: [], warehouses: [] });

  useEffect(() => {
    fetchInventory().then(setInventory);
  }, []);

  const updateItem = (index, updates) => {
    onChange(items.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const addItem = () => {
    onChange([...items, { description: "", quantity: 1, unitPrice: "", productId: "", variantId: "", warehouseId: "" }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="p-3 rounded-xl space-y-2"
          style={{background:"var(--bg-hover)", border:"1px solid var(--border)"}}>

          {/* Product picker for this line */}
          <ProductLinePicker
            value={{
              productId:    item.productId    || "",
              productName:  item.productName  || "",
              variantId:    item.variantId    || "",
              variantName:  item.variantName  || "",
              warehouseId:  item.warehouseId  || "",
              warehouseName:item.warehouseName|| "",
              unitPrice:    item.unitPrice    || "",
              quantity:     item.quantity     || 1,
            }}
            onChange={val => updateItem(i, {
              productId:    val.productId,
              productName:  val.productName,
              variantId:    val.variantId,
              variantName:  val.variantName,
              warehouseId:  val.warehouseId,
              warehouseName:val.warehouseName,
              unitPrice:    val.unitPrice,
              description:  val.description || item.description,
            })}
            showWarehouse={true}
            label={`Line Item ${i + 1}`}
          />

          {/* Description, Qty, Price row */}
          <div className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-6">
              <label className="deji-label">Description *</label>
              <input
                value={item.description}
                onChange={e => updateItem(i, { description: e.target.value })}
                className="deji-input text-sm"
                placeholder="Item description"/>
            </div>
            <div className="col-span-2">
              <label className="deji-label">Qty</label>
              <input
                type="number" min="1"
                value={item.quantity}
                onChange={e => updateItem(i, { quantity: e.target.value })}
                className="deji-input text-sm text-center"/>
            </div>
            <div className="col-span-3">
              <label className="deji-label">Unit Price (₦)</label>
              <input
                type="number"
                value={item.unitPrice}
                onChange={e => updateItem(i, { unitPrice: e.target.value })}
                className="deji-input text-sm"
                placeholder="0"/>
            </div>
            <div className="col-span-1 flex items-end justify-center pb-1">
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10">
                  <X size={13}/>
                </button>
              )}
            </div>
          </div>

          {/* Line total */}
          {item.quantity && item.unitPrice && (
            <p className="text-xs text-right font-semibold" style={{color:"var(--primary)"}}>
              Line total: ₦{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
            </p>
          )}
        </div>
      ))}

      <button type="button" onClick={addItem}
        className="w-full py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
        style={{border:"1px dashed var(--border)", color:"var(--text-muted)"}}>
        + Add Line Item
      </button>
    </div>
  );
}