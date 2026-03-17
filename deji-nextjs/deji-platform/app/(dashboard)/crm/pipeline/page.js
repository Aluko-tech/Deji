"use client";
import { useState, useEffect } from "react";
import { Plus, Search, Filter, X, Phone, Calendar, DollarSign, Target, Award, TrendingUp, Zap, RefreshCw } from "lucide-react";
import { inRange, fmtDate } from "@/lib/dateUtils";
import { getLeads, createLead, updateLead } from "@/lib/api";

// ── Stages — must match Leads page exactly ────────────────────────────────────
const STAGES = [
  { id:"assigned",   label:"Assigned",   emoji:"🆕", color:"#6366f1", bg:"rgba(99,102,241,0.12)"  },
  { id:"contacted",  label:"Contacted",  emoji:"📞", color:"#f97316", bg:"rgba(249,115,22,0.12)"  },
  { id:"qualified",  label:"Qualified",  emoji:"🔥", color:"#eab308", bg:"rgba(234,179,8,0.12)"   },
  { id:"processing", label:"Processing", emoji:"💬", color:"#8b5cf6", bg:"rgba(139,92,246,0.12)"  },
  { id:"delivered",  label:"Delivered",  emoji:"✅", color:"#22c55e", bg:"rgba(34,197,94,0.12)"   },
  { id:"failed",     label:"Failed",     emoji:"❌", color:"#ef4444", bg:"rgba(239,68,68,0.12)"   },
  { id:"lost",       label:"Lost",       emoji:"🚫", color:"#6b7280", bg:"rgba(107,114,128,0.12)" },
];

// Map old stage values from DB to new ones so existing leads still show
const LEGACY_MAP = {
  new:         "assigned",
  won:         "delivered",
  cancelled:   "failed",
  negotiation: "processing",
};

function normaliseStatus(status) {
  return LEGACY_MAP[status] || status;
}

const TYPE_ICONS = { hot:"🔥", warm:"🌡️", cold:"❄️" };
const PRIORITY_COLORS = { high:"text-red-400", medium:"text-orange-400", low:"text-green-400" };
const SOURCE_COLORS = {
  Facebook:"#1877f2", Instagram:"#e1306c", TikTok:"#ff0050",
  Google:"#4285f4", "Ad Form":"#22c55e", "Website Form":"#6366f1",
};
const AD_SOURCES = ["Facebook","Instagram","TikTok","Google","Ad Form","Website Form","Generic Webhook"];

const EMPTY = {
  name:"", phone:"", email:"", company:"", source:"Facebook", channel:"Facebook",
  status:"assigned", leadType:"warm", priority:"medium", assignedTo:"", marketerName:"",
  campaignName:"", adSet:"", expectedValue:"", followUpDate:"", notes:"",
};

function getMe() {
  if (typeof window==="undefined") return {role:"admin",email:"",name:""};
  try {
    const u = JSON.parse(localStorage.getItem("user")||"{}");
    return { role:u.role||"admin", email:u.email||"", name:(u.firstName||u.email||"") };
  } catch { return {role:"admin",email:"",name:""}; }
}

export default function PipelinePage() {
  const [leads,       setLeads]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters,     setFilters]     = useState({rep:"all",marketer:"all",channel:"all",type:"all",dateFrom:"",dateTo:""});
  const [showModal,   setShowModal]   = useState(false);
  const [editLead,    setEditLead]    = useState(null);
  const [form,        setForm]        = useState(EMPTY);
  const [saving,      setSaving]      = useState(false);
  const [dragging,    setDragging]    = useState(null);
  const [dragOver,    setDragOver]    = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const me = getMe();

  useEffect(() => { fetchLeads(); }, []);
  useEffect(() => {
    const interval = setInterval(() => fetchLeads(true), 30000);
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

  const handleDragStart = (e, lead) => { setDragging(lead); e.dataTransfer.effectAllowed="move"; };
  const handleDragOver  = (e, id)   => { e.preventDefault(); setDragOver(id); };
  const handleDrop = async (e, stageId) => {
    e.preventDefault(); setDragOver(null);
    if (!dragging || normaliseStatus(dragging.status)===stageId) return;
    // Optimistic update
    setLeads(p => p.map(l => l.id===dragging.id ? {...l, status:stageId} : l));
    try { await updateLead(dragging.id, { status: stageId }); }
    catch { fetchLeads(); }
    setDragging(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const p = {
        ...form,
        expectedValue: form.expectedValue ? Number(form.expectedValue) : null,
        followUpDate:  form.followUpDate ? new Date(form.followUpDate).toISOString() : null,
      };
      editLead ? await updateLead(editLead.id, p) : await createLead(p);
      await fetchLeads(); setShowModal(false); setEditLead(null); setForm(EMPTY);
    } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const openEdit = (lead) => {
    setEditLead(lead);
    setForm({
      name:lead.name||"", phone:lead.phone||"", email:lead.email||"",
      company:lead.company||"", source:lead.source||"Facebook",
      channel:lead.channel||"Facebook",
      status: normaliseStatus(lead.status||"assigned"),
      leadType:lead.leadType||"warm", priority:lead.priority||"medium",
      assignedTo:lead.assignedTo||"", marketerName:lead.marketerName||"",
      campaignName:lead.campaignName||"", adSet:lead.adSet||"",
      expectedValue:lead.expectedValue||"",
      followUpDate:lead.followUpDate?lead.followUpDate.split("T")[0]:"",
      notes:lead.notes||"",
    });
    setShowModal(true);
  };

  const reps      = [...new Set(leads.map(l=>l.assignedTo).filter(Boolean))];
  const marketers = [...new Set(leads.map(l=>l.marketerName).filter(Boolean))];
  const channels  = [...new Set(leads.map(l=>l.channel||l.source).filter(Boolean))];
  const adLeads   = leads.filter(l => AD_SOURCES.includes(l.source));

  const filtered = leads.filter(l => {
    if (search && !l.name?.toLowerCase().includes(search.toLowerCase()) &&
        !l.phone?.includes(search) && !l.campaignName?.toLowerCase().includes(search.toLowerCase()) &&
        !l.assignedTo?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.rep!=="all"      && l.assignedTo!==filters.rep) return false;
    if (filters.marketer!=="all" && l.marketerName!==filters.marketer) return false;
    if (filters.channel!=="all"  && (l.channel||l.source)!==filters.channel) return false;
    if (filters.type!=="all"     && l.leadType!==filters.type) return false;
    if (!inRange(l.createdAt, filters.dateFrom, filters.dateTo)) return false;
    return true;
  });

  const stageLeads = (id) => filtered.filter(l => normaliseStatus(l.status)===id);
  const stageVal   = (id) => stageLeads(id).reduce((s,l) => s+(l.expectedValue||0), 0);

  const deliveredLeads = leads.filter(l => normaliseStatus(l.status)==="delivered");
  const totalDelivered = deliveredLeads.reduce((s,l) => s+(l.expectedValue||0), 0);
  const totalPipe      = leads.filter(l => !["delivered","failed","lost"].includes(normaliseStatus(l.status))).reduce((s,l) => s+(l.expectedValue||0), 0);
  const convRate       = leads.length ? Math.round((deliveredLeads.length/leads.length)*100) : 0;
  const avgDeal        = deliveredLeads.length ? Math.round(totalDelivered/deliveredLeads.length) : 0;

  return (
    <div className="h-full flex flex-col space-y-4 pb-4 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-subtitle">
            {me.role==="sales" ? "Your assigned leads"
              : me.role==="marketer" ? "Your campaign leads"
              : `${leads.length} total · ${adLeads.length} from ads`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchLeads()} className="btn-secondary flex items-center gap-2" title="Refresh">
            <RefreshCw size={14}/>
            <span className="text-xs hidden md:inline">
              {lastRefresh.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
            </span>
          </button>
          {(me.role==="admin"||me.role==="manager"||me.role==="sales") && (
            <button onClick={() => { setEditLead(null); setForm(EMPTY); setShowModal(true); }}
              className="btn-primary flex items-center gap-2">
              <Plus size={15}/> Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Ad leads banner */}
      {adLeads.length > 0 && (
        <div className="p-3 rounded-2xl flex items-center gap-3 flex-shrink-0"
          style={{background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)"}}>
          <Zap size={15} style={{color:"#22c55e", flexShrink:0}}/>
          <p className="text-sm" style={{color:"var(--text-muted)"}}>
            <strong style={{color:"#22c55e"}}>{adLeads.length} leads</strong> came in from connected ad platforms — auto-assigned and ready to work. Pipeline refreshes every 30s.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label:"Pipeline Value",   value:`₦${totalPipe.toLocaleString()}`,      icon:<DollarSign size={16}/>, color:"#6366f1" },
          { label:"Delivered Revenue",value:`₦${totalDelivered.toLocaleString()}`, icon:<Award size={16}/>,      color:"#22c55e" },
          { label:"Conversion",       value:`${convRate}%`,                         icon:<Target size={16}/>,     color:"#f97316" },
          { label:"Avg Deal Size",    value:`₦${avgDeal.toLocaleString()}`,         icon:<TrendingUp size={16}/>, color:"#eab308" },
        ].map(k => (
          <div key={k.label} className="kpi-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{background:k.color+"22", color:k.color}}>{k.icon}</div>
            <div>
              <p className="text-lg font-bold"
                style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>{k.value}</p>
              <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3 flex-shrink-0">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search leads, reps, campaigns..." className="deji-input pl-9"/>
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
            style={{borderColor:showFilters?"var(--primary)":undefined, color:showFilters?"var(--primary)":undefined}}>
            <Filter size={14}/> Filters {showFilters?"▲":"▼"}
          </button>
        </div>
        {showFilters && (
          <div className="deji-card p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label:"Rep",      key:"rep",      opts:[["all","All Reps"],     ...reps.map(r=>[r,r])] },
              { label:"Marketer", key:"marketer", opts:[["all","All Marketers"],...marketers.map(m=>[m,m])] },
              { label:"Channel",  key:"channel",  opts:[["all","All Channels"], ...channels.map(c=>[c,c])] },
              { label:"Type",     key:"type",     opts:[["all","All Types"],["hot","🔥 Hot"],["warm","🌡️ Warm"],["cold","❄️ Cold"]] },
            ].map(f => (
              <div key={f.key}>
                <label className="deji-label">{f.label}</label>
                <select value={filters[f.key]} onChange={e=>setFilters(p=>({...p,[f.key]:e.target.value}))} className="deji-input text-sm">
                  {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
            <div><label className="deji-label">From</label>
              <input type="date" value={filters.dateFrom} onChange={e=>setFilters(p=>({...p,dateFrom:e.target.value}))} className="deji-input text-sm"/></div>
            <div><label className="deji-label">To</label>
              <input type="date" value={filters.dateTo} onChange={e=>setFilters(p=>({...p,dateTo:e.target.value}))} className="deji-input text-sm"/></div>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(s => (
            <div key={s.id} className="flex-shrink-0 w-64 h-96 rounded-2xl animate-pulse"
              style={{background:"var(--bg-surface)", border:"1px solid var(--border)"}}/>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {STAGES.map(stage => {
            const cards   = stageLeads(stage.id);
            const val     = stageVal(stage.id);
            const isDrop  = dragOver===stage.id;
            const adCount = cards.filter(l => AD_SOURCES.includes(l.source)).length;
            return (
              <div key={stage.id}
                className="flex-shrink-0 w-64 flex flex-col rounded-2xl transition-all duration-200"
                style={{
                  border:     `1px solid ${isDrop ? stage.color : "var(--border)"}`,
                  background: isDrop ? stage.bg : "var(--bg-surface)",
                  minHeight:  "400px",
                }}
                onDragOver={e => handleDragOver(e, stage.id)}
                onDrop={e => handleDrop(e, stage.id)}
                onDragLeave={() => setDragOver(null)}>

                {/* Column header */}
                <div className="p-4" style={{borderBottom:"1px solid var(--border)"}}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{stage.emoji}</span>
                    <span className="font-bold text-sm"
                      style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>
                      {stage.label}
                    </span>
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center ml-auto"
                      style={{background:stage.color}}>
                      {cards.length}
                    </span>
                  </div>
                  {val > 0 && (
                    <p className="text-xs font-bold" style={{color:stage.color}}>
                      ₦{val.toLocaleString()}
                    </p>
                  )}
                  {adCount > 0 && (
                    <p className="text-[9px] flex items-center gap-1 mt-1" style={{color:"#22c55e"}}>
                      <Zap size={8}/> {adCount} from ads
                    </p>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-24">
                  {cards.length === 0 ? (
                    <div className="flex items-center justify-center h-16 border-2 border-dashed rounded-xl"
                      style={{borderColor:"var(--border)"}}>
                      <p className="text-xs" style={{color:"var(--text-muted)"}}>Drop here</p>
                    </div>
                  ) : cards.map(lead => {
                    const isAdLead = AD_SOURCES.includes(lead.source);
                    return (
                      <div key={lead.id}
                        draggable
                        onDragStart={e => handleDragStart(e, lead)}
                        onClick={() => openEdit(lead)}
                        className="p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all"
                        style={{
                          background: "var(--bg-card)",
                          border: `1px solid ${isAdLead ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
                        }}>

                        {isAdLead && (
                          <div className="flex items-center gap-1 mb-2 -mt-0.5">
                            <Zap size={8} style={{color:"#22c55e"}}/>
                            <span className="text-[9px] font-bold"
                              style={{color: SOURCE_COLORS[lead.source] || "#22c55e"}}>
                              {lead.source}{lead.campaignName ? ` · ${lead.campaignName}` : ""}
                            </span>
                          </div>
                        )}

                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{background: isAdLead ? "#22c55e" : "var(--primary)"}}>
                              {lead.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold" style={{color:"var(--text-primary)"}}>{lead.name}</p>
                              {lead.company && <p className="text-[9px]" style={{color:"var(--text-muted)"}}>{lead.company}</p>}
                            </div>
                          </div>
                          <span className="text-sm">{TYPE_ICONS[lead.leadType]||"🌡️"}</span>
                        </div>

                        {lead.phone && (
                          <div className="flex items-center gap-1 text-[9px] mb-1.5" style={{color:"var(--text-muted)"}}>
                            <Phone size={8}/>{lead.phone}
                          </div>
                        )}

                        {lead.assignedTo
                          ? <div className="text-[9px] mb-1" style={{color:"var(--text-muted)"}}>👤 {lead.assignedTo}</div>
                          : <div className="text-[9px] mb-1 font-semibold" style={{color:"#eab308"}}>⏳ Unassigned</div>
                        }

                        <div className="flex items-center justify-between pt-2"
                          style={{borderTop:"1px solid var(--border)"}}>
                          <span className={`text-[9px] font-bold uppercase ${PRIORITY_COLORS[lead.priority]||""}`}>
                            {lead.priority}
                          </span>
                          <div className="flex items-center gap-2">
                            {lead.expectedValue > 0 && (
                              <span className="text-[9px] font-bold text-green-400">
                                ₦{Number(lead.expectedValue).toLocaleString()}
                              </span>
                            )}
                            {lead.followUpDate && (
                              <span className="text-[9px] flex items-center gap-0.5"
                                style={{color:new Date(lead.followUpDate)<=new Date()?"#f87171":"var(--text-muted)"}}>
                                <Calendar size={7}/>
                                {new Date(lead.followUpDate).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add to stage */}
                {(me.role==="admin"||me.role==="manager"||me.role==="sales") && (
                  <div className="p-3" style={{borderTop:"1px solid var(--border)"}}>
                    <button
                      onClick={() => { setEditLead(null); setForm({...EMPTY, status:stage.id}); setShowModal(true); }}
                      className="w-full py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                      style={{border:"1px dashed var(--border)", color:"var(--text-muted)"}}>
                      <Plus size={11}/> Add to {stage.label}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="deji-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold"
                style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>
                {editLead ? "Edit Lead" : "Add New Lead"}
              </h2>
              <button onClick={() => { setShowModal(false); setEditLead(null); }} style={{color:"var(--text-muted)"}}><X size={18}/></button>
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
                <div><label className="deji-label">Campaign</label>
                  <input value={form.campaignName} onChange={e=>setForm(p=>({...p,campaignName:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">Source</label>
                  <select value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))} className="deji-input">
                    {["Facebook","Instagram","TikTok","Google","WhatsApp","Landing Page","Ad Form","Manual","Referral","Walk-in","Website Form","Generic Webhook"].map(s => <option key={s}>{s}</option>)}
                  </select></div>
                <div><label className="deji-label">Marketer</label>
                  <input value={form.marketerName} onChange={e=>setForm(p=>({...p,marketerName:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">Assigned Rep</label>
                  <input value={form.assignedTo} onChange={e=>setForm(p=>({...p,assignedTo:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">Stage</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="deji-input">
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
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
                <div className="col-span-2"><label className="deji-label">Notes</label>
                  <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="deji-input resize-none" rows={2}/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditLead(null); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Saving..." : editLead ? "Update" : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}