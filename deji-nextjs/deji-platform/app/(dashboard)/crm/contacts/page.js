"use client";
import { useState, useEffect } from "react";
import {
  Plus, Search, X, Edit, Trash2, MessageCircle,
  Building, MapPin, User, Mail, Phone, Zap, Download, Filter,
} from "lucide-react";
import { fmtDate } from "@/lib/dateUtils";
import { getContacts, createContact, updateContact, deleteContact } from "@/lib/api";

const TYPES = ["customer","supplier","partner","staff","prospect"];
const TYPE_COLORS = {
  customer:"badge-green", supplier:"badge-blue",
  partner:"badge-purple", staff:"badge-orange", prospect:"badge-red",
};
const TYPE_ICONS = {
  customer:"👤", supplier:"🏭", partner:"🤝", staff:"👔", prospect:"🎯",
};
const AD_SOURCES = ["Facebook","Instagram","TikTok","Google","Ad Form","Website Form","Generic Webhook"];
const SOURCE_COLORS = {
  Facebook:"#1877f2", Instagram:"#e1306c", TikTok:"#ff0050",
  Google:"#4285f4", "Ad Form":"#22c55e", "Website Form":"#6366f1", "Generic Webhook":"#eab308",
};
const EMPTY = {
  name:"", email:"", phone:"", company:"", type:"customer",
  address:"", city:"", state:"", assignedTo:"", source:"", notes:"",
};

function getMe() {
  if (typeof window==="undefined") return {role:"admin",name:""};
  try {
    const u = JSON.parse(localStorage.getItem("user")||"{}");
    return { role:u.role||"admin", name:(u.firstName||u.email||"") };
  } catch { return {role:"admin",name:""}; }
}

export default function ContactsPage() {
  const [contacts,setContacts]   = useState([]);
  const [loading,setLoading]     = useState(true);
  const [search,setSearch]       = useState("");
  const [filterType,setFilterType] = useState("all");
  const [filterSource,setFilterSource] = useState("all");
  const [showFilters,setShowFilters]   = useState(false);
  const [showModal,setShowModal]       = useState(false);
  const [editContact,setEditContact]   = useState(null);
  const [selected,setSelected]         = useState(null);
  const [form,setForm]                 = useState(EMPTY);
  const [saving,setSaving]             = useState(false);
  const me = getMe();

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await getContacts({ limit:500 });
      let all = Array.isArray(res.data) ? res.data : res.data?.contacts || res.data?.data || [];
      if (me.role==="sales") all = all.filter(c => c.assignedTo?.toLowerCase()===me.name?.toLowerCase());
      setContacts(all);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editContact ? await updateContact(editContact.id, form) : await createContact(form);
      await fetchContacts(); setShowModal(false); setEditContact(null); setForm(EMPTY);
    } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (c) => {
    setEditContact(c);
    setForm({
      name:c.name||"", email:c.email||"", phone:c.phone||"",
      company:c.company||"", type:c.type||"customer",
      address:c.address||"", city:c.city||"", state:c.state||"",
      assignedTo:c.assignedTo||"", source:c.source||"", notes:c.notes||"",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this contact?")) return;
    try {
      await deleteContact(id);
      fetchContacts();
      if (selected?.id===id) setSelected(null);
    } catch(e) { alert(e.message); }
  };

  const handleWA = (c) => {
    const p = c.phone?.replace(/\D/g,"");
    if (!p) return alert("No phone number");
    window.open("https://wa.me/" + (p.startsWith("0") ? "234"+p.slice(1) : p), "_blank");
  };

  const exportCSV = () => {
    const rows = [
      "Name,Phone,Email,Company,Type,Source,City,State,Rep,Created",
      ...filtered.map(c =>
        `"${c.name||""}","${c.phone||""}","${c.email||""}","${c.company||""}","${c.type||""}","${c.source||""}","${c.city||""}","${c.state||""}","${c.assignedTo||""}","${fmtDate(c.createdAt)}"`
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(rows);
    a.download = "contacts.csv"; a.click();
  };

  const typeCounts   = TYPES.reduce((a,t) => ({...a, [t]:contacts.filter(c=>c.type===t).length}), {});
  const adContacts   = contacts.filter(c => AD_SOURCES.includes(c.source));
  const allSources   = [...new Set(contacts.map(c=>c.source).filter(Boolean))];

  const filtered = contacts.filter(c => {
    if (filterType!=="all" && c.type!==filterType) return false;
    if (filterSource!=="all" && c.source!==filterSource) return false;
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) &&
        !c.email?.toLowerCase().includes(search.toLowerCase()) &&
        !c.phone?.includes(search) &&
        !c.company?.toLowerCase().includes(search.toLowerCase()) &&
        !c.city?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="page-subtitle">
            {contacts.length} total · {typeCounts.customer||0} customers ·{" "}
            {typeCounts.supplier||0} suppliers · {adContacts.length} from ads
          </p>
        </div>
        <div className="flex gap-2">
          {me.role==="admin" && (
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
              <Download size={14}/> Export
            </button>
          )}
          <button onClick={() => { setEditContact(null); setForm(EMPTY); setShowModal(true); }}
            className="btn-primary flex items-center gap-2">
            <Plus size={15}/> Add Contact
          </button>
        </div>
      </div>

      {/* Ad contacts banner */}
      {adContacts.length > 0 && (
        <div className="p-3 rounded-2xl flex items-center gap-3"
          style={{background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)"}}>
          <Zap size={15} style={{color:"#22c55e", flexShrink:0}}/>
          <p className="text-sm" style={{color:"var(--text-muted)"}}>
            <strong style={{color:"#22c55e"}}>{adContacts.length} contacts</strong> were created automatically from your connected ad platforms and website forms.
          </p>
        </div>
      )}

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label:"Customers",  value:typeCounts.customer||0,  icon:"👤", color:"#22c55e" },
          { label:"Suppliers",  value:typeCounts.supplier||0,  icon:"🏭", color:"#3b82f6" },
          { label:"Partners",   value:typeCounts.partner||0,   icon:"🤝", color:"#a855f7" },
          { label:"Prospects",  value:typeCounts.prospect||0,  icon:"🎯", color:"#f97316" },
          { label:"From Ads",   value:adContacts.length,        icon:"⚡", color:"#22c55e" },
        ].map(k => (
          <div key={k.label} className="kpi-card text-center cursor-pointer"
            onClick={() => setFilterType(k.label.toLowerCase()==="from ads" ? "all" : k.label.toLowerCase())}>
            <div className="text-xl mb-1">{k.icon}</div>
            <p className="text-xl font-bold"
              style={{fontFamily:"Playfair Display,serif", color:k.color}}>{k.value}</p>
            <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name, email, phone, company, city..."
              className="deji-input pl-9"/>
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
            style={{borderColor:showFilters?"var(--primary)":undefined, color:showFilters?"var(--primary)":undefined}}>
            <Filter size={14}/> Filter {showFilters?"▲":"▼"}
          </button>
        </div>

        {showFilters && (
          <div className="deji-card p-4 grid grid-cols-2 gap-3">
            <div>
              <label className="deji-label">Source</label>
              <select value={filterSource} onChange={e=>setFilterSource(e.target.value)} className="deji-input text-sm">
                <option value="all">All Sources</option>
                {allSources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setFilterType("all"); setFilterSource("all"); }}
                className="btn-secondary text-xs py-2 px-4 w-full">Clear Filters</button>
            </div>
          </div>
        )}

        {/* Type filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["all",...TYPES].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap capitalize"
              style={{
                background:  filterType===t ? "var(--primary)" : "transparent",
                color:       filterType===t ? "#fff" : "var(--text-muted)",
                borderColor: filterType===t ? "var(--primary)" : "var(--border)",
              }}>
              {t!=="all" && <span className="mr-1">{TYPE_ICONS[t]}</span>}
              {t==="all" ? "All" : t}
              <span className="ml-1 opacity-70">{t==="all" ? contacts.length : typeCounts[t]||0}</span>
            </button>
          ))}
          <button onClick={() => { setFilterSource("all"); setFilterType("all"); /* filter to ad sources */ setShowFilters(true); }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1"
            style={{
              background:  "transparent",
              color:       "var(--text-muted)",
              borderColor: "var(--border)",
            }}>
            <Zap size={10} style={{color:"#22c55e"}}/> From Ads
            <span className="ml-1 opacity-70">{adContacts.length}</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-44 rounded-2xl"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="deji-card p-12 text-center">
          <div className="text-5xl mb-3">👥</div>
          <p style={{color:"var(--text-muted)"}}>No contacts found</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Add First Contact</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const isAdContact = AD_SOURCES.includes(c.source);
            return (
              <div key={c.id}
                className="deji-card p-4 transition-all cursor-pointer"
                onClick={() => setSelected(c)}
                style={{
                  borderColor: selected?.id===c.id ? "var(--primary)"
                    : isAdContact ? "rgba(34,197,94,0.2)" : undefined,
                }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{background: isAdContact ? "#22c55e" : "var(--primary)"}}>
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{color:"var(--text-primary)"}}>{c.name}</p>
                      {c.company && (
                        <p className="text-[10px] flex items-center gap-1" style={{color:"var(--text-muted)"}}>
                          <Building size={9}/>{c.company}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${TYPE_COLORS[c.type]||"badge-blue"} capitalize text-[10px]`}>
                    {TYPE_ICONS[c.type]} {c.type}
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  {c.email && (
                    <div className="flex items-center gap-2 text-xs" style={{color:"var(--text-muted)"}}>
                      <Mail size={10}/>{c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2 text-xs" style={{color:"var(--text-muted)"}}>
                      <Phone size={10}/>{c.phone}
                    </div>
                  )}
                  {(c.city||c.state) && (
                    <div className="flex items-center gap-2 text-xs" style={{color:"var(--text-muted)"}}>
                      <MapPin size={10}/>{[c.city,c.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>

                {/* Source badge */}
                {c.source && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: (SOURCE_COLORS[c.source]||"var(--text-muted)") + "22",
                        color:       SOURCE_COLORS[c.source] || "var(--text-muted)",
                      }}>
                      {isAdContact && <Zap size={7}/>}
                      {c.source}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2"
                  style={{borderTop:"1px solid var(--border)"}}>
                  <span className="text-[10px]" style={{color:"var(--text-muted)"}}>
                    {fmtDate(c.createdAt)}
                  </span>
                  <div className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
                    <button onClick={() => handleWA(c)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{background:"rgba(34,197,94,0.1)", color:"#22c55e"}}>
                      <MessageCircle size={12}/>
                    </button>
                    <button onClick={() => handleEdit(c)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{background:"var(--bg-hover)", color:"var(--text-muted)"}}>
                      <Edit size={12}/>
                    </button>
                    {(me.role==="admin"||me.role==="manager") && (
                      <button onClick={() => handleDelete(c.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400"
                        style={{background:"var(--bg-hover)", color:"var(--text-muted)"}}>
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail slide-over */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm"
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm h-full overflow-y-auto p-6 space-y-5"
            style={{background:"var(--bg-surface)", borderLeft:"1px solid var(--border)"}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold"
                style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>
                Contact Details
              </h2>
              <button onClick={() => setSelected(null)} style={{color:"var(--text-muted)"}}>
                <X size={18}/>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
                style={{background: AD_SOURCES.includes(selected.source) ? "#22c55e" : "var(--primary)"}}>
                {selected.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-bold" style={{color:"var(--text-primary)"}}>{selected.name}</p>
                {selected.company && <p className="text-sm" style={{color:"var(--text-muted)"}}>{selected.company}</p>}
                <span className={`badge ${TYPE_COLORS[selected.type]||"badge-blue"} capitalize mt-1`}>
                  {TYPE_ICONS[selected.type]} {selected.type}
                </span>
              </div>
            </div>

            {/* Ad source info */}
            {AD_SOURCES.includes(selected.source) && (
              <div className="p-3 rounded-xl"
                style={{background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)"}}>
                <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{color:"#22c55e"}}>
                  <Zap size={11}/> Auto-captured from {selected.source}
                </p>
                {selected.campaignName && (
                  <p className="text-xs" style={{color:"var(--text-muted)"}}>📢 Campaign: {selected.campaignName}</p>
                )}
                {selected.assignedTo && (
                  <p className="text-xs" style={{color:"var(--text-muted)"}}>👤 Assigned to: {selected.assignedTo}</p>
                )}
              </div>
            )}

            <div className="deji-card p-4 space-y-3">
              {selected.email && (
                <div className="flex items-center gap-3">
                  <Mail size={14} style={{color:"var(--text-muted)"}}/>
                  <span className="text-sm" style={{color:"var(--text-primary)"}}>{selected.email}</span>
                </div>
              )}
              {selected.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={14} style={{color:"var(--text-muted)"}}/>
                  <span className="text-sm" style={{color:"var(--text-primary)"}}>{selected.phone}</span>
                </div>
              )}
              {selected.address && (
                <div className="flex items-center gap-3">
                  <MapPin size={14} style={{color:"var(--text-muted)"}}/>
                  <span className="text-sm" style={{color:"var(--text-primary)"}}>
                    {[selected.address, selected.city, selected.state].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              {selected.assignedTo && (
                <div className="flex items-center gap-3">
                  <User size={14} style={{color:"var(--text-muted)"}}/>
                  <span className="text-sm" style={{color:"var(--text-primary)"}}>Rep: {selected.assignedTo}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{color:"var(--text-muted)"}}>
                  Added {fmtDate(selected.createdAt)}
                </span>
              </div>
            </div>

            {selected.notes && (
              <div className="deji-card p-4">
                <p className="deji-label mb-2">Notes</p>
                <p className="text-sm" style={{color:"var(--text-primary)"}}>{selected.notes}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => handleWA(selected)}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 text-green-400">
                <MessageCircle size={14}/> WhatsApp
              </button>
              <button onClick={() => { setSelected(null); handleEdit(selected); }}
                className="btn-primary flex-1">Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="deji-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold"
                style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>
                {editContact ? "Edit Contact" : "Add Contact"}
              </h2>
              <button onClick={() => { setShowModal(false); setEditContact(null); }}
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

                <div className="col-span-2">
                  <label className="deji-label">Contact Type</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {TYPES.map(t => (
                      <button key={t} type="button" onClick={() => setForm(p=>({...p,type:t}))}
                        className="py-2 rounded-xl text-xs font-semibold border transition-all capitalize"
                        style={{
                          background:  form.type===t ? "var(--primary)" : "transparent",
                          color:       form.type===t ? "#fff" : "var(--text-muted)",
                          borderColor: form.type===t ? "var(--primary)" : "var(--border)",
                        }}>
                        {TYPE_ICONS[t]} {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div><label className="deji-label">Source</label>
                  <select value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))} className="deji-input text-sm">
                    <option value="">Select source...</option>
                    {["Facebook","Instagram","TikTok","Google","WhatsApp","Referral","Walk-in","Website Form","Ad Form","Manual","Other"].map(s=><option key={s}>{s}</option>)}
                  </select></div>
                <div><label className="deji-label">Assigned Rep</label>
                  <input value={form.assignedTo} onChange={e=>setForm(p=>({...p,assignedTo:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">City</label>
                  <input value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">State</label>
                  <input value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))} className="deji-input"/></div>
                <div className="col-span-2"><label className="deji-label">Address</label>
                  <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} className="deji-input"/></div>
                <div className="col-span-2"><label className="deji-label">Notes</label>
                  <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="deji-input resize-none" rows={3}/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditContact(null); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Saving..." : editContact ? "Update" : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}