"use client";
import { useCurrency } from "@/lib/currencyContext";
import { useState, useEffect } from "react";
import { Plus, Search, Filter, X, Phone, Mail, Calendar, Trash2, Edit, AlertCircle, Download, Zap, RefreshCw } from "lucide-react";
import { toDay, inRange, fmtDate } from "@/lib/dateUtils";
import { getLeads, createLead, updateLead, deleteLead } from "@/lib/api";

const STATUSES  = ["new","contacted","qualified","negotiation","won","lost"];
const SOURCES   = ["Facebook","Instagram","TikTok","Google","WhatsApp","Landing Page","Ad Form","Manual","Referral","Walk-in","Email","Website Form","Generic Webhook"];
const LEAD_TYPES = ["hot","warm","cold"];
const STATUS_COLORS = { new:"badge-blue",contacted:"badge-orange",qualified:"badge-yellow",negotiation:"badge-purple",won:"badge-green",lost:"badge-red" };
const TYPE_ICONS  = { hot:"🔥",warm:"🌡️",cold:"❄️" };
const PRIORITY_COLORS = { high:"text-red-400",medium:"text-orange-400",low:"text-green-400" };
const SOURCE_COLORS = {
  Facebook:"rgba(24,119,242,0.15)", Instagram:"rgba(225,48,108,0.15)",
  TikTok:"rgba(255,0,80,0.15)", Google:"rgba(66,133,244,0.15)",
  "Ad Form":"rgba(34,197,94,0.15)", "Website Form":"rgba(99,102,241,0.15)",
  "Generic Webhook":"rgba(234,179,8,0.15)",
};
const SOURCE_TEXT = {
  Facebook:"#1877f2", Instagram:"#e1306c", TikTok:"#ff0050",
  Google:"#4285f4", "Ad Form":"#22c55e", "Website Form":"#6366f1",
  "Generic Webhook":"#eab308",
};
const EMPTY = {
  name:"",email:"",phone:"",company:"",source:"Facebook",channel:"Facebook",
  status:"new",leadType:"warm",priority:"medium",
  assignedTo:"",      // sales rep email
  marketerEmail:"",   // digital marketer email
  campaignName:"",adSet:"",formName:"",expectedValue:"",followUpDate:"",notes:"",
};
const MANUAL_SOURCES = ["Manual","Walk-in","Referral","Returning Customer"];

function getMe() {
  if (typeof window==="undefined") return {role:"admin",email:"",name:""};
  try {
    const u = JSON.parse(localStorage.getItem("user")||"{}");
    return { role:u.role||"admin", email:u.email||"", name:(u.firstName||u.email||"") };
  } catch { return {role:"admin",email:"",name:""}; }
}

function SourceBadge({ source }) {
  if (!source) return <span style={{color:"var(--text-dim)"}}>—</span>;
  const isAd = ["Facebook","Instagram","TikTok","Google","Ad Form","Website Form","Generic Webhook"].includes(source);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{
        background: SOURCE_COLORS[source] || "var(--bg-hover)",
        color: SOURCE_TEXT[source] || "var(--text-muted)",
      }}>
      {isAd && <Zap size={8}/>}
      {source}
    </span>
  );
}

export default function LeadsPage() {
  const [leads,setLeads]         = useState([]);
  const { format, symbol } = useCurrency();
  const [loading,setLoading]     = useState(true);
  const [search,setSearch]       = useState("");
  const [activeTab,setActiveTab] = useState("all");
  const [showFilters,setShowFilters] = useState(false);
  const [filters,setFilters]     = useState({
    status:"all",source:"all",leadType:"all",priority:"all",
    assignedTo:"all",marketer:"all",dateFrom:"",dateTo:"",
  });
  const [showModal,setShowModal] = useState(false);
  const [editLead,setEditLead]   = useState(null);
  const [form,setForm]           = useState(EMPTY);
  const [saving,setSaving]       = useState(false);
  const [lastRefresh,setLastRefresh] = useState(new Date());
  const me = getMe();

  useEffect(() => { fetchLeads(); }, []);

  // Auto-refresh every 30s to catch incoming webhook leads
  useEffect(() => {
    const interval = setInterval(() => { fetchLeads(true); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeads = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await getLeads({ limit:500 });
      const all = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.leads || [];
      setLeads(all);
      setLastRefresh(new Date());
    } catch(e) { console.error(e); }
    finally { if (!silent) setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const isManual = MANUAL_SOURCES.includes(form.source);
      const p = {
        ...form,
        expectedValue:  form.expectedValue ? Number(form.expectedValue) : null,
        followUpDate:   form.followUpDate ? new Date(form.followUpDate).toISOString() : null,
        // Auto-assign manual entries to customer care
        assignedTo:     (isManual && !form.assignedTo) ? "customer_care" : form.assignedTo,
        marketerEmail:  form.marketerEmail || null,
      };
      editLead ? await updateLead(editLead.id, p) : await createLead(p);
      await fetchLeads(); setShowModal(false); setEditLead(null); setForm(EMPTY);
    } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (l) => {
    setEditLead(l);
    setForm({
      name:l.name||"", email:l.email||"", phone:l.phone||"", company:l.company||"",
      source:l.source||"Facebook", channel:l.channel||"Facebook",
      status:l.status||"new", leadType:l.leadType||"warm", priority:l.priority||"medium",
      assignedTo:l.assignedTo||"",
      marketerEmail: (() => {
        // Extract marketer email from notes trace line
        const m = (l.notes||"").match(/marketer:([^\s|]+)/);
        return m ? m[1] : "";
      })(),
      campaignName:l.campaignName||"", adSet:l.adSet||"", formName:l.formName||"",
      expectedValue:l.expectedValue||"",
      followUpDate:l.followUpDate?l.followUpDate.split("T")[0]:"", notes:l.notes||"",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this lead?")) return;
    try { await deleteLead(id); fetchLeads(); } catch(e) { alert(e.message); }
  };

  const reps      = [...new Set(leads.map(l=>l.assignedTo).filter(Boolean))];
  const marketers = [...new Set(leads.map(l=>l.marketerName).filter(Boolean))];
  const followUpDue = leads.filter(l => l.followUpDate && new Date(l.followUpDate)<=new Date() && !["won","lost"].includes(l.status));

  // Ad-sourced leads (from webhooks)
  const adLeads = leads.filter(l => ["Facebook","Instagram","TikTok","Google","Ad Form","Website Form","Generic Webhook"].includes(l.source));

  const filtered = leads.filter(l => {
    if (activeTab==="ad" && !["Facebook","Instagram","TikTok","Google","Ad Form","Website Form","Generic Webhook"].includes(l.source)) return false;
    if (activeTab!=="all" && activeTab!=="ad" && l.status!==activeTab) return false;
    if (search && !l.name?.toLowerCase().includes(search.toLowerCase()) &&
        !l.phone?.includes(search) && !l.email?.toLowerCase().includes(search.toLowerCase()) &&
        !l.campaignName?.toLowerCase().includes(search.toLowerCase()) &&
        !l.assignedTo?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.source!=="all" && l.source!==filters.source) return false;
    if (filters.leadType!=="all" && l.leadType!==filters.leadType) return false;
    if (filters.priority!=="all" && l.priority!==filters.priority) return false;
    if (filters.assignedTo!=="all" && l.assignedTo!==filters.assignedTo) return false;
    if (filters.marketer!=="all" && l.marketerName!==filters.marketer) return false;
    if (!inRange(l.createdAt, filters.dateFrom, filters.dateTo)) return false;
    return true;
  });

  const totalValue = filtered.reduce((s,l) => s+(l.expectedValue||0), 0);

  const exportCSV = () => {
    const rows = [
      "Name,Phone,Email,Source,Channel,Campaign,Ad Set,Rep,Marketer,Status,Type,Priority,Value,Follow Up,Created",
      ...filtered.map(l =>
        `"${l.name||""}","${l.phone||""}","${l.email||""}","${l.source||""}","${l.channel||""}","${l.campaignName||""}","${l.adSet||""}","${l.assignedTo||""}","${l.marketerName||""}","${l.status}","${l.leadType||""}","${l.priority||""}","${l.expectedValue||0}","${fmtDate(l.followUpDate)}","${fmtDate(l.createdAt)}"`
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(rows);
    a.download = "leads.csv"; a.click();
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">
            {leads.length} total · {leads.filter(l=>l.status==="won").length} won ·{" "}
            {adLeads.length} from ads · {followUpDue.length} follow-ups due
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchLeads()}
            className="btn-secondary flex items-center gap-2" title="Refresh">
            <RefreshCw size={14}/>
            <span className="text-xs hidden md:inline">
              {lastRefresh.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
            </span>
          </button>
          {me.role==="admin" && (
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
              <Download size={14}/> Export
            </button>
          )}
          <button onClick={() => { setEditLead(null); setForm(EMPTY); setShowModal(true); }}
            className="btn-primary flex items-center gap-2">
            <Plus size={15}/> Add Lead
          </button>
        </div>
      </div>

      {/* Follow-up alert */}
      {followUpDue.length > 0 && (
        <div className="p-3 rounded-2xl flex items-center gap-3"
          style={{background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.3)"}}>
          <AlertCircle size={16} className="text-orange-400 flex-shrink-0"/>
          <p className="text-sm font-semibold text-orange-400">
            {followUpDue.length} lead{followUpDue.length>1?"s":""} need follow-up:{" "}
            {followUpDue.slice(0,3).map(l=>l.name).join(", ")}{followUpDue.length>3?"...":""}
          </p>
        </div>
      )}

      {/* Ad leads banner */}
      {adLeads.length > 0 && (
        <div className="p-3 rounded-2xl flex items-center gap-3"
          style={{background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)"}}>
          <Zap size={16} style={{color:"#22c55e", flexShrink:0}}/>
          <p className="text-sm" style={{color:"var(--text-muted)"}}>
            <strong style={{color:"#22c55e"}}>{adLeads.length} leads</strong> came in automatically from your connected ad platforms.
            Page auto-refreshes every 30 seconds.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Hot Leads",      value:leads.filter(l=>l.leadType==="hot").length,    icon:"🔥", color:"#ef4444" },
          { label:"From Ads",       value:adLeads.length,                                 icon:"⚡", color:"#22c55e" },
          { label:"Follow-up Due",  value:followUpDue.length,                             icon:"📅", color:"#6366f1" },
          { label:"Pipeline Value", value:format(totalValue.toLocaleString()),              icon:"💰", color:"#22c55e" },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-2xl mb-2">{k.icon}</div>
            <p className="text-xl font-bold"
              style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>{k.value}</p>
            <p className="text-xs" style={{color:"var(--text-muted)"}}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name, phone, email, campaign, rep..."
              className="deji-input pl-9"/>
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
            style={{borderColor:showFilters?"var(--primary)":undefined, color:showFilters?"var(--primary)":undefined}}>
            <Filter size={14}/> Filters {showFilters?"▲":"▼"}
          </button>
        </div>

        {showFilters && (
          <div className="deji-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:"Source",   key:"source",     opts:[["all","All Sources"],   ...SOURCES.map(s=>[s,s])] },
              { label:"Type",     key:"leadType",   opts:[["all","All Types"],     ["hot","🔥 Hot"],["warm","🌡️ Warm"],["cold","❄️ Cold"]] },
              { label:"Priority", key:"priority",   opts:[["all","All Priorities"],["high","⚡ High"],["medium","➡️ Medium"],["low","⬇️ Low"]] },
              { label:"Rep",      key:"assignedTo", opts:[["all","All Reps"],      ...reps.map(r=>[r,r])] },
              { label:"Marketer", key:"marketer",   opts:[["all","All Marketers"], ...marketers.map(m=>[m,m])] },
            ].map(f => (
              <div key={f.key}>
                <label className="deji-label">{f.label}</label>
                <select value={filters[f.key]} onChange={e=>setFilters(p=>({...p,[f.key]:e.target.value}))} className="deji-input text-sm">
                  {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
            <div><label className="deji-label">From Date</label>
              <input type="date" value={filters.dateFrom} onChange={e=>setFilters(p=>({...p,dateFrom:e.target.value}))} className="deji-input text-sm"/></div>
            <div><label className="deji-label">To Date</label>
              <input type="date" value={filters.dateTo} onChange={e=>setFilters(p=>({...p,dateTo:e.target.value}))} className="deji-input text-sm"/></div>
            <div className="col-span-2 md:col-span-4 flex justify-end">
              <button onClick={() => setFilters({status:"all",source:"all",leadType:"all",priority:"all",assignedTo:"all",marketer:"all",dateFrom:"",dateTo:""})}
                className="btn-secondary text-xs py-1.5 px-3">Clear Filters</button>
            </div>
          </div>
        )}

        {/* Status tabs + Ad tab */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { k:"all", label:"All",       count:leads.length },
            { k:"ad",  label:"⚡ From Ads", count:adLeads.length },
            ...STATUSES.map(s => ({ k:s, label:s, count:leads.filter(l=>l.status===s).length })),
          ].map(t => (
            <button key={t.k} onClick={() => setActiveTab(t.k)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap capitalize"
              style={{
                background:  activeTab===t.k ? (t.k==="ad" ? "#22c55e" : "var(--primary)") : "transparent",
                color:       activeTab===t.k ? "#fff" : "var(--text-muted)",
                borderColor: activeTab===t.k ? (t.k==="ad" ? "#22c55e" : "var(--primary)") : "var(--border)",
              }}>
              {t.label} <span className="ml-1 opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="deji-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center" style={{color:"var(--text-muted)"}}>Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">👥</div>
            <p style={{color:"var(--text-muted)"}}>No leads found</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Add First Lead</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="deji-table w-full" style={{minWidth:"1000px"}}>
              <thead>
                <tr>
                  <th>Lead</th><th>Contact</th><th>Source / Campaign</th>
                  <th>Rep</th><th>Marketer</th><th>Type</th>
                  <th>Priority</th><th>Value</th><th>Follow Up</th>
                  <th>Status</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{background:"var(--primary)"}}>
                          {l.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{color:"var(--text-primary)"}}>{l.name}</p>
                          {l.company && <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{l.company}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        {l.email && <div className="flex items-center gap-1 text-[10px]" style={{color:"var(--text-muted)"}}><Mail size={9}/>{l.email}</div>}
                        {l.phone && <div className="flex items-center gap-1 text-[10px]" style={{color:"var(--text-muted)"}}><Phone size={9}/>{l.phone}</div>}
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <SourceBadge source={l.source}/>
                        {l.channel && l.channel!==l.source && (
                          <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{l.channel}</p>
                        )}
                        {l.campaignName && (
                          <p className="text-[10px]" style={{color:"var(--text-muted)"}}>📢 {l.campaignName}</p>
                        )}
                        {l.adSet && (
                          <p className="text-[9px]" style={{color:"var(--text-muted)"}}>Ad: {l.adSet}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      {l.assignedTo
                        ? <div>
                            <p className="text-xs font-semibold" style={{color:"var(--text-primary)"}}>{l.assignedTo}</p>
                            <p className="text-[9px]" style={{color:"var(--text-muted)"}}>Sales Rep</p>
                          </div>
                        : <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{background:"rgba(234,179,8,0.1)", color:"#eab308"}}>
                            ⏳ Unassigned
                          </span>
                      }
                    </td>
                    <td>
                      {l.marketerName
                        ? <span className="text-xs" style={{color:"var(--text-primary)"}}>{l.marketerName}</span>
                        : <span style={{color:"var(--text-dim)"}}>—</span>
                      }
                    </td>
                    <td>
                      <span className="text-sm">{TYPE_ICONS[l.leadType]||"🌡️"}</span>
                      <span className="text-[10px] ml-1 capitalize" style={{color:"var(--text-muted)"}}>{l.leadType||"warm"}</span>
                    </td>
                    <td>
                      <span className={`text-xs font-bold capitalize ${PRIORITY_COLORS[l.priority]||""}`}>
                        {l.priority||"medium"}
                      </span>
                    </td>
                    <td>
                      {l.expectedValue
                        ? <span className="text-xs font-bold text-green-400">{format(l.expectedValue)}</span>
                        : <span style={{color:"var(--text-dim)"}}>—</span>
                      }
                    </td>
                    <td>
                      {l.followUpDate
                        ? <div className="flex items-center gap-1 text-xs"
                            style={{color:new Date(l.followUpDate)<=new Date()?"#f87171":"var(--text-muted)"}}>
                            <Calendar size={10}/>{fmtDate(l.followUpDate)}
                          </div>
                        : <span style={{color:"var(--text-dim)"}}>—</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[l.status]||"badge-blue"} capitalize`}>
                        {l.status}
                      </span>
                    </td>
                    <td>
                      <span className="text-[10px]" style={{color:"var(--text-muted)"}}>{fmtDate(l.createdAt)}</span>
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(l)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{background:"var(--bg-hover)", color:"var(--text-muted)"}}>
                          <Edit size={12}/>
                        </button>
                        {(me.role==="admin"||me.role==="manager") && (
                          <button onClick={() => handleDelete(l.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400"
                            style={{background:"var(--bg-hover)", color:"var(--text-muted)"}}>
                            <Trash2 size={12}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="deji-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold"
                style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>
                {editLead ? "Edit Lead" : "Add New Lead"}
              </h2>
              <button onClick={() => { setShowModal(false); setEditLead(null); }}
                style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="deji-label">Full Name *</label>
                  <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="deji-input" required/>
                </div>
                <div><label className="deji-label">Phone</label>
                  <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">Email</label>
                  <input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} className="deji-input"/></div>
                <div className="col-span-2"><label className="deji-label">Company</label>
                  <input value={form.company} onChange={e=>setForm(p=>({...p,company:e.target.value}))} className="deji-input"/></div>
              </div>

              <div style={{borderTop:"1px solid var(--border)", paddingTop:"1rem"}}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:"var(--text-muted)"}}>Attribution</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="deji-label">Source</label>
                    <select value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))} className="deji-input">
                      {SOURCES.map(s=><option key={s}>{s}</option>)}
                    </select></div>
                  <div><label className="deji-label">Channel</label>
                    <input value={form.channel} onChange={e=>setForm(p=>({...p,channel:e.target.value}))} className="deji-input" placeholder="e.g. Facebook Lead Ad"/></div>
                  <div><label className="deji-label">Campaign Name</label>
                    <input value={form.campaignName} onChange={e=>setForm(p=>({...p,campaignName:e.target.value}))} className="deji-input" placeholder="Lagos Summer Sale"/></div>
                  <div><label className="deji-label">Ad Set</label>
                    <input value={form.adSet} onChange={e=>setForm(p=>({...p,adSet:e.target.value}))} className="deji-input"/></div>
                  <div><label className="deji-label">Digital Marketer</label>
                    <input value={form.marketerName} onChange={e=>setForm(p=>({...p,marketerName:e.target.value}))} className="deji-input"/></div>
                  <div><label className="deji-label">Assigned Sales Rep</label>
                    <input value={form.assignedTo} onChange={e=>setForm(p=>({...p,assignedTo:e.target.value}))} className="deji-input"/></div>
                </div>
              </div>

              <div style={{borderTop:"1px solid var(--border)", paddingTop:"1rem"}}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:"var(--text-muted)"}}>Qualification</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="deji-label">Stage</label>
                    <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="deji-input">
                      {STATUSES.map(s=><option key={s} className="capitalize">{s}</option>)}
                    </select></div>
                  <div><label className="deji-label">Lead Type</label>
                    <select value={form.leadType} onChange={e=>setForm(p=>({...p,leadType:e.target.value}))} className="deji-input">
                      <option value="hot">🔥 Hot</option>
                      <option value="warm">🌡️ Warm</option>
                      <option value="cold">❄️ Cold</option>
                    </select></div>
                  <div><label className="deji-label">Priority</label>
                    <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} className="deji-input">
                      <option value="high">⚡ High</option>
                      <option value="medium">➡️ Medium</option>
                      <option value="low">⬇️ Low</option>
                    </select></div>
                  <div><label className="deji-label">Expected Value (₦)</label>
                    <input type="number" value={form.expectedValue} onChange={e=>setForm(p=>({...p,expectedValue:e.target.value}))} className="deji-input"/></div>
                  <div className="col-span-2"><label className="deji-label">Follow-up Date</label>
                    <input type="date" value={form.followUpDate} onChange={e=>setForm(p=>({...p,followUpDate:e.target.value}))} className="deji-input"/></div>
                </div>
              </div>

              <div><label className="deji-label">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="deji-input resize-none" rows={2}/></div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditLead(null); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Saving..." : editLead ? "Update Lead" : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}