"use client";
import { useCurrency } from "@/lib/currencyContext";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Filter, X, Phone, Mail, Calendar, Trash2, Edit, AlertCircle, Download, Zap, RefreshCw, ExternalLink, Package } from "lucide-react";
import { toDay, inRange, fmtDate } from "@/lib/dateUtils";
import { getLeads, createLead, updateLead, deleteLead } from "@/lib/api";
import api from "@/lib/api";

const STATUSES   = ["assigned","contacted","qualified","processing","delivered","failed","lost"];
const SOURCES    = ["Facebook","Instagram","TikTok","Google","WhatsApp","Landing Page","Ad Form","Manual","Referral","Walk-in","Email","Website Form","Generic Webhook"];
const LEAD_TYPES = ["hot","warm","cold"];

const STATUS_COLORS  = { assigned:"badge-blue", contacted:"badge-orange", qualified:"badge-yellow", processing:"badge-purple", delivered:"badge-green", failed:"badge-red", lost:"badge-red" };
const STATUS_LABELS  = { assigned:"Assigned", contacted:"Contacted", qualified:"Qualified", processing:"Processing", delivered:"Delivered ✅", failed:"Failed", lost:"Lost" };
const LEGACY_MAP     = { new:"assigned", won:"delivered", cancelled:"failed", negotiation:"processing" };
const normaliseStatus = s => LEGACY_MAP[s] || s;

const TYPE_ICONS      = { hot:"🔥", warm:"🌡️", cold:"❄️" };
const PRIORITY_COLORS = { high:"text-red-400", medium:"text-orange-400", low:"text-green-400" };
const SOURCE_COLORS   = { Facebook:"rgba(24,119,242,0.15)", Instagram:"rgba(225,48,108,0.15)", TikTok:"rgba(255,0,80,0.15)", Google:"rgba(66,133,244,0.15)", "Ad Form":"rgba(34,197,94,0.15)", "Website Form":"rgba(99,102,241,0.15)", "Generic Webhook":"rgba(234,179,8,0.15)" };
const SOURCE_TEXT     = { Facebook:"#1877f2", Instagram:"#e1306c", TikTok:"#ff0050", Google:"#4285f4", "Ad Form":"#22c55e", "Website Form":"#6366f1", "Generic Webhook":"#eab308" };

const EMPTY_ORDER = { productId:"", productName:"", variantIdx:"", variantName:"", warehouseId:"", warehouseName:"", orderQuantity:1, unitPrice:"", deliveryAddress:"" };
const EMPTY = { name:"", email:"", phone:"", company:"", source:"Facebook", channel:"Facebook", status:"assigned", leadType:"warm", priority:"medium", assignedTo:"", marketerName:"", campaignName:"", adSet:"", formName:"", expectedValue:"", followUpDate:"", notes:"", ...EMPTY_ORDER };
const MANUAL_SOURCES = ["Manual","Walk-in","Referral","Returning Customer"];

function getMe() {
  if (typeof window==="undefined") return {role:"admin"};
  try { const u=JSON.parse(localStorage.getItem("user")||"{}"); return {role:u.role||"admin",email:u.email||"",name:u.firstName||u.email||""}; }
  catch { return {role:"admin"}; }
}

function SourceBadge({ source }) {
  if (!source) return <span style={{color:"var(--text-dim)"}}>—</span>;
  const isAd = ["Facebook","Instagram","TikTok","Google","Ad Form","Website Form","Generic Webhook"].includes(source);
  return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:SOURCE_COLORS[source]||"var(--bg-hover)",color:SOURCE_TEXT[source]||"var(--text-muted)"}}>{isAd&&<Zap size={8}/>}{source}</span>;
}

// ── Inline product/variant/warehouse picker ────────────────────────────────────
function OrderDetailsPicker({ form, setForm, inventory, warehouses }) {
  const selectedProduct = inventory.find(p => p.id === form.productId);
  const cf              = selectedProduct?.customFields || {};
  const variants        = cf.variants || selectedProduct?.variants || [];
  const hasVariants     = (cf.hasVariants && variants.length > 0) || (selectedProduct?.variants?.length > 0);

  const pickProduct = (productId) => {
    const prod = inventory.find(p => p.id === productId);
    if (!prod) { setForm(p => ({...p, ...EMPTY_ORDER})); return; }
    const vs      = prod.customFields?.variants || prod.variants || [];
    const firstV  = vs[0];
    const price   = firstV?.sellingPrice || prod.price || prod.sellingPrice || 0;
    // Find default warehouse with stock
    const wh = warehouses.find(w => (w.warehouseStocks||[]).some(s => s.productId===prod.id && s.quantity>0))
            || warehouses.find(w => w.isDefault);
    setForm(p => ({
      ...p,
      productId:    prod.id,
      productName:  prod.name,
      variantIdx:   firstV ? "0" : "",
      variantName:  firstV?.name || "",
      warehouseId:  wh?.id   || "",
      warehouseName:wh?.name || "",
      unitPrice:    price,
      expectedValue: p.expectedValue || String(Number(price) * Number(p.orderQuantity || 1)),
    }));
  };

  const pickVariant = (idx) => {
    const vs  = cf.variants || selectedProduct?.variants || [];
    const v   = vs[Number(idx)];
    setForm(p => ({
      ...p,
      variantIdx:  idx,
      variantName: v?.name || "",
      unitPrice:   v?.sellingPrice || selectedProduct?.price || p.unitPrice,
      expectedValue: String((v?.sellingPrice || selectedProduct?.price || Number(p.unitPrice)) * Number(p.orderQuantity || 1)),
    }));
  };

  // Stock at selected warehouse for selected product
  const whStocks = warehouses.find(w => w.id === form.warehouseId);
  const stockHere = whStocks
    ? (whStocks.warehouseStocks||[]).find(s => s.productId === form.productId)?.quantity ?? 0
    : 0;

  return (
    <div className="space-y-3">
      {/* Product */}
      <div>
        <label className="deji-label">Product <span style={{color:"var(--text-muted)",fontWeight:"normal"}}>(from inventory)</span></label>
        <select value={form.productId||""} onChange={e=>pickProduct(e.target.value)} className="deji-input">
          <option value="">— No product selected —</option>
          {inventory.filter(p=>p.type!=="service"&&p.isActive!==false).map(p=>{
            const stock = p.variants?.length ? p.variants.reduce((s,v)=>s+(Number(v.stock)||0),0) : (p.stock||0);
            return <option key={p.id} value={p.id} disabled={stock<=0}>{p.name}{p.sku?` (${p.sku})`:""} · ₦{Number(p.price||0).toLocaleString()} · {stock} in stock{stock<=0?" [Out]":""}</option>;
          })}
        </select>
      </div>

      {/* Variant */}
      {form.productId && hasVariants && (
        <div>
          <label className="deji-label">Variant</label>
          <select value={form.variantIdx||""} onChange={e=>pickVariant(e.target.value)} className="deji-input">
            <option value="">— Select variant —</option>
            {variants.map((v,i)=>(
              <option key={i} value={String(i)}>
                {v.name}{v.sellingPrice?` · ₦${Number(v.sellingPrice).toLocaleString()}`:""}{v.stock!=null?` · ${v.stock} in stock`:""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Warehouse + qty + delivery */}
      {form.productId && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="deji-label">Dispatch Warehouse</label>
            <select value={form.warehouseId||""} onChange={e=>{const wh=warehouses.find(w=>w.id===e.target.value);setForm(p=>({...p,warehouseId:e.target.value,warehouseName:wh?.name||""}));}} className="deji-input">
              <option value="">Auto (highest stock)</option>
              {warehouses.filter(w=>w.isActive!==false).map(w=>{
                const ws=(w.warehouseStocks||[]).find(s=>s.productId===form.productId);
                const qty=ws?.quantity??0;
                return <option key={w.id} value={w.id} disabled={qty<=0}>{w.isDefault?"⚡ ":""}{w.name} · {qty} units{qty<=0?" [Out]":""}</option>;
              })}
            </select>
            {form.warehouseId && (
              <p className={`text-[10px] mt-1 ${stockHere<=0?"text-red-400":stockHere<=5?"text-orange-400":"text-green-400"}`}>
                {stockHere<=0?"⚠ No stock here":stockHere<=5?`⚠ Low: ${stockHere} units`:`✓ ${stockHere} units available`}
              </p>
            )}
          </div>
          <div>
            <label className="deji-label">Quantity</label>
            <input type="number" min="1" value={form.orderQuantity||1}
              onChange={e=>setForm(p=>({...p, orderQuantity:e.target.value, expectedValue:String(Number(p.unitPrice||0)*Number(e.target.value))}))}
              className="deji-input"/>
          </div>
          <div className="col-span-2">
            <label className="deji-label">Delivery Address</label>
            <input value={form.deliveryAddress||""} onChange={e=>setForm(p=>({...p,deliveryAddress:e.target.value}))} className="deji-input" placeholder="e.g. 12 Lagos Island, Victoria Island"/>
          </div>
        </div>
      )}

      {/* Summary */}
      {form.productId && (
        <div className="p-3 rounded-xl flex items-center gap-3" style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)"}}>
          <Package size={14} style={{color:"#6366f1",flexShrink:0}}/>
          <div className="text-xs" style={{color:"var(--text-muted)"}}>
            <span className="font-semibold" style={{color:"var(--text-primary)"}}>{form.productName}</span>
            {form.variantName && <span> — {form.variantName}</span>}
            {form.warehouseName && <span> · from {form.warehouseName}</span>}
            {form.unitPrice && <span className="font-bold text-green-400"> · ₦{(Number(form.unitPrice)*Number(form.orderQuantity||1)).toLocaleString()} total</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const [leads,       setLeads]       = useState([]);
  const { format }                    = useCurrency();
  const [loading,     setLoading]     = useState(true);
  const [inventory,   setInventory]   = useState([]);
  const [warehouses,  setWarehouses]  = useState([]);
  const [search,      setSearch]      = useState("");
  const [activeTab,   setActiveTab]   = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [filters,     setFilters]     = useState({status:"all",source:"all",leadType:"all",priority:"all",assignedTo:"all",marketer:"all",dateFrom:"",dateTo:""});
  const [showModal,   setShowModal]   = useState(false);
  const [editLead,    setEditLead]    = useState(null);
  const [form,        setForm]        = useState(EMPTY);
  const [saving,      setSaving]      = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const me = getMe();

  useEffect(() => { fetchLeads(); fetchInventoryData(); }, []);
  useEffect(() => { const iv=setInterval(()=>fetchLeads(true),30000); return ()=>clearInterval(iv); }, []);

  const fetchLeads = async (silent=false) => {
    try {
      if (!silent) setLoading(true);
      const res = await getLeads({ limit:500 });
      setLeads(Array.isArray(res.data)?res.data:res.data?.data||res.data?.leads||[]);
      setLastRefresh(new Date());
    } catch(e) { console.error(e); }
    finally { if (!silent) setLoading(false); }
  };

  const fetchInventoryData = async () => {
    try {
      const [ir,wr] = await Promise.allSettled([
        api.get("/products?limit=500"),
        api.get("/warehouses"),
      ]);
      if (ir.status==="fulfilled") {
        const d=ir.value?.data;
        setInventory(Array.isArray(d)?d:Array.isArray(d?.data)?d.data:d?.products||[]);
      }
      if (wr.status==="fulfilled") setWarehouses(Array.isArray(wr.value?.data)?wr.value.data:[]);
    } catch(e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const isManual = MANUAL_SOURCES.includes(form.source);
      // Auto-compute expectedValue from product price if not manually set
      const expectedValue = form.expectedValue
        ? Number(form.expectedValue)
        : (form.unitPrice && form.orderQuantity ? Number(form.unitPrice)*Number(form.orderQuantity) : null);

      const p = {
        ...form,
        expectedValue,
        followUpDate:  form.followUpDate ? new Date(form.followUpDate).toISOString() : null,
        assignedTo:    (isManual && !form.assignedTo) ? "customer_care" : form.assignedTo,
        // Save order details as structured data
        orderDetails: form.productId ? {
          productId:    form.productId,
          productName:  form.productName,
          variantIdx:   form.variantIdx   || null,
          variantName:  form.variantName  || null,
          warehouseId:  form.warehouseId  || null,
          warehouseName:form.warehouseName|| null,
          quantity:     Number(form.orderQuantity) || 1,
          unitPrice:    Number(form.unitPrice)      || 0,
          deliveryAddress: form.deliveryAddress || null,
        } : null,
      };
      editLead ? await updateLead(editLead.id, p) : await createLead(p);
      await fetchLeads(); setShowModal(false); setEditLead(null); setForm(EMPTY);
    } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (l) => {
    setEditLead(l);
    const od = l.orderDetails || {};
    setForm({
      name:l.name||"", email:l.email||"", phone:l.phone||"", company:l.company||"",
      source:l.source||"Facebook", channel:l.channel||"Facebook",
      status:normaliseStatus(l.status||"assigned"),
      leadType:l.leadType||"warm", priority:l.priority||"medium",
      assignedTo:l.assignedTo||"", marketerName:l.marketerName||"",
      campaignName:l.campaignName||"", adSet:l.adSet||"", formName:l.formName||"",
      expectedValue:l.expectedValue||"",
      followUpDate:l.followUpDate?l.followUpDate.split("T")[0]:"",
      notes:l.notes||"",
      productId:    od.productId    || "",
      productName:  od.productName  || "",
      variantIdx:   od.variantIdx!=null ? String(od.variantIdx) : "",
      variantName:  od.variantName  || "",
      warehouseId:  od.warehouseId  || "",
      warehouseName:od.warehouseName|| "",
      orderQuantity:od.quantity     || 1,
      unitPrice:    od.unitPrice    || "",
      deliveryAddress: od.deliveryAddress || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this lead?")) return;
    try { await deleteLead(id); fetchLeads(); } catch(e) { alert(e.message); }
  };

  const quickStatus = async (lead, newStatus) => {
    try { await updateLead(lead.id, { status: newStatus }); fetchLeads(true); }
    catch(e) { alert(e.message); }
  };

  const reps           = [...new Set(leads.map(l=>l.assignedTo).filter(Boolean))];
  const marketers      = [...new Set(leads.map(l=>l.marketerName).filter(Boolean))];
  const followUpDue    = leads.filter(l=>l.followUpDate&&new Date(l.followUpDate)<=new Date()&&!["delivered","failed","lost"].includes(normaliseStatus(l.status)));
  const adLeads        = leads.filter(l=>["Facebook","Instagram","TikTok","Google","Ad Form","Website Form","Generic Webhook"].includes(l.source));
  const deliveredLeads = leads.filter(l=>normaliseStatus(l.status)==="delivered");

  const filtered = leads.filter(l => {
    const ns=normaliseStatus(l.status);
    if (activeTab==="ad"&&!["Facebook","Instagram","TikTok","Google","Ad Form","Website Form","Generic Webhook"].includes(l.source)) return false;
    if (activeTab!=="all"&&activeTab!=="ad"&&ns!==activeTab) return false;
    if (search&&!l.name?.toLowerCase().includes(search.toLowerCase())&&!l.phone?.includes(search)&&!l.email?.toLowerCase().includes(search.toLowerCase())&&!l.campaignName?.toLowerCase().includes(search.toLowerCase())&&!l.assignedTo?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.source!=="all"&&l.source!==filters.source) return false;
    if (filters.leadType!=="all"&&l.leadType!==filters.leadType) return false;
    if (filters.priority!=="all"&&l.priority!==filters.priority) return false;
    if (filters.assignedTo!=="all"&&l.assignedTo!==filters.assignedTo) return false;
    if (filters.marketer!=="all"&&l.marketerName!==filters.marketer) return false;
    if (!inRange(l.createdAt,filters.dateFrom,filters.dateTo)) return false;
    return true;
  });

  const totalValue = filtered.reduce((s,l)=>s+(l.expectedValue||0),0);

  const exportCSV = () => {
    const rows=["Name,Phone,Email,Source,Campaign,Rep,Status,Type,Priority,Value,Product,Variant,Warehouse,Follow Up,Created",...filtered.map(l=>{const od=l.orderDetails||{};return `"${l.name||""}","${l.phone||""}","${l.email||""}","${l.source||""}","${l.campaignName||""}","${l.assignedTo||""}","${normaliseStatus(l.status)}","${l.leadType||""}","${l.priority||""}","${l.expectedValue||0}","${od.productName||""}","${od.variantName||""}","${od.warehouseName||""}","${fmtDate(l.followUpDate)}","${fmtDate(l.createdAt)}"`;})].join("\n");
    const a=document.createElement("a");a.href="data:text/csv,"+encodeURIComponent(rows);a.download="leads.csv";a.click();
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Leads</h1><p className="page-subtitle">{leads.length} total · {deliveredLeads.length} delivered · {adLeads.length} from ads · {followUpDue.length} follow-ups due</p></div>
        <div className="flex gap-2">
          <button onClick={()=>fetchLeads()} className="btn-secondary flex items-center gap-2"><RefreshCw size={14}/><span className="text-xs hidden md:inline">{lastRefresh.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span></button>
          {me.role==="admin"&&<button onClick={exportCSV} className="btn-secondary flex items-center gap-2"><Download size={14}/> Export</button>}
          <button onClick={()=>{setEditLead(null);setForm(EMPTY);setShowModal(true);}} className="btn-primary flex items-center gap-2"><Plus size={15}/> Add Lead</button>
        </div>
      </div>

      {/* Banners */}
      {deliveredLeads.length>0&&<div className="p-3 rounded-2xl flex items-center gap-3" style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.3)"}}><span className="text-lg flex-shrink-0">🧾</span><p className="text-sm" style={{color:"var(--text-muted)"}}><strong style={{color:"#22c55e"}}>{deliveredLeads.length} delivered lead{deliveredLeads.length>1?"s":""}</strong> → Go to <Link href="/erp/finance" className="underline font-semibold" style={{color:"#22c55e"}}>Finance</Link> to raise invoices.</p></div>}
      {followUpDue.length>0&&<div className="p-3 rounded-2xl flex items-center gap-3" style={{background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.3)"}}><AlertCircle size={16} className="text-orange-400 flex-shrink-0"/><p className="text-sm font-semibold text-orange-400">{followUpDue.length} lead{followUpDue.length>1?"s":""} need follow-up: {followUpDue.slice(0,3).map(l=>l.name).join(", ")}{followUpDue.length>3?"...":""}</p></div>}
      {adLeads.length>0&&<div className="p-3 rounded-2xl flex items-center gap-3" style={{background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.2)"}}><Zap size={16} style={{color:"#22c55e",flexShrink:0}}/><p className="text-sm" style={{color:"var(--text-muted)"}}><strong style={{color:"#22c55e"}}>{adLeads.length} leads</strong> came in automatically from your connected ad platforms.</p></div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{label:"Hot Leads",value:leads.filter(l=>l.leadType==="hot").length,icon:"🔥"},{label:"From Ads",value:adLeads.length,icon:"⚡"},{label:"Follow-up Due",value:followUpDue.length,icon:"📅"},{label:"Pipeline Value",value:format(totalValue),icon:"💰"}].map(k=>(
          <div key={k.label} className="kpi-card"><div className="text-2xl mb-2">{k.icon}</div><p className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{k.value}</p><p className="text-xs" style={{color:"var(--text-muted)"}}>{k.label}</p></div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, email, campaign, rep..." className="deji-input pl-9"/></div>
          <button onClick={()=>setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2" style={{borderColor:showFilters?"var(--primary)":undefined,color:showFilters?"var(--primary)":undefined}}><Filter size={14}/> Filters {showFilters?"▲":"▼"}</button>
        </div>
        {showFilters&&(
          <div className="deji-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{label:"Source",key:"source",opts:[["all","All Sources"],...SOURCES.map(s=>[s,s])]},{label:"Type",key:"leadType",opts:[["all","All Types"],["hot","🔥 Hot"],["warm","🌡️ Warm"],["cold","❄️ Cold"]]},{label:"Priority",key:"priority",opts:[["all","All Priorities"],["high","⚡ High"],["medium","➡️ Medium"],["low","⬇️ Low"]]},{label:"Rep",key:"assignedTo",opts:[["all","All Reps"],...reps.map(r=>[r,r])]},{label:"Marketer",key:"marketer",opts:[["all","All Marketers"],...marketers.map(m=>[m,m])]}].map(f=>(
              <div key={f.key}><label className="deji-label">{f.label}</label><select value={filters[f.key]} onChange={e=>setFilters(p=>({...p,[f.key]:e.target.value}))} className="deji-input text-sm">{f.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
            ))}
            <div><label className="deji-label">From Date</label><input type="date" value={filters.dateFrom} onChange={e=>setFilters(p=>({...p,dateFrom:e.target.value}))} className="deji-input text-sm"/></div>
            <div><label className="deji-label">To Date</label><input type="date" value={filters.dateTo} onChange={e=>setFilters(p=>({...p,dateTo:e.target.value}))} className="deji-input text-sm"/></div>
            <div className="col-span-2 md:col-span-4 flex justify-end"><button onClick={()=>setFilters({status:"all",source:"all",leadType:"all",priority:"all",assignedTo:"all",marketer:"all",dateFrom:"",dateTo:""})} className="btn-secondary text-xs py-1.5 px-3">Clear Filters</button></div>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{k:"all",label:"All",count:leads.length},{k:"ad",label:"⚡ From Ads",count:adLeads.length},...STATUSES.map(s=>({k:s,label:STATUS_LABELS[s]||s,count:leads.filter(l=>normaliseStatus(l.status)===s).length}))].map(t=>(
            <button key={t.k} onClick={()=>setActiveTab(t.k)} className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap"
              style={{background:activeTab===t.k?(t.k==="ad"?"#22c55e":"var(--primary)"):"transparent",color:activeTab===t.k?"#fff":"var(--text-muted)",borderColor:activeTab===t.k?(t.k==="ad"?"#22c55e":"var(--primary)"):"var(--border)"}}>
              {t.label} <span className="ml-1 opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="deji-card overflow-hidden">
        {loading?<div className="p-8 text-center" style={{color:"var(--text-muted)"}}>Loading leads...</div>
        :filtered.length===0?<div className="p-12 text-center"><div className="text-5xl mb-3">👥</div><p style={{color:"var(--text-muted)"}}>No leads found</p><button onClick={()=>setShowModal(true)} className="btn-primary mt-4">Add First Lead</button></div>
        :(
          <div className="overflow-x-auto">
            <table className="deji-table w-full" style={{minWidth:"1100px"}}>
              <thead><tr><th>Lead</th><th>Contact</th><th>Source</th><th>Product / Order</th><th>Rep</th><th>Type</th><th>Priority</th><th>Value</th><th>Follow Up</th><th>Stage</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {filtered.map(l=>{
                  const ns=normaliseStatus(l.status); const od=l.orderDetails;
                  return (
                    <tr key={l.id}>
                      <td><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{background:"var(--primary)"}}>{l.name?.[0]?.toUpperCase()}</div><div><Link href={`/crm/leads/${l.id}`} className="font-semibold text-sm hover:underline" style={{color:"var(--text-primary)"}}>{l.name}</Link>{l.company&&<p className="text-[10px]" style={{color:"var(--text-muted)"}}>{l.company}</p>}</div></div></td>
                      <td><div className="space-y-0.5">{l.email&&<div className="flex items-center gap-1 text-[10px]" style={{color:"var(--text-muted)"}}><Mail size={9}/>{l.email}</div>}{l.phone&&<div className="flex items-center gap-1 text-[10px]" style={{color:"var(--text-muted)"}}><Phone size={9}/>{l.phone}</div>}</div></td>
                      <td><div className="space-y-1"><SourceBadge source={l.source}/>{l.campaignName&&<p className="text-[10px]" style={{color:"var(--text-muted)"}}>📢 {l.campaignName}</p>}</div></td>
                      <td>
                        {od?.productName?(
                          <div>
                            <div className="flex items-center gap-1"><Package size={10} style={{color:"var(--text-muted)"}}/><span className="text-xs font-semibold" style={{color:"var(--text-primary)"}}>{od.productName}</span></div>
                            {od.variantName&&<p className="text-[10px]" style={{color:"var(--text-muted)"}}>↳ {od.variantName}</p>}
                            {od.warehouseName&&<p className="text-[10px]" style={{color:"var(--text-muted)"}}>🏭 {od.warehouseName}</p>}
                            <p className="text-[10px]" style={{color:"var(--text-muted)"}}>Qty: {od.quantity||1}</p>
                          </div>
                        ):<span style={{color:"var(--text-dim)"}}>—</span>}
                      </td>
                      <td>{l.assignedTo?<p className="text-xs font-semibold" style={{color:"var(--text-primary)"}}>{l.assignedTo}</p>:<span className="text-xs px-2 py-0.5 rounded-full" style={{background:"rgba(234,179,8,0.1)",color:"#eab308"}}>⏳ Unassigned</span>}</td>
                      <td><span className="text-sm">{TYPE_ICONS[l.leadType]||"🌡️"}</span><span className="text-[10px] ml-1 capitalize" style={{color:"var(--text-muted)"}}>{l.leadType||"warm"}</span></td>
                      <td><span className={`text-xs font-bold capitalize ${PRIORITY_COLORS[l.priority]||""}`}>{l.priority||"medium"}</span></td>
                      <td>{l.expectedValue?<span className="text-xs font-bold text-green-400">{format(l.expectedValue)}</span>:<span style={{color:"var(--text-dim)"}}>—</span>}</td>
                      <td>{l.followUpDate?<div className="flex items-center gap-1 text-xs" style={{color:new Date(l.followUpDate)<=new Date()?"#f87171":"var(--text-muted)"}}><Calendar size={10}/>{fmtDate(l.followUpDate)}</div>:<span style={{color:"var(--text-dim)"}}>—</span>}</td>
                      <td>
                        <select value={ns} onChange={e=>quickStatus(l,e.target.value)} className="text-xs rounded-lg px-2 py-1 border font-semibold"
                          style={{background:"var(--bg-hover)",color:ns==="delivered"?"#22c55e":ns==="failed"||ns==="lost"?"#ef4444":ns==="processing"?"#a78bfa":"var(--text-primary)",borderColor:"var(--border)",cursor:"pointer"}}>
                          {STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      </td>
                      <td><span className="text-[10px]" style={{color:"var(--text-muted)"}}>{fmtDate(l.createdAt)}</span></td>
                      <td>
                        <div className="flex gap-1.5">
                          <Link href={`/crm/leads/${l.id}`} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}><ExternalLink size={12}/></Link>
                          <button onClick={()=>handleEdit(l)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}><Edit size={12}/></button>
                          {(me.role==="admin"||me.role==="manager")&&<button onClick={()=>handleDelete(l.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}><Trash2 size={12}/></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal&&(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="deji-card p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{editLead?"Edit Lead":"Add New Lead"}</h2>
              <button onClick={()=>{setShowModal(false);setEditLead(null);}} style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="deji-label">Full Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="deji-input" required/></div>
                <div><label className="deji-label">Phone</label><input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">Email</label><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} className="deji-input"/></div>
                <div className="col-span-2"><label className="deji-label">Company</label><input value={form.company} onChange={e=>setForm(p=>({...p,company:e.target.value}))} className="deji-input"/></div>
              </div>

              {/* Attribution */}
              <div style={{borderTop:"1px solid var(--border)",paddingTop:"1rem"}}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:"var(--text-muted)"}}>Attribution</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="deji-label">Source</label><select value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))} className="deji-input">{SOURCES.map(s=><option key={s}>{s}</option>)}</select></div>
                  <div><label className="deji-label">Channel</label><input value={form.channel} onChange={e=>setForm(p=>({...p,channel:e.target.value}))} className="deji-input" placeholder="e.g. Facebook Lead Ad"/></div>
                  <div><label className="deji-label">Campaign Name</label><input value={form.campaignName} onChange={e=>setForm(p=>({...p,campaignName:e.target.value}))} className="deji-input"/></div>
                  <div><label className="deji-label">Ad Set</label><input value={form.adSet} onChange={e=>setForm(p=>({...p,adSet:e.target.value}))} className="deji-input"/></div>
                  <div><label className="deji-label">Digital Marketer</label><input value={form.marketerName} onChange={e=>setForm(p=>({...p,marketerName:e.target.value}))} className="deji-input"/></div>
                  <div><label className="deji-label">Assigned Sales Rep</label><input value={form.assignedTo} onChange={e=>setForm(p=>({...p,assignedTo:e.target.value}))} className="deji-input"/></div>
                </div>
              </div>

              {/* Qualification */}
              <div style={{borderTop:"1px solid var(--border)",paddingTop:"1rem"}}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:"var(--text-muted)"}}>Qualification</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="deji-label">Stage</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="deji-input">{STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></div>
                  <div><label className="deji-label">Lead Type</label><select value={form.leadType} onChange={e=>setForm(p=>({...p,leadType:e.target.value}))} className="deji-input"><option value="hot">🔥 Hot</option><option value="warm">🌡️ Warm</option><option value="cold">❄️ Cold</option></select></div>
                  <div><label className="deji-label">Priority</label><select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} className="deji-input"><option value="high">⚡ High</option><option value="medium">➡️ Medium</option><option value="low">⬇️ Low</option></select></div>
                  <div><label className="deji-label">Expected Value (₦) <span style={{color:"var(--text-muted)",fontWeight:"normal"}}>(auto-fills from product)</span></label><input type="number" value={form.expectedValue} onChange={e=>setForm(p=>({...p,expectedValue:e.target.value}))} className="deji-input"/></div>
                  <div className="col-span-2"><label className="deji-label">Follow-up Date</label><input type="date" value={form.followUpDate} onChange={e=>setForm(p=>({...p,followUpDate:e.target.value}))} className="deji-input"/></div>
                </div>
              </div>

              {/* Order Details */}
              <div style={{borderTop:"1px solid var(--border)",paddingTop:"1rem"}}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{color:"var(--text-muted)"}}>
                  <Package size={12}/> Order Details <span className="font-normal normal-case">(optional — links to inventory & warehouse)</span>
                </p>
                <OrderDetailsPicker
                  form={form}
                  setForm={setForm}
                  inventory={inventory}
                  warehouses={warehouses}
                />
              </div>

              <div><label className="deji-label">Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="deji-input resize-none" rows={2}/></div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>{setShowModal(false);setEditLead(null);}} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?"Saving...":editLead?"Update Lead":"Add Lead"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}