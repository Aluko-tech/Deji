"use client";
import { useCurrency } from "@/lib/currencyContext";
import { useState, useEffect, useRef } from "react";
import {
  Plus, Search, X, Edit, Trash2, Upload, Image as ImageIcon,
  AlertTriangle, ChevronDown, ChevronUp, Package, Layers,
  Tag, RefreshCw,
} from "lucide-react";
import {
  getInventory,
  createInventoryProduct,
  updateInventoryProduct,
  deleteInventoryProduct,
  adjustStock,
  uploadImage,
} from "@/lib/api";

const CATEGORIES = [
  "Footwear","Clothing","Accessories","Electronics",
  "Food & Beverage","Health & Beauty","Home & Living",
  "Bags","Jewellery","Sporting Goods","Stationery","Other",
];

const VARIANT_TYPES = [
  { id:"size",    label:"Size",    placeholder:"e.g. S, M, L, XL, 42, 43" },
  { id:"colour",  label:"Colour",  placeholder:"e.g. Red, Black, Navy Blue" },
  { id:"style",   label:"Style",   placeholder:"e.g. Slim Fit, Regular" },
  { id:"material",label:"Material",placeholder:"e.g. Leather, Canvas" },
  { id:"flavour", label:"Flavour", placeholder:"e.g. Chocolate, Vanilla" },
  { id:"custom",  label:"Custom",  placeholder:"Enter variant name" },
];

const UNITS = ["piece","pair","pack","box","kg","g","litre","ml","metre","cm","dozen","carton","roll","set","other"];

const EMPTY = {
  name:"", sku:"", category:"Clothing", barcode:"", brand:"",
  costPrice:"", sellingPrice:"",
  stock:"", lowStockThreshold:5,
  discountType:"none", discountValue:"",
  hasVariants:false, variantType:"colour", customVariantName:"",
  variants:[],
  isBundle:false, bundleItems:[],
  imageUrl:"", description:"",
  unit:"piece", taxRate:"",
};

const EMPTY_VARIANT = { name:"", sku:"", costPrice:"", sellingPrice:"", stock:"", imageUrl:"" };

function safeArray(val) {
  if (Array.isArray(val))           return val;
  if (Array.isArray(val?.data))     return val.data;
  if (Array.isArray(val?.products)) return val.products;
  if (Array.isArray(val?.items))    return val.items;
  if (Array.isArray(val?.results))  return val.results;
  return [];
}

function genSKU(name, variant) {
  const base = (name||"PRD").replace(/\s+/g,"-").toUpperCase().slice(0,6);
  const v    = variant ? "-"+variant.toUpperCase().slice(0,3) : "";
  const rand = Math.random().toString(36).slice(-3).toUpperCase();
  return `${base}${v}-${rand}`;
}

function ProductImage({ value, onChange, size="md" }) {
  const ref = useRef();
  const [uploading, setUploading] = useState(false);
  const dim = size==="sm" ? "w-12 h-12" : "w-20 h-20";

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
    e.target.value = "";
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadImage(fd);
      onChange(res.data?.url || "");
    } catch (err) {
      alert(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative flex-shrink-0">
          <img src={value} alt="product" className={`${dim} rounded-xl object-cover`} style={{border:"1px solid var(--border)"}}/>
          <button type="button" onClick={()=>onChange("")} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center"><X size={8}/></button>
        </div>
      ) : (
        <div onClick={()=>!uploading&&ref.current?.click()} className={`${dim} rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer flex-shrink-0`} style={{borderColor:"var(--border)",color:"var(--text-muted)"}}>
          {uploading ? <RefreshCw size={size==="sm"?12:16} className="animate-spin"/> : <ImageIcon size={size==="sm"?14:18}/>}
          {size!=="sm"&&<span className="text-[10px] mt-1">{uploading?"Uploading…":"Photo"}</span>}
        </div>
      )}
      <div>
        <button type="button" onClick={()=>!uploading&&ref.current?.click()} disabled={uploading}
          className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1">
          {uploading ? <RefreshCw size={10} className="animate-spin"/> : <Upload size={10}/>}
          {uploading ? "Uploading…" : value ? "Change" : "Upload"}
        </button>
        {size!=="sm"&&<p className="text-[10px] mt-1" style={{color:"var(--text-muted)"}}>PNG/JPG max 5MB</p>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
    </div>
  );
}

function StockBadge({p}) {
  if (p.isBundle)    return <span className="badge badge-purple text-xs">Bundle</span>;
  if (p.hasVariants) return <span className="badge badge-blue text-xs">Variants</span>;
  const stock = Number(p.stock||0);
  if (stock<=0)                          return <span className="badge badge-red text-xs">Out of Stock</span>;
  if (stock<=(p.lowStockThreshold||5))   return <span className="badge badge-orange text-xs">Low Stock</span>;
  return <span className="badge badge-green text-xs">In Stock</span>;
}

function getMe() {
  if (typeof window === "undefined") return { role: "admin" };
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return { role: "admin" }; }
}

export default function InventoryPage() {
  const me = getMe();
  const canEdit   = ["admin","manager","inventory","staff"].includes(me.role);
  const canDelete = ["admin","manager"].includes(me.role);

  const [products,     setProducts]     = useState([]);
  const { format, symbol } = useCurrency();
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState("");
  const [filterCat,    setFilterCat]    = useState("all");
  const [filterStock,  setFilterStock]  = useState("all");
  const [showModal,    setShowModal]    = useState(false);
  const [editProd,     setEditProd]     = useState(null);
  const [form,         setForm]         = useState(EMPTY);
  const [showPurchase, setShowPurchase] = useState(null);
  const [purchase,     setPurchase]     = useState({adjustment:1,costPrice:"",supplier:"",note:""});
  const [bundleSearch, setBundleSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [section,      setSection]      = useState("basic");

  useEffect(()=>{fetchProducts();},[]);

  // Normalize a product from backend schema to frontend shape
  const normalizeProduct = (p) => {
    const cf = p.customFields || {};
    // Prefer DB ProductVariant records; fall back to customFields JSON for legacy data
    const dbVariants = Array.isArray(p.variants) && p.variants.length ? p.variants : null;
    const cfVariants = Array.isArray(cf.variants) && cf.variants.length ? cf.variants : null;
    const variants = (dbVariants || cfVariants || []).map(v => ({
      name:         v.name         || "",
      sku:          v.sku          || "",
      costPrice:    v.costPrice    ?? 0,
      sellingPrice: v.sellingPrice ?? 0,
      stock:        v.stock        ?? 0,
      imageUrl:     v.imageUrl     || "",
    }));
    return {
      ...p,
      sellingPrice:  p.price ?? p.sellingPrice ?? 0,
      brand:         cf.brand         ?? p.brand         ?? "",
      taxRate:       cf.taxRate       ?? p.taxRate       ?? 0,
      discountType:  cf.discountType  ?? p.discountType  ?? "none",
      discountValue: cf.discountValue ?? p.discountValue ?? 0,
      hasVariants:   cf.hasVariants   ?? p.hasVariants   ?? false,
      variantLabel:  cf.variantLabel  ?? p.variantLabel  ?? null,
      variants,
    };
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res  = await getInventory({ limit:500 });
      const raw  = safeArray(res?.data ?? res);
      setProducts(raw.map(normalizeProduct));
    } catch(e) { console.error(e); setProducts([]); }
    finally { setLoading(false); }
  };

  const saveProduct = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if(!form.name.trim()) throw new Error("Product name is required");
      if(Number(form.sellingPrice)<=0) throw new Error("Selling price must be greater than 0");
      const variantLabel = form.variantType==="custom"
        ? (form.customVariantName||"Variant")
        : VARIANT_TYPES.find(v=>v.id===form.variantType)?.label||"Variant";
      // Map frontend form fields to Prisma Product schema fields:
      // Schema uses: name, sku, barcode, category, description, unit,
      //   price (=sellingPrice), costPrice, stock, lowStockThreshold,
      //   imageUrl, type (product/bundle/combo), customFields (JSON for extras)
      const isBundle = form.isBundle || (form.hasVariants && false);
      const productType = form.isBundle ? "bundle" : "product";
      const payload = {
        // ── Core schema fields ──
        name:             form.name.trim(),
        sku:              form.sku.trim() || genSKU(form.name),
        barcode:          form.barcode.trim() || null,
        category:         form.category,
        description:      form.description.trim() || null,
        unit:             form.unit,
        price:            Number(form.sellingPrice) || 0,   // schema field is "price"
        costPrice:        Number(form.costPrice)    || 0,
        stock:            form.hasVariants ? 0 : (Number(form.stock) || 0),
        lowStockThreshold:Number(form.lowStockThreshold) || 5,
        imageUrl:         form.imageUrl || null,
        type:             productType,
        // ── Bundle items (handled by service) ──
        bundleItems:      form.isBundle ? form.bundleItems.map(b => ({
          productId: b.productId, quantity: Number(b.quantity) || 1,
        })) : [],
        // ── Extra fields stored in customFields JSON ──
        // (brand, taxRate, discountType, discountValue, hasVariants, variants)
        customFields: {
          brand:         form.brand.trim() || null,
          taxRate:       Number(form.taxRate) || 0,
          discountType:  form.discountType !== "none" ? form.discountType : null,
          discountValue: form.discountType !== "none" ? (Number(form.discountValue) || 0) : 0,
          hasVariants:   form.hasVariants,
          variantLabel:  form.hasVariants ? variantLabel : null,
          variants:      form.hasVariants ? form.variants.map((v, i) => ({
            name:         v.name,
            sku:          v.sku  || genSKU(form.name, v.name),
            costPrice:    Number(v.costPrice)    || Number(form.costPrice)    || 0,
            sellingPrice: Number(v.sellingPrice) || Number(form.sellingPrice) || 0,
            stock:        Number(v.stock) || 0,
            imageUrl:     v.imageUrl || null,
            sortOrder:    i,
          })) : [],
        },
      };
      editProd ? await updateInventoryProduct(editProd.id,payload) : await createInventoryProduct(payload);
      await fetchProducts();
      closeModal();
    } catch(err) { alert(err.message||"Failed to save product"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if(!confirm("Delete this product? This cannot be undone.")) return;
    try { await deleteInventoryProduct(id); fetchProducts(); } catch(e){alert(e.message);}
  };

  const handlePurchase = async () => {
    if(!showPurchase) return;
    try {
      await adjustStock(showPurchase.id, {
        quantity: Number(purchase.adjustment),   // backend expects "quantity"
        reason:   `Purchase — supplier: ${purchase.supplier||"—"}, cost: ₦${purchase.costPrice||showPurchase.costPrice||0}. ${purchase.note||""}`.trim(),
      });
      await fetchProducts();
      setShowPurchase(null);
      setPurchase({adjustment:1,costPrice:"",supplier:"",note:""});
    } catch(e){alert(e.message);}
  };

  const openEdit = (p) => {
    setEditProd(p);
    // Products are already normalized (sellingPrice, brand, etc. mapped from schema)
    const cf = p.customFields || {};
    setForm({
      name:             p.name             || "",
      sku:              p.sku              || "",
      barcode:          p.barcode          || "",
      brand:            p.brand            || cf.brand || "",
      category:         p.category         || "Clothing",
      description:      p.description      || "",
      unit:             p.unit             || "piece",
      costPrice:        p.costPrice        ?? 0,
      sellingPrice:     p.sellingPrice     ?? p.price ?? 0,
      stock:            p.stock            ?? 0,
      lowStockThreshold:p.lowStockThreshold|| 5,
      taxRate:          p.taxRate          || cf.taxRate || "",
      discountType:     p.discountType     || cf.discountType || "none",
      discountValue:    p.discountValue    || cf.discountValue || "",
      imageUrl:         p.imageUrl         || "",
      hasVariants:      p.hasVariants      || cf.hasVariants || false,
      variantType: (p.variantLabel || cf.variantLabel)
        ? (VARIANT_TYPES.find(v => v.label === (p.variantLabel||cf.variantLabel))?.id || "custom")
        : "colour",
      customVariantName: (p.variantLabel || cf.variantLabel) &&
        !VARIANT_TYPES.find(v => v.label === (p.variantLabel||cf.variantLabel))
        ? (p.variantLabel||cf.variantLabel) : "",
      variants: (p.variants || []).map(v => ({
        name:         v.name         || "",
        sku:          v.sku          || "",
        costPrice:    v.costPrice    ?? 0,
        sellingPrice: v.sellingPrice ?? 0,
        stock:        v.stock        ?? 0,
        imageUrl:     v.imageUrl     || "",
      })),
      isBundle:    p.type === "bundle" || p.isBundle || false,
      bundleItems: p.bundleItems ? p.bundleItems.map(b => ({
        productId: b.productId || b.product?.id,
        name:      b.product?.name || b.name || "",
        quantity:  b.quantity || 1,
      })) : [],
    });
    setSection("basic"); setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditProd(null); setForm(EMPTY); setSection("basic"); setBundleSearch(""); };
  const openNew   = () => { setEditProd(null); setForm(EMPTY); setSection("basic"); setShowModal(true); };

  const addVariant    = () => setForm(p=>({...p,variants:[...p.variants,{...EMPTY_VARIANT}]}));
  const updateVariant = (i,k,v) => setForm(p=>({...p,variants:p.variants.map((vv,j)=>j===i?{...vv,[k]:v}:vv)}));
  const removeVariant = (i) => setForm(p=>({...p,variants:p.variants.filter((_,j)=>j!==i)}));
  const autoFillPrices = () => setForm(p=>({...p,variants:p.variants.map(v=>({...v,costPrice:v.costPrice||p.costPrice,sellingPrice:v.sellingPrice||p.sellingPrice}))}));

  const addBundleItem    = (prod) => { if(form.bundleItems.find(b=>b.productId===prod.id))return; setForm(p=>({...p,bundleItems:[...p.bundleItems,{productId:prod.id,name:prod.name,quantity:1}]})); setBundleSearch(""); };
  const updateBundleQty  = (pid,qty) => setForm(p=>({...p,bundleItems:p.bundleItems.map(b=>b.productId===pid?{...b,quantity:Math.max(1,qty)}:b)}));
  const removeBundleItem = (pid) => setForm(p=>({...p,bundleItems:p.bundleItems.filter(b=>b.productId!==pid)}));

  const outOfStock = products.filter(p=>!p.isBundle&&!p.hasVariants&&p.stock<=0);
  const lowStock   = products.filter(p=>!p.isBundle&&!p.hasVariants&&p.stock>0&&p.stock<=(p.lowStockThreshold||5));
  const stockValue = products.reduce((s, p) => {
  if (p.hasVariants && p.variants?.length) {
    return s + p.variants.reduce((vs, v) => {
      const cost  = parseFloat(v.costPrice)  || 0;
      const stock = parseFloat(v.stock)      || 0;
      return vs + (cost * stock);
    }, 0);
  }
  const cost  = parseFloat(p.costPrice)  || 0;
  const stock = parseFloat(p.stock)      || 0;
  return s + (cost * stock);
}, 0);
  const totalUnits = products.reduce((s,p)=>{
    if(p.hasVariants&&p.variants?.length) return s+p.variants.reduce((vs,v)=>vs+(Number(v.stock)||0),0);
    return s+(Number(p.stock)||0);
  },0);

  const filtered = products.filter(p=>{
    if(filterCat!=="all"&&p.category!==filterCat) return false;
    if(filterStock==="low"&&!(p.stock>0&&p.stock<=(p.lowStockThreshold||5))) return false;
    if(filterStock==="out"&&p.stock!==0) return false;
    if(filterStock==="bundle"&&!p.isBundle) return false;
    if(filterStock==="variants"&&!p.hasVariants) return false;
    if(search){
      const q=search.toLowerCase();
      if(!p.name?.toLowerCase().includes(q)&&!p.sku?.toLowerCase().includes(q)&&
         !p.brand?.toLowerCase().includes(q)&&!p.barcode?.includes(q)&&
         !p.variants?.some(v=>v.name?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const bundleSuggestions = bundleSearch
    ? products.filter(p=>!p.isBundle&&p.name.toLowerCase().includes(bundleSearch.toLowerCase())&&!form.bundleItems.find(b=>b.productId===p.id)).slice(0,5)
    : [];

  const variantTypeLabel = form.variantType==="custom"
    ? (form.customVariantName||"Variant")
    : VARIANT_TYPES.find(v=>v.id===form.variantType)?.label||"Variant";

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{products.length} products · {totalUnits.toLocaleString()} units · {format(stockValue)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchProducts} className="btn-secondary"><RefreshCw size={13}/></button>
          {canEdit && <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={15}/> Add Product</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:"Total Products",value:products.length,             icon:"📦",color:"var(--primary)"},
          {label:"Low Stock",     value:lowStock.length,              icon:"⚠️",color:"#fb923c"       },
          {label:"Out of Stock",  value:outOfStock.length,            icon:"🚫",color:"#ef4444"       },
          {label:"Stock Value",   value:format(stockValue),icon:"💰",color:"#22c55e"    },
        ].map(k=>(
          <div key={k.label} className="kpi-card">
            <div className="text-2xl mb-1">{k.icon}</div>
            <p className="text-xl font-bold" style={{fontFamily:"Syne,sans-serif",color:k.color}}>{k.value}</p>
            <p className="text-xs" style={{color:"var(--text-muted)"}}>{k.label}</p>
          </div>
        ))}
      </div>

      {outOfStock.length>0&&(
        <div className="p-3 rounded-2xl flex items-start gap-3" style={{background:"#ef444418",border:"1px solid #ef4444"}}>
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5"/>
          <p className="text-sm text-red-400"><strong>{outOfStock.length} out of stock:</strong> {outOfStock.map(p=>p.name).join(" · ")}</p>
        </div>
      )}
      {lowStock.length>0&&(
        <div className="p-3 rounded-2xl flex items-start gap-3" style={{background:"#fb923c18",border:"1px solid #fb923c"}}>
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{color:"#fb923c"}}/>
          <p className="text-sm" style={{color:"#fb923c"}}><strong>{lowStock.length} running low:</strong> {lowStock.map(p=>p.name).join(" · ")}</p>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, SKU, barcode, brand…" className="deji-input pl-9"/>
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className="deji-input w-auto">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStock} onChange={e=>setFilterStock(e.target.value)} className="deji-input w-auto">
          <option value="all">All Products</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
          <option value="variants">Has Variants</option>
          <option value="bundle">Bundles</option>
        </select>
        {(search||filterCat!=="all"||filterStock!=="all")&&(
          <button onClick={()=>{setSearch("");setFilterCat("all");setFilterStock("all");}} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"><X size={11}/> Clear</button>
        )}
      </div>

      <div className="deji-card overflow-hidden">
        {loading?(
          <div className="p-8 text-center" style={{color:"var(--text-muted)"}}>Loading inventory…</div>
        ):products.length===0?(
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">📦</div>
            <p className="mb-4" style={{color:"var(--text-muted)"}}>No products yet. Add your first product.</p>
            {canEdit && <button onClick={openNew} className="btn-primary">Add First Product</button>}
          </div>
        ):filtered.length===0?(
          <div className="p-8 text-center"><div className="text-4xl mb-3">🔍</div><p style={{color:"var(--text-muted)"}}>No products match your filters</p></div>
        ):(
          <div className="overflow-x-auto">
            <table className="deji-table w-full">
              <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Cost</th><th>Price</th><th>Discount</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.flatMap(p=>{
                  const isExpanded = expandedRows.has(p.id);
                  const totalProdStock = p.hasVariants&&p.variants?.length
                    ? p.variants.reduce((s,v)=>s+(Number(v.stock)||0),0) : p.stock;
                  return [
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {p.imageUrl?(
                            <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" style={{border:"1px solid var(--border)"}}/>
                          ):(
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:"var(--primary-dim)"}}>
                              {p.isBundle?"🎁":p.hasVariants?"🏷":"📦"}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>{p.name}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {p.brand&&<span className="text-[10px]" style={{color:"var(--text-muted)"}}>{p.brand}</span>}
                              {p.hasVariants&&(
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{background:"var(--primary-dim)",color:"var(--primary)"}}>
                                  {p.variants?.length||0} {p.variantLabel||"variants"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-xs font-mono" style={{color:"var(--text-muted)"}}>{p.sku||"—"}</span></td>
                      <td><span className="badge badge-blue text-xs">{p.category}</span></td>
                      <td><span className="text-sm" style={{color:"var(--text-muted)"}}>{format(p.costPrice||0)}</span></td>
                      <td><span className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>{format(p.sellingPrice||0)}</span></td>
                      <td>{p.discountType&&p.discountType!=="none"?<span className="badge badge-orange text-xs">{p.discountType==="percent"?p.discountValue+"%":format(Number(p.discountValue)).toLocaleString()}</span>:<span style={{color:"var(--text-muted)"}}>—</span>}</td>
                      <td><span className="text-sm font-bold" style={{color:totalProdStock<=0?"#ef4444":totalProdStock<=(p.lowStockThreshold||5)?"#fb923c":"var(--text-primary)"}}>{p.isBundle?"—":totalProdStock}</span></td>
                      <td><StockBadge p={p}/></td>
                      <td>
                        <div className="flex gap-1.5 flex-wrap">
                          {p.hasVariants&&(
                            <button onClick={()=>setExpandedRows(prev=>{const s=new Set(prev);s.has(p.id)?s.delete(p.id):s.add(p.id);return s;})}
                              className="text-xs px-2 py-1 rounded-lg font-semibold flex items-center gap-1"
                              style={{background:"var(--primary-dim)",color:"var(--primary)"}}>
                              <Layers size={10}/>{isExpanded?<ChevronUp size={10}/>:<ChevronDown size={10}/>}
                            </button>
                          )}
                          {canEdit&&!p.isBundle&&!p.hasVariants&&(
                            <button onClick={()=>{setShowPurchase(p);setPurchase({adjustment:1,costPrice:p.costPrice||"",supplier:"",note:""});}}
                              className="text-xs px-2 py-1 rounded-lg font-semibold"
                              style={{background:"var(--primary-dim)",color:"var(--primary)"}}>+ Stock</button>
                          )}
                          {canEdit&&<button onClick={()=>openEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}><Edit size={12}/></button>}
                          {canDelete&&<button onClick={()=>handleDelete(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}><Trash2 size={12}/></button>}
                        </div>
                      </td>
                    </tr>,
                    isExpanded&&p.variants?.length>0&&(
                      <tr key={p.id+"-v"} style={{background:"var(--bg-hover)"}}>
                        <td colSpan={9} className="p-0">
                          <div className="px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{color:"var(--text-muted)"}}>{p.variantLabel||"Variants"} breakdown</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {p.variants.map((v,i)=>(
                                <div key={i} className="p-2.5 rounded-xl flex items-center gap-2" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
                                  {v.imageUrl&&<img src={v.imageUrl} alt={v.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0"/>}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold truncate" style={{color:"var(--text-primary)"}}>{v.name}</p>
                                    <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{format(v.sellingPrice||0)} · {Number(v.stock||0)} units</p>
                                  </div>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${Number(v.stock||0)<=0?"badge-red":Number(v.stock||0)<=5?"badge-orange":"badge-green"}`}>{v.stock||0}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ),
                  ].filter(Boolean);
                })}
              </tbody>
              <tfoot>
                <tr style={{borderTop:"2px solid var(--border)",background:"var(--bg-hover)"}}>
                  <td colSpan={6} className="p-3"><span className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{filtered.length} of {products.length} products</span></td>
                  <td className="p-3"><span className="text-xs font-bold" style={{color:"var(--text-primary)"}}>{totalUnits.toLocaleString()} units</span></td>
                  <td colSpan={2} className="p-3"><span className="text-xs font-bold text-green-400">{format(stockValue)}</span></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showPurchase&&(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowPurchase(null)}>
          <div className="deji-card p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>Record Purchase</h2>
              <button onClick={()=>setShowPurchase(null)} style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <p className="text-sm mb-4" style={{color:"var(--text-muted)"}}>Adding stock to: <strong style={{color:"var(--text-primary)"}}>{showPurchase.name}</strong> (current: {showPurchase.stock} {showPurchase.unit||"units"})</p>
            <div className="space-y-3">
              <div><label className="deji-label">Units to Add *</label><input type="number" min="1" value={purchase.adjustment} onChange={e=>setPurchase(p=>({...p,adjustment:e.target.value}))} className="deji-input"/></div>
              <div><label className="deji-label">Cost Price per Unit</label><input type="number" value={purchase.costPrice} onChange={e=>setPurchase(p=>({...p,costPrice:e.target.value}))} className="deji-input" placeholder={"Current: ₦"+(showPurchase.costPrice||0).toLocaleString()}/></div>
              <div><label className="deji-label">Supplier</label><input value={purchase.supplier} onChange={e=>setPurchase(p=>({...p,supplier:e.target.value}))} className="deji-input" placeholder="Supplier name (optional)"/></div>
              <div><label className="deji-label">Note</label><input value={purchase.note} onChange={e=>setPurchase(p=>({...p,note:e.target.value}))} className="deji-input" placeholder="Optional note"/></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowPurchase(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handlePurchase} className="btn-primary flex-1">Add Stock</button>
            </div>
          </div>
        </div>
      )}

      {showModal&&(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeModal}>
          <div className="deji-card w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 flex-shrink-0" style={{borderBottom:"1px solid var(--border)"}}>
              <h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{editProd?"Edit Product":"Add Product"}</h2>
              <button onClick={closeModal} style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>

            <div className="flex gap-1 px-5 pt-3 flex-shrink-0 overflow-x-auto pb-1">
              {[
                {id:"basic",label:"Basic Info",icon:<Package size={11}/>},
                {id:"variants",label:"Variants",icon:<Layers size={11}/>},
                {id:"bundle",label:"Bundle",icon:"🎁"},
                {id:"advanced",label:"Advanced",icon:<Tag size={11}/>},
              ].map(s=>(
                <button key={s.id} type="button" onClick={()=>setSection(s.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
                  style={{background:section===s.id?"var(--primary)":"var(--bg-hover)",color:section===s.id?"#fff":"var(--text-muted)"}}>
                  {typeof s.icon==="string"?s.icon:s.icon} {s.label}
                  {s.id==="variants"&&form.variants.length>0&&<span className="ml-1 px-1.5 rounded-full text-[9px] font-bold" style={{background:"rgba(255,255,255,0.3)"}}>{form.variants.length}</span>}
                </button>
              ))}
            </div>

            <form onSubmit={saveProduct} className="flex-1 overflow-y-auto p-5 space-y-4">

              {section==="basic"&&(
                <>
                  <ProductImage value={form.imageUrl} onChange={v=>setForm(p=>({...p,imageUrl:v}))}/>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="deji-label">Product Name *</label>
                      <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="deji-input" required placeholder="e.g. Classic Sneaker"/>
                    </div>
                    <div>
                      <label className="deji-label">Brand</label>
                      <input value={form.brand} onChange={e=>setForm(p=>({...p,brand:e.target.value}))} className="deji-input" placeholder="e.g. Nike"/>
                    </div>
                    <div>
                      <label className="deji-label">Category</label>
                      <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="deji-input">
                        {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="deji-label">SKU</label>
                      <div className="flex gap-1.5">
                        <input value={form.sku} onChange={e=>setForm(p=>({...p,sku:e.target.value}))} className="deji-input flex-1" placeholder="Auto if blank"/>
                        <button type="button" onClick={()=>setForm(p=>({...p,sku:genSKU(p.name)}))} className="btn-secondary text-xs px-2 flex-shrink-0">Auto</button>
                      </div>
                    </div>
                    <div>
                      <label className="deji-label">Barcode / EAN</label>
                      <input value={form.barcode} onChange={e=>setForm(p=>({...p,barcode:e.target.value}))} className="deji-input" placeholder="Scan or type"/>
                    </div>
                    <div>
                      <label className="deji-label">Cost Price (₦)</label>
                      <input type="number" min="0" step="0.01" value={form.costPrice} onChange={e=>setForm(p=>({...p,costPrice:e.target.value}))} className="deji-input" placeholder="0.00"/>
                    </div>
                    <div>
                      <label className="deji-label">Selling Price (₦) *</label>
                      <input type="number" min="0.01" step="0.01" value={form.sellingPrice} onChange={e=>setForm(p=>({...p,sellingPrice:e.target.value}))} className="deji-input" required placeholder="0.00"/>
                    </div>
                    {!form.hasVariants&&<>
                      <div>
                        <label className="deji-label">Opening Stock</label>
                        <input type="number" min="0" value={form.stock} onChange={e=>setForm(p=>({...p,stock:e.target.value}))} className="deji-input" placeholder="0"/>
                      </div>
                      <div>
                        <label className="deji-label">Low Stock Alert</label>
                        <input type="number" min="1" value={form.lowStockThreshold} onChange={e=>setForm(p=>({...p,lowStockThreshold:e.target.value}))} className="deji-input" placeholder="5"/>
                      </div>
                    </>}
                    <div>
                      <label className="deji-label">Unit of Measure</label>
                      <select value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} className="deji-input">
                        {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="deji-label">Description</label>
                    <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="deji-input resize-none" rows={2} placeholder="Optional description…"/>
                  </div>
                </>
              )}

              {section==="variants"&&(
                <>
                  <div className="p-3 rounded-xl" style={{background:"rgba(99,91,255,0.06)",border:"1px solid rgba(99,91,255,0.2)"}}>
                    <p className="text-xs" style={{color:"var(--text-muted)"}}>Use variants for products with different sizes, colours, styles, etc. Each variant tracks its own stock and price.</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.hasVariants} onChange={e=>setForm(p=>({...p,hasVariants:e.target.checked}))} className="accent-green-500 w-4 h-4"/>
                    <span className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>This product has variants</span>
                  </label>
                  {form.hasVariants&&<>
                    <div>
                      <label className="deji-label">Variant Type</label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {VARIANT_TYPES.map(vt=>(
                          <button key={vt.id} type="button" onClick={()=>setForm(p=>({...p,variantType:vt.id}))}
                            className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                            style={{background:form.variantType===vt.id?"var(--primary)":"transparent",color:form.variantType===vt.id?"#fff":"var(--text-muted)",borderColor:form.variantType===vt.id?"var(--primary)":"var(--border)"}}>
                            {vt.label}
                          </button>
                        ))}
                      </div>
                      {form.variantType==="custom"&&(
                        <input className="deji-input mt-2" value={form.customVariantName} onChange={e=>setForm(p=>({...p,customVariantName:e.target.value}))} placeholder="Enter variant type name e.g. Scent, Voltage…"/>
                      )}
                    </div>
                    {(form.costPrice||form.sellingPrice)&&form.variants.some(v=>!v.costPrice&&!v.sellingPrice)&&(
                      <button type="button" onClick={autoFillPrices} className="text-xs px-3 py-1.5 rounded-xl font-semibold" style={{background:"var(--primary-dim)",color:"var(--primary)"}}>↓ Copy base prices to all variants</button>
                    )}
                    <div className="space-y-3">
                      {form.variants.map((v,i)=>(
                        <div key={i} className="p-3 rounded-2xl space-y-3" style={{background:"var(--bg-hover)",border:"1px solid var(--border)"}}>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold" style={{color:"var(--text-muted)"}}>{variantTypeLabel} {i+1}</p>
                            <button type="button" onClick={()=>removeVariant(i)} className="text-red-400"><X size={13}/></button>
                          </div>
                          <div className="flex items-start gap-3">
                            <ProductImage size="sm" value={v.imageUrl} onChange={val=>updateVariant(i,"imageUrl",val)}/>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="col-span-2">
                                <input value={v.name} onChange={e=>updateVariant(i,"name",e.target.value)} className="deji-input text-sm" placeholder={VARIANT_TYPES.find(vt=>vt.id===form.variantType)?.placeholder||"Name"} required={form.hasVariants}/>
                              </div>
                              <input type="number" value={v.costPrice} onChange={e=>updateVariant(i,"costPrice",e.target.value)} className="deji-input text-sm" placeholder="Cost ₦"/>
                              <input type="number" value={v.sellingPrice} onChange={e=>updateVariant(i,"sellingPrice",e.target.value)} className="deji-input text-sm" placeholder="Price ₦"/>
                              <input type="number" min="0" value={v.stock} onChange={e=>updateVariant(i,"stock",e.target.value)} className="deji-input text-sm" placeholder="Stock qty"/>
                              <input value={v.sku} onChange={e=>updateVariant(i,"sku",e.target.value)} className="deji-input text-sm font-mono" placeholder="SKU (optional)"/>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addVariant} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                      <Plus size={13}/> Add {variantTypeLabel}
                    </button>
                  </>}
                </>
              )}

              {section==="bundle"&&(
                <>
                  <div className="p-3 rounded-xl" style={{background:"rgba(251,146,60,0.06)",border:"1px solid rgba(251,146,60,0.2)"}}>
                    <p className="text-xs" style={{color:"var(--text-muted)"}}>A bundle combines multiple products. Stock is automatically deducted from each component on sale.</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.isBundle} onChange={e=>setForm(p=>({...p,isBundle:e.target.checked}))} className="accent-green-500 w-4 h-4"/>
                    <span className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>This is a bundle product</span>
                  </label>
                  {form.isBundle&&<>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
                      <input value={bundleSearch} onChange={e=>setBundleSearch(e.target.value)} className="deji-input pl-8 text-sm" placeholder="Search products to add…"/>
                      {bundleSuggestions.length>0&&(
                        <div className="absolute top-full left-0 right-0 z-10 rounded-xl overflow-hidden shadow-xl mt-1" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
                          {bundleSuggestions.map(prod=>(
                            <button key={prod.id} type="button" onClick={()=>addBundleItem(prod)} className="w-full text-left px-3 py-2 text-sm flex items-center justify-between" style={{color:"var(--text-primary)"}}>
                              <span>{prod.name}</span><span className="text-xs" style={{color:"var(--text-muted)"}}>Stock: {prod.stock}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {form.bundleItems.length>0&&(
                      <div className="space-y-2">
                        {form.bundleItems.map(item=>(
                          <div key={item.productId} className="flex items-center justify-between p-2.5 rounded-xl" style={{background:"var(--bg-hover)"}}>
                            <span className="text-sm" style={{color:"var(--text-primary)"}}>{item.name}</span>
                            <div className="flex items-center gap-2">
                              <input type="number" min="1" value={item.quantity} onChange={e=>updateBundleQty(item.productId,Number(e.target.value))} className="w-16 deji-input text-sm text-center py-1"/>
                              <button type="button" onClick={()=>removeBundleItem(item.productId)} className="text-red-400"><X size={12}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>}
                </>
              )}

              {section==="advanced"&&(
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="deji-label">Discount Type</label>
                      <select value={form.discountType} onChange={e=>setForm(p=>({...p,discountType:e.target.value}))} className="deji-input">
                        <option value="none">No Discount</option>
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₦)</option>
                      </select>
                    </div>
                    {form.discountType!=="none"&&(
                      <div>
                        <label className="deji-label">Discount Value</label>
                        <input type="number" min="0" value={form.discountValue} onChange={e=>setForm(p=>({...p,discountValue:e.target.value}))} className="deji-input" placeholder="0"/>
                      </div>
                    )}
                    <div>
                      <label className="deji-label">VAT / Tax Rate (%)</label>
                      <input type="number" min="0" max="100" step="0.1" value={form.taxRate} onChange={e=>setForm(p=>({...p,taxRate:e.target.value}))} className="deji-input" placeholder="e.g. 7.5"/>
                    </div>
                    <div>
                      <label className="deji-label">Low Stock Threshold</label>
                      <input type="number" min="1" value={form.lowStockThreshold} onChange={e=>setForm(p=>({...p,lowStockThreshold:e.target.value}))} className="deji-input" placeholder="5"/>
                    </div>
                  </div>
                  {form.costPrice&&form.sellingPrice&&Number(form.sellingPrice)>0&&(()=>{
                    const cost=Number(form.costPrice)||0,sell=Number(form.sellingPrice)||0,tax=Number(form.taxRate)||0;
                    const taxAmt=sell*(tax/100),profit=sell-cost-taxAmt,margin=sell>0?((profit/sell)*100).toFixed(1):0;
                    return(
                      <div className="p-4 rounded-2xl" style={{background:"var(--bg-hover)"}}>
                        <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{color:"var(--text-muted)"}}>Margin Preview</p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div><p className="text-lg font-bold text-red-400">{format(cost.toLocaleString())}</p><p className="text-[10px]" style={{color:"var(--text-muted)"}}>Cost</p></div>
                          <div><p className="text-lg font-bold text-green-400">{format(profit.toLocaleString())}</p><p className="text-[10px]" style={{color:"var(--text-muted)"}}>Profit</p></div>
                          <div><p className="text-lg font-bold" style={{color:"var(--primary)"}}>{margin}%</p><p className="text-[10px]" style={{color:"var(--text-muted)"}}>Margin</p></div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              <div className="flex gap-3 pt-4" style={{borderTop:"1px solid var(--border)"}}>
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving?<><RefreshCw size={13} className="animate-spin"/> Saving…</>:editProd?"Update Product":"Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
