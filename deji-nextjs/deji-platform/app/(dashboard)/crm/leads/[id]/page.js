"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit, Mail, Phone, Building2, Globe, User, Calendar,
  DollarSign, Tag, Zap, CheckCircle, XCircle, Clock, MessageSquare,
  FileText, Plus, Trash2, RefreshCw, ExternalLink, Copy, ChevronDown,
  TrendingUp, AlertCircle, Star,
} from "lucide-react";
import { getLead, updateLead, getInvoices, createInvoice } from "@/lib/api";
import api from "@/lib/api";
import { useCurrency } from "@/lib/currencyContext";
import { fmtDate } from "@/lib/dateUtils";

const STATUSES   = ["assigned","contacted","qualified","processing","delivered","failed","lost"];
const LEAD_TYPES = ["hot","warm","cold"];
const PRIORITIES = ["high","medium","low"];
const SOURCES    = [
  "Facebook","Instagram","TikTok","Google","WhatsApp","Landing Page",
  "Ad Form","Manual","Referral","Walk-in","Email","Website Form","Generic Webhook",
];
const LEGACY_STATUS_MAP = { new:"assigned", won:"delivered", cancelled:"failed", negotiation:"processing" };
function normaliseStatus(s) { return LEGACY_STATUS_MAP[s] || s || "assigned"; }

const STATUS_COLORS  = { assigned:"badge-blue", contacted:"badge-orange", qualified:"badge-yellow", processing:"badge-purple", delivered:"badge-green", failed:"badge-red", lost:"badge-red" };
const STATUS_ICONS   = { assigned:<Clock size={12}/>, contacted:<MessageSquare size={12}/>, qualified:<Star size={12}/>, processing:<TrendingUp size={12}/>, delivered:<CheckCircle size={12}/>, failed:<XCircle size={12}/>, lost:<XCircle size={12}/> };
const STATUS_LABELS  = { assigned:"Assigned", contacted:"Contacted", qualified:"Qualified", processing:"Processing", delivered:"Delivered", failed:"Failed", lost:"Lost" };
const PRIORITY_COLORS = { high:"text-red-400", medium:"text-orange-400", low:"text-green-400" };
const TYPE_ICONS      = { hot:"🔥", warm:"🌡️", cold:"❄️" };
const SOURCE_COLORS   = { Facebook:"rgba(24,119,242,0.15)", Instagram:"rgba(225,48,108,0.15)", TikTok:"rgba(255,0,80,0.15)", Google:"rgba(66,133,244,0.15)", "Ad Form":"rgba(34,197,94,0.15)", "Website Form":"rgba(99,102,241,0.15)", "Generic Webhook":"rgba(234,179,8,0.15)" };
const SOURCE_TEXT     = { Facebook:"#1877f2", Instagram:"#e1306c", TikTok:"#ff0050", Google:"#4285f4", "Ad Form":"#22c55e", "Website Form":"#6366f1", "Generic Webhook":"#eab308" };

function getMe() {
  if (typeof window==="undefined") return { role:"admin", email:"", name:"" };
  try { const u=JSON.parse(localStorage.getItem("user")||"{}"); return { role:u.role||"admin", email:u.email||"", name:u.firstName||u.email||"" }; }
  catch { return { role:"admin", email:"", name:"" }; }
}

function SourceBadge({ source }) {
  if (!source) return <span style={{color:"var(--text-dim)"}}>—</span>;
  const isAd = ["Facebook","Instagram","TikTok","Google","Ad Form","Website Form","Generic Webhook"].includes(source);
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold"
      style={{background:SOURCE_COLORS[source]||"var(--bg-hover)",color:SOURCE_TEXT[source]||"var(--text-muted)"}}>
      {isAd&&<Zap size={9}/>} {source}
    </span>
  );
}

function InfoRow({ icon, label, value, copyable }) {
  const [copied,setCopied]=useState(false);
  if (!value) return null;
  const copy=()=>{navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),1500);};
  return (
    <div className="flex items-start gap-3 py-2.5 border-b" style={{borderColor:"var(--border)"}}>
      <span className="mt-0.5" style={{color:"var(--text-muted)"}}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{color:"var(--text-dim)"}}>{label}</p>
        <p className="text-sm font-medium truncate" style={{color:"var(--text)"}}>{value}</p>
      </div>
      {copyable&&<button onClick={copy} className="shrink-0 mt-0.5 opacity-50 hover:opacity-100">{copied?<CheckCircle size={14} className="text-green-400"/>:<Copy size={14}/>}</button>}
    </div>
  );
}

function NoteParser({ text }) {
  if (!text) return <span style={{color:"var(--text-dim)"}}>No notes yet.</span>;
  const parts=text.split("\n---\n"); const mainNote=parts[0];
  const metaItems=parts.slice(1).join("\n---\n")?parts.slice(1).join("\n---\n").split(" | ").map(s=>s.trim()):[];
  return (
    <div className="space-y-2">
      {mainNote&&<p className="text-sm whitespace-pre-wrap" style={{color:"var(--text)"}}>{mainNote}</p>}
      {metaItems.length>0&&<div className="flex flex-wrap gap-1.5 pt-1">{metaItems.map((item,i)=><span key={i} className="text-[10px] px-2 py-0.5 rounded font-mono" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}>{item}</span>)}</div>}
    </div>
  );
}

function EditModal({ lead, onClose, onSaved }) {
  const ns=normaliseStatus(lead.status);
  const [form,setForm]=useState({ name:lead.name||"", email:lead.email||"", phone:lead.phone||"", company:lead.company||"", source:lead.source||"Manual", channel:lead.channel||"", status:ns, leadType:lead.leadType||"warm", priority:lead.priority||"medium", assignedTo:lead.assignedTo||"", campaignName:lead.campaignName||"", adSet:lead.adSet||"", formName:lead.formName||"", expectedValue:lead.expectedValue||"", followUpDate:lead.followUpDate?lead.followUpDate.slice(0,10):"", lostReason:lead.lostReason||"", notes:lead.notes||"" });
  const [saving,setSaving]=useState(false); const [err,setErr]=useState("");
  const save=async()=>{setSaving(true);setErr("");try{const u=await updateLead(lead.id,form);onSaved(u.data?.data||u.data);}catch(e){setErr(e.message||"Failed to save");}finally{setSaving(false);}};
  const field=(label,key,type="text",options=null)=>(<div><label className="block text-[11px] uppercase tracking-wide mb-1" style={{color:"var(--text-dim)"}}>{label}</label>{options?<select className="input w-full" value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}>{options.map(o=><option key={Array.isArray(o)?o[0]:o} value={Array.isArray(o)?o[0]:o}>{Array.isArray(o)?o[1]:o}</option>)}</select>:type==="textarea"?<textarea rows={4} className="input w-full" value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}/>:<input type={type} className="input w-full" value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}/>}</div>);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-2xl w-full" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold" style={{color:"var(--text)"}}>Edit Lead</h2><button onClick={onClose} className="icon-btn"><XCircle size={18}/></button></div>
        {err&&<div className="alert alert-error mb-3 text-sm">{err}</div>}
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {field("Full Name","name")}{field("Email","email","email")}{field("Phone","phone","tel")}{field("Company","company")}
          {field("Source","source","text",SOURCES)}{field("Channel","channel")}
          {field("Stage","status","text",STATUSES.map(s=>[s,STATUS_LABELS[s]]))}
          {field("Lead Type","leadType","text",LEAD_TYPES)}{field("Priority","priority","text",PRIORITIES)}
          {field("Assigned Rep","assignedTo")}{field("Campaign","campaignName")}{field("Ad Set","adSet")}{field("Form Name","formName")}
          {field("Expected Value","expectedValue","number")}{field("Follow-Up Date","followUpDate","date")}
          {form.status==="lost"&&field("Lost Reason","lostReason")}
          {form.status==="failed"&&field("Failure Reason","lostReason")}
          <div className="col-span-2">{field("Notes","notes","textarea")}</div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<RefreshCw size={14} className="animate-spin"/>:null} Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function AddNoteModal({ lead, onClose, onSaved }) {
  const [note,setNote]=useState(""); const [saving,setSaving]=useState(false);
  const save=async()=>{if(!note.trim())return;setSaving(true);try{const ts=new Date().toLocaleString();const em=(lead.notes||"").split("\n---\n")[0];const meta=(lead.notes||"").split("\n---\n").slice(1).join("\n---\n");const nn=[em,`[${ts}] ${note.trim()}`].filter(Boolean).join("\n\n");const full=meta?`${nn}\n---\n${meta}`:nn;const u=await updateLead(lead.id,{notes:full});onSaved(u.data?.data||u.data);}catch{}finally{setSaving(false);}};
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md w-full" onClick={e=>e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-3" style={{color:"var(--text)"}}>Add Note</h2>
        <textarea rows={5} className="input w-full mb-3" placeholder="Write your note…" value={note} onChange={e=>setNote(e.target.value)} autoFocus/>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving||!note.trim()}>{saving?<RefreshCw size={14} className="animate-spin"/>:null} Add Note</button>
        </div>
      </div>
    </div>
  );
}

function StatusDropdown({ lead, onUpdated }) {
  const [open,setOpen]=useState(false); const [saving,setSaving]=useState(false);
  const ns=normaliseStatus(lead.status);
  const change=async(s)=>{setOpen(false);setSaving(true);try{const u=await updateLead(lead.id,{status:s});onUpdated(u.data?.data||u.data);}catch{}finally{setSaving(false);}};
  return (
    <div className="relative">
      <button className={`badge ${STATUS_COLORS[ns]||"badge-gray"} inline-flex items-center gap-1 capitalize cursor-pointer select-none`} onClick={()=>setOpen(o=>!o)} disabled={saving}>
        {saving?<RefreshCw size={10} className="animate-spin"/>:STATUS_ICONS[ns]}{STATUS_LABELS[ns]||ns}<ChevronDown size={10}/>
      </button>
      {open&&<div className="absolute left-0 top-full mt-1 z-50 card p-1 min-w-[160px] shadow-xl">{STATUSES.map(s=><button key={s} className="dropdown-item w-full text-left flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[var(--bg-hover)]" onClick={()=>change(s)}><span className={`badge ${STATUS_COLORS[s]} text-[10px]`}>{STATUS_LABELS[s]}</span></button>)}</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const { id }             = useParams();
  const router             = useRouter();
  const { format, symbol } = useCurrency();
  const me                 = getMe();

  const [lead,              setLead]              = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [invoices,          setInvoices]          = useState([]);
  const [invLoading,        setInvLoading]        = useState(false);
  const [showEdit,          setShowEdit]          = useState(false);
  const [showNote,          setShowNote]          = useState(false);
  const [creating,          setCreating]          = useState(false);
  const [err,               setErr]               = useState("");

  // Invoice builder state
  const [showInvoiceBuilder,setShowInvoiceBuilder]= useState(false);
  const [invoiceItems,      setInvoiceItems]      = useState([]);
  const [invoiceWarehouse,  setInvoiceWarehouse]  = useState("");
  const [invoiceDueDate,    setInvoiceDueDate]    = useState("");
  const [invoiceNotes,      setInvoiceNotes]      = useState("");
  const [warehouses,        setWarehouses]        = useState([]);
  const [inventory,         setInventory]         = useState([]);
  const [loadingResources,  setLoadingResources]  = useState(false);

  const canEdit   = ["admin","manager","sales","sales_rep","staff"].includes(me.role);
  const canDelete = ["admin","manager"].includes(me.role);

  const load = useCallback(async()=>{
    setLoading(true); setErr("");
    try { const r=await getLead(id); setLead(r.data?.data||r.data); }
    catch(e) { setErr(e.message||"Lead not found"); }
    finally { setLoading(false); }
  },[id]);

  const loadInvoices = useCallback(async()=>{
    setInvLoading(true);
    try { const r=await getInvoices({limit:500}); const all=Array.isArray(r.data)?r.data:Array.isArray(r.data?.data)?r.data.data:[]; setInvoices(all); }
    catch {}
    finally { setInvLoading(false); }
  },[]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{loadInvoices();},[loadInvoices]);

  const handleSaved=(updated)=>{ if(updated) setLead(p=>({...p,...updated})); setShowEdit(false); setShowNote(false); load(); };

  // ── Invoice Builder ────────────────────────────────────────────────────────
  const openInvoiceBuilder = async () => {
    setLoadingResources(true);
    setShowInvoiceBuilder(true);
    try {
      const [whRes,invRes] = await Promise.allSettled([
        api.get('/warehouses'),
        api.get('/inventory?limit=500'),
      ]);
      const whs   = whRes.status==="fulfilled"  ? (Array.isArray(whRes.value?.data)  ? whRes.value.data  : []) : [];
      const prods = invRes.status==="fulfilled" ? (Array.isArray(invRes.value?.data) ? invRes.value.data : []) : [];
      setWarehouses(whs);
      setInventory(prods);
      const defWH = whs.find(w=>w.isDefault)||whs[0];
      if (defWH) setInvoiceWarehouse(defWH.id);
      setInvoiceItems([{
        productId:"", variantIdx:null,
        description: lead.company ? `Service for ${lead.name} (${lead.company})` : `Service for ${lead.name}`,
        quantity:1, unitPrice: Number(lead.expectedValue)||"", productObj:null,
      }]);
      setInvoiceDueDate("");
      setInvoiceNotes(`Invoice for lead: ${lead.name}`);
    } catch(e) { console.error(e); }
    finally { setLoadingResources(false); }
  };

  const pickInvoiceProduct = (i, productId) => {
    const prod = inventory.find(p=>p.id===productId);
    setInvoiceItems(prev => prev.map((it,j) => j!==i ? it : {
      ...it, productId, variantIdx:null,
      description: prod?.name || "",
      unitPrice:   prod?.price || prod?.sellingPrice || "",
      productObj:  prod || null,
    }));
  };

  const pickInvoiceVariant = (i, variantIdx) => {
    const prod     = invoiceItems[i]?.productObj;
    const variants = prod?.customFields?.variants || [];
    const v        = variants[Number(variantIdx)];
    setInvoiceItems(prev => prev.map((it,j) => j!==i ? it : {
      ...it, variantIdx,
      description: v ? `${prod.name} — ${v.name}` : prod?.name||"",
      unitPrice:   v?.sellingPrice || it.unitPrice,
    }));
  };

  const submitInvoiceFromLead = async () => {
    setCreating(true);
    try {
      const items = invoiceItems
        .filter(i=>i.description.trim()&&Number(i.quantity)>0)
        .map(i=>({ description:i.description, quantity:Number(i.quantity), unitPrice:Number(i.unitPrice)||0, productId:i.productId||null }));
      if (!items.length) { alert("Add at least one item."); setCreating(false); return; }
      await createInvoice({
        contactName:  lead.name||"Customer",
        contactEmail: lead.email||"",
        contactPhone: lead.phone||"",
        items,
        status:      "draft",
        warehouseId: invoiceWarehouse||null,
        dueDate:     invoiceDueDate||null,
        notes:       invoiceNotes,
      });
      setShowInvoiceBuilder(false);
      await loadInvoices();
      router.push("/erp/finance");
    } catch(e) { alert("Failed to create invoice: "+(e?.response?.data?.message||e.message)); }
    finally { setCreating(false); }
  };

  const handleConvert = async()=>{
    if (!window.confirm("Mark this lead as delivered and convert to customer?")) return;
    try { await updateLead(id,{status:"delivered",convertedAt:new Date().toISOString()}); router.push(`/crm/contacts?search=${encodeURIComponent(lead.email||lead.name)}`); }
    catch(e) { alert(e.message); }
  };

  const handleDelete = async()=>{
    if (!window.confirm("Delete this lead? This cannot be undone.")) return;
    try { const {deleteLead}=await import("@/lib/api"); await deleteLead(id); router.push("/crm/leads"); }
    catch(e) { alert(e.message); }
  };

  if (loading) return <div className="p-8 flex items-center justify-center min-h-[50vh]"><RefreshCw size={24} className="animate-spin" style={{color:"var(--text-dim)"}}/></div>;
  if (err||!lead) return <div className="p-8 flex flex-col items-center gap-4 min-h-[50vh] justify-center"><AlertCircle size={32} style={{color:"var(--text-dim)"}}/><p style={{color:"var(--text-muted)"}}>{err||"Lead not found"}</p><Link href="/crm/leads" className="btn btn-ghost">← Back to Leads</Link></div>;

  const ns           = normaliseStatus(lead.status);
  const noteParts    = (lead.notes||"").split("\n---\n");
  const metaString   = noteParts.slice(1).join(" | ");
  const metaEntries  = metaString ? metaString.split(" | ").reduce((acc,item)=>{const [k,...v]=item.split(":");if(k&&v.length)acc[k.trim()]=v.join(":").trim();return acc;},{}) : {};
  const daysOpen     = lead.createdAt ? Math.floor((Date.now()-new Date(lead.createdAt))/86400000) : null;
  const followUpOverdue = lead.followUpDate&&new Date(lead.followUpDate)<new Date()&&!["delivered","failed","lost"].includes(ns);
  const linkedInvoices  = invoices.filter(inv=>inv.contactName?.toLowerCase()===lead.name?.toLowerCase()||(inv.contactEmail&&inv.contactEmail===lead.email));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">

      {showEdit&&<EditModal lead={lead} onClose={()=>setShowEdit(false)} onSaved={handleSaved}/>}
      {showNote&&<AddNoteModal lead={lead} onClose={()=>setShowNote(false)} onSaved={handleSaved}/>}

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/crm/leads" className="icon-btn"><ArrowLeft size={18}/></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate" style={{color:"var(--text)"}}>{lead.name}</h1>
            <span className="text-base">{TYPE_ICONS[lead.leadType]}</span>
            <StatusDropdown lead={lead} onUpdated={handleSaved}/>
          </div>
          {lead.company&&<p className="text-sm mt-0.5" style={{color:"var(--text-muted)"}}><Building2 size={12} className="inline mr-1"/>{lead.company}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          {canEdit&&<button className="btn btn-ghost btn-sm" onClick={()=>setShowEdit(true)}><Edit size={14}/> Edit</button>}
          {canDelete&&<button className="btn btn-ghost btn-sm text-red-400" onClick={handleDelete}><Trash2 size={14}/></button>}
        </div>
      </div>

      {ns==="delivered"&&(
        <div className="p-3 rounded-2xl flex items-center gap-3" style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.3)"}}>
          <CheckCircle size={16} className="text-green-400 flex-shrink-0"/>
          <p className="text-sm" style={{color:"var(--text-muted)"}}>
            This lead is <strong style={{color:"#22c55e"}}>Delivered</strong> — an order has been created automatically.{" "}
            <Link href="/erp/finance" className="underline font-semibold" style={{color:"#22c55e"}}>Go to Finance</Link>{" "}to raise the invoice.
          </p>
        </div>
      )}

      {canEdit&&(
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary btn-sm" onClick={openInvoiceBuilder} disabled={creating}>
            <FileText size={14}/> {creating?"Creating...":"Create Invoice"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowNote(true)}><Plus size={14}/> Add Note</button>
          {!["delivered","lost"].includes(ns)&&<button className="btn btn-ghost btn-sm" onClick={handleConvert}><CheckCircle size={14}/> Mark Delivered</button>}
          {lead.email&&<a href={`mailto:${lead.email}`} className="btn btn-ghost btn-sm"><Mail size={14}/> Email</a>}
          {lead.phone&&<a href={`tel:${lead.phone}`} className="btn btn-ghost btn-sm"><Phone size={14}/> Call</a>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:"var(--text-dim)"}}>Contact Info</h3>
            <InfoRow icon={<Mail size={14}/>}      label="Email"   value={lead.email}   copyable/>
            <InfoRow icon={<Phone size={14}/>}     label="Phone"   value={lead.phone}   copyable/>
            <InfoRow icon={<Building2 size={14}/>} label="Company" value={lead.company}/>
          </div>
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:"var(--text-dim)"}}>Lead Details</h3>
            <InfoRow icon={<Zap size={14}/>}      label="Source"       value={lead.source}/>
            <InfoRow icon={<Globe size={14}/>}    label="Channel"      value={lead.channel}/>
            <InfoRow icon={<User size={14}/>}     label="Assigned Rep" value={lead.assignedTo}/>
            <InfoRow icon={<Tag size={14}/>}      label="Campaign"     value={lead.campaignName}/>
            <InfoRow icon={<Tag size={14}/>}      label="Ad Set"       value={lead.adSet}/>
            <InfoRow icon={<FileText size={14}/>} label="Form Name"    value={lead.formName}/>
            {metaEntries.marketer  &&<InfoRow icon={<User size={14}/>} label="Marketer"  value={metaEntries.marketer}/>}
            {metaEntries.sales_rep &&<InfoRow icon={<User size={14}/>} label="Sales Rep" value={metaEntries.sales_rep}/>}
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-[10px] uppercase tracking-wide" style={{color:"var(--text-dim)"}}>Priority</span>
                <span className={`text-sm font-semibold capitalize ${PRIORITY_COLORS[lead.priority]}`}>{lead.priority||"—"}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[10px] uppercase tracking-wide" style={{color:"var(--text-dim)"}}>Lead Type</span>
                <span className="text-sm font-medium capitalize">{TYPE_ICONS[lead.leadType]} {lead.leadType}</span>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:"var(--text-dim)"}}>Value & Timeline</h3>
            {lead.expectedValue&&(
              <div className="flex items-center justify-between py-2 border-b" style={{borderColor:"var(--border)"}}>
                <div className="flex items-center gap-2"><DollarSign size={14} style={{color:"var(--text-muted)"}}/><span className="text-[11px] uppercase" style={{color:"var(--text-dim)"}}>Expected Value</span></div>
                <span className="text-base font-bold" style={{color:"var(--text)"}}>{format?format(Number(lead.expectedValue)):`${symbol}${Number(lead.expectedValue).toLocaleString()}`}</span>
              </div>
            )}
            <div className="space-y-2 mt-2">
              {lead.followUpDate&&(
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5" style={{color:"var(--text-muted)"}}><Calendar size={13}/><span className="text-[11px]">Follow-up</span></div>
                  <span className={`text-sm font-medium ${followUpOverdue?"text-red-400":""}`}>{followUpOverdue&&<AlertCircle size={12} className="inline mr-1"/>}{fmtDate?fmtDate(lead.followUpDate):new Date(lead.followUpDate).toLocaleDateString()}</span>
                </div>
              )}
              {lead.convertedAt&&<div className="flex items-center justify-between py-1"><span className="text-[11px]" style={{color:"var(--text-dim)"}}>Converted</span><span className="text-sm text-green-400">{new Date(lead.convertedAt).toLocaleDateString()}</span></div>}
              {lead.createdAt&&<div className="flex items-center justify-between py-1"><span className="text-[11px]" style={{color:"var(--text-dim)"}}>Created</span><span className="text-sm">{new Date(lead.createdAt).toLocaleDateString()}</span></div>}
              {daysOpen!==null&&!["delivered","failed","lost"].includes(ns)&&<div className="flex items-center justify-between py-1"><span className="text-[11px]" style={{color:"var(--text-dim)"}}>Days Open</span><span className={`text-sm font-semibold ${daysOpen>30?"text-red-400":daysOpen>14?"text-orange-400":"text-green-400"}`}>{daysOpen}d</span></div>}
            </div>
            {lead.lostReason&&<div className="mt-3 p-2 rounded" style={{background:"rgba(239,68,68,0.1)"}}><p className="text-[10px] uppercase tracking-wide text-red-400 mb-1">Reason</p><p className="text-sm" style={{color:"var(--text)"}}>{lead.lostReason}</p></div>}
          </div>
          {lead.tags?.length>0&&<div className="card p-4"><h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:"var(--text-dim)"}}>Tags</h3><div className="flex flex-wrap gap-1.5">{lead.tags.map(tag=><span key={tag.id} className="badge badge-gray text-xs">{tag.name}</span>)}</div></div>}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{color:"var(--text-dim)"}}>Notes & Activity</h3>
              {canEdit&&<button className="btn btn-ghost btn-xs" onClick={()=>setShowNote(true)}><Plus size={12}/> Add Note</button>}
            </div>
            <NoteParser text={lead.notes}/>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{color:"var(--text-dim)"}}>Linked Invoices</h3>
              {canEdit&&<button className="btn btn-ghost btn-xs" onClick={openInvoiceBuilder} disabled={creating}><Plus size={12}/> {creating?"Creating...":"New Invoice"}</button>}
            </div>
            {invLoading?(
              <div className="flex items-center gap-2 py-4" style={{color:"var(--text-dim)"}}><RefreshCw size={14} className="animate-spin"/> Loading invoices…</div>
            ):linkedInvoices.length===0?(
              <div className="text-center py-6" style={{color:"var(--text-dim)"}}>
                <FileText size={24} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">No invoices linked to this lead yet.</p>
                {canEdit&&<button className="btn btn-ghost btn-sm mt-2" onClick={openInvoiceBuilder} disabled={creating}>{creating?"Creating...":"Create First Invoice"}</button>}
              </div>
            ):(
              <div className="space-y-2">
                {linkedInvoices.map(inv=>(
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg" style={{background:"var(--bg-hover)"}}>
                    <div className="flex items-center gap-3">
                      <FileText size={16} style={{color:"var(--text-muted)"}}/>
                      <div>
                        <p className="text-sm font-medium" style={{color:"var(--text)"}}>{inv.invoiceNumber||`INV-${inv.id?.slice(-6)}`}</p>
                        <p className="text-[11px]" style={{color:"var(--text-muted)"}}>{inv.contactName} · {inv.createdAt?new Date(inv.createdAt).toLocaleDateString():""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{color:"var(--text)"}}>{format?format(Number(inv.total||0)):`${symbol}${Number(inv.total||0).toLocaleString()}`}</p>
                        <span className={`badge text-[10px] ${inv.status==="paid"?"badge-green":inv.status==="overdue"?"badge-red":inv.status==="sent"?"badge-orange":"badge-blue"}`}>{inv.status}</span>
                      </div>
                      <Link href="/erp/finance" className="icon-btn"><ExternalLink size={14}/></Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{color:"var(--text-dim)"}}>Pipeline Stage</h3>
            <div className="flex items-center">
              {STATUSES.map((s,i)=>{
                const ci=STATUSES.indexOf(ns); const isPast=i<ci; const isCurrent=i===ci; const isLast=i===STATUSES.length-1;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${isCurrent?s==="delivered"?"bg-green-500 text-white":s==="failed"||s==="lost"?"bg-red-500 text-white":"bg-blue-500 text-white":isPast?"bg-green-500/40 text-green-300":"bg-gray-700 text-gray-500"}`}>
                        {isCurrent?STATUS_ICONS[s]:isPast?"✓":i+1}
                      </div>
                      <span className={`text-[9px] uppercase tracking-wide text-center ${isCurrent?"font-bold":""}`} style={{color:isCurrent?"var(--text)":"var(--text-dim)"}}>{s}</span>
                    </div>
                    {!isLast&&<div className={`h-0.5 flex-none w-4 -mt-4 ${isPast||isCurrent?"bg-green-500/40":"bg-gray-700"}`}/>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Invoice Builder Modal ── */}
      {showInvoiceBuilder&&(
        <div className="modal-overlay" onClick={()=>setShowInvoiceBuilder(false)}>
          <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold" style={{color:"var(--text)"}}>Create Invoice</h2>
                <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>For {lead.name}{lead.company?` · ${lead.company}`:""}</p>
              </div>
              <button onClick={()=>setShowInvoiceBuilder(false)} className="icon-btn"><XCircle size={18}/></button>
            </div>

            {loadingResources?(
              <div className="py-12 flex items-center justify-center gap-2" style={{color:"var(--text-dim)"}}>
                <RefreshCw size={16} className="animate-spin"/> Loading inventory & warehouses...
              </div>
            ):(
              <div className="space-y-4">
                {/* Warehouse + Due Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide mb-1" style={{color:"var(--text-dim)"}}>Dispatch from Warehouse</label>
                    <select value={invoiceWarehouse} onChange={e=>setInvoiceWarehouse(e.target.value)} className="input w-full">
                      <option value="">Auto (highest stock)</option>
                      {warehouses.filter(w=>w.isActive!==false).map(w=>(
                        <option key={w.id} value={w.id}>{w.isDefault?"⚡ ":""}{w.name} · {w.country}</option>
                      ))}
                    </select>
                    <p className="text-[10px] mt-1" style={{color:"var(--text-muted)"}}>Stock deducted from this warehouse on creation</p>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide mb-1" style={{color:"var(--text-dim)"}}>Due Date</label>
                    <input type="date" value={invoiceDueDate} onChange={e=>setInvoiceDueDate(e.target.value)} className="input w-full"/>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] uppercase tracking-wide" style={{color:"var(--text-dim)"}}>Line Items</label>
                    <button type="button" onClick={()=>setInvoiceItems(p=>[...p,{productId:"",variantIdx:null,description:"",quantity:1,unitPrice:"",productObj:null}])}
                      className="btn btn-ghost btn-xs flex items-center gap-1"><Plus size={11}/> Add Item</button>
                  </div>
                  <div className="space-y-3">
                    {invoiceItems.map((item,i)=>{
                      const cf=item.productObj?.customFields||{};
                      const variants=cf.variants||[];
                      const hasVariants=cf.hasVariants&&variants.length>0;
                      return (
                        <div key={i} className="p-3 rounded-xl space-y-2" style={{background:"var(--bg-hover)",border:"1px solid var(--border)"}}>
                          {/* Product picker */}
                          <div className="flex gap-2">
                            <select value={item.productId||""} onChange={e=>pickInvoiceProduct(i,e.target.value)} className="input flex-1 text-sm">
                              <option value="">— Pick from inventory or type manually —</option>
                              {inventory.filter(p=>p.type!=="bundle").map(p=>(
                                <option key={p.id} value={p.id}>{p.name} · ₦{Number(p.price||p.sellingPrice||0).toLocaleString()} · {p.stock} in stock</option>
                              ))}
                            </select>
                            {invoiceItems.length>1&&<button type="button" onClick={()=>setInvoiceItems(p=>p.filter((_,j)=>j!==i))} className="text-red-400 flex-shrink-0"><XCircle size={15}/></button>}
                          </div>
                          {/* Variant picker */}
                          {hasVariants&&(
                            <div>
                              <label className="block text-[10px] uppercase tracking-wide mb-1" style={{color:"var(--text-dim)"}}>Select Variant *</label>
                              <select value={item.variantIdx??""} onChange={e=>pickInvoiceVariant(i,e.target.value)} className="input w-full text-sm">
                                <option value="">— Select variant —</option>
                                {variants.map((v,vi)=>(
                                  <option key={vi} value={vi}>{v.name}{v.sellingPrice?` · ₦${Number(v.sellingPrice).toLocaleString()}`:""}{v.stock!=null?` · ${v.stock} in stock`:""}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {/* Description + qty + price */}
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-6"><input value={item.description} onChange={e=>setInvoiceItems(p=>p.map((it,j)=>j===i?{...it,description:e.target.value}:it))} className="input w-full text-sm" placeholder="Item description"/></div>
                            <div className="col-span-2"><input type="number" min="1" value={item.quantity} onChange={e=>setInvoiceItems(p=>p.map((it,j)=>j===i?{...it,quantity:e.target.value}:it))} className="input w-full text-sm text-center" placeholder="Qty"/></div>
                            <div className="col-span-4"><input type="number" value={item.unitPrice} onChange={e=>setInvoiceItems(p=>p.map((it,j)=>j===i?{...it,unitPrice:e.target.value}:it))} className="input w-full text-sm" placeholder="Unit price (₦)"/></div>
                          </div>
                          {/* Stock warning */}
                          {item.productObj&&(()=>{
                            const qty=Number(item.quantity)||0; const stock=item.productObj.stock||0; if(!qty) return null;
                            return <p className={`text-[10px] ${qty>stock?"text-red-400":"text-orange-400"}`}>{qty>stock?`⚠ Only ${stock} units available — reduce quantity`:`📦 ${stock} in stock — will deduct ${qty} on creation`}</p>;
                          })()}
                          {/* Line subtotal */}
                          {Number(item.unitPrice)>0&&<p className="text-xs text-right font-semibold" style={{color:"var(--text-muted)"}}>Subtotal: ₦{(Number(item.quantity||1)*Number(item.unitPrice||0)).toLocaleString()}</p>}
                        </div>
                      );
                    })}
                  </div>
                  {/* Grand total */}
                  <div className="mt-3 p-3 rounded-xl flex items-center justify-between" style={{background:"var(--bg-hover)"}}>
                    <span className="text-sm font-semibold" style={{color:"var(--text-muted)"}}>Invoice Total</span>
                    <span className="text-base font-bold" style={{color:"var(--text)"}}>₦{invoiceItems.reduce((s,i)=>s+(Number(i.quantity||1)*Number(i.unitPrice||0)),0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wide mb-1" style={{color:"var(--text-dim)"}}>Notes</label>
                  <textarea value={invoiceNotes} onChange={e=>setInvoiceNotes(e.target.value)} rows={2} className="input w-full" placeholder="Optional notes..."/>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button className="btn btn-ghost" onClick={()=>setShowInvoiceBuilder(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={submitInvoiceFromLead} disabled={creating}>
                    {creating?<><RefreshCw size={14} className="animate-spin"/> Creating...</>:<><FileText size={14}/> Create Invoice</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}