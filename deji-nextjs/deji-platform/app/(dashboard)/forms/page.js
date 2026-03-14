"use client";
import { useState, useEffect } from "react";
import {
  Plus, Copy, ExternalLink, Trash2, Edit, X, Eye, Check,
  Zap, RefreshCw, AlertCircle, Clock, ToggleLeft, ToggleRight,
} from "lucide-react";
import { getForms, createForm, updateForm, deleteForm, publishForm } from "@/lib/api";
import api from "@/lib/api";

const FIELD_TYPES = [
  { value:"text",     label:"Short Text" },
  { value:"email",    label:"Email" },
  { value:"phone",    label:"Phone" },
  { value:"textarea", label:"Long Text" },
  { value:"select",   label:"Dropdown" },
];
const SOURCES = ["Landing Page","Instagram","Facebook","WhatsApp","Google","Referral","Walk-in","Other"];

const PLATFORMS = [
  {
    id:"meta", name:"Facebook / Instagram", icon:"📘", color:"#1877f2",
    desc:"Facebook Lead Ads & Instagram Lead Ads via Meta webhook",
    fields:["full_name","email","phone_number","campaign_name"],
  },
  {
    id:"tiktok", name:"TikTok Ads", icon:"🎵", color:"#ff0050",
    desc:"TikTok Lead Generation ads webhook",
    fields:["full_name","email","phone_number","campaign_name"],
  },
  {
    id:"google", name:"Google Ads", icon:"🔍", color:"#4285f4",
    desc:"Google Lead Form extensions webhook",
    fields:["full_name","email","phone_number","campaign_name"],
  },
  {
    id:"generic", name:"Generic / Typeform / Tally", icon:"🔗", color:"#6366f1",
    desc:"Any platform — Typeform, Tally, JotForm, Zapier, Make",
    fields:["name","email","phone","source","campaign"],
  },
];

const EMPTY_FORM = {
  name:"", description:"", assignedTo:"", marketerName:"",
  campaignName:"", source:"Landing Page", redirectUrl:"",
  thankYouMessage:"Thank you! We will be in touch shortly.",
  fields:[
    { id:"f1", label:"Full Name",    type:"text",  required:true,  placeholder:"Enter your full name" },
    { id:"f2", label:"Phone Number", type:"phone", required:true,  placeholder:"08012345678" },
    { id:"f3", label:"Email",        type:"email", required:false, placeholder:"you@email.com" },
  ],
  active:true,
};

const DEMO_FORMS = [
  { id:"d1", name:"Instagram Bio Form",    slug:"instagram-bio",    isPublished:true,  submissionsCount:47,  marketerName:"Amaka",  campaignName:"Lagos Summer Sale", assignedTo:"Tunde",  fields:EMPTY_FORM.fields },
  { id:"d2", name:"Facebook Lead Ad Form", slug:"fb-lead-ad",       isPublished:true,  submissionsCount:128, marketerName:"Chisom", campaignName:"Brand Awareness",   assignedTo:"Biodun", fields:EMPTY_FORM.fields },
  { id:"d3", name:"WhatsApp Landing Page", slug:"whatsapp-landing",  isPublished:false, submissionsCount:0,   marketerName:"",       campaignName:"",                  assignedTo:"Ngozi",  fields:EMPTY_FORM.fields },
];

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
      style={{ background: copied ? "rgba(34,197,94,0.15)" : "var(--bg-hover)", color: copied ? "#22c55e" : "var(--text-muted)" }}>
      {copied ? <><Check size={11}/> Copied!</> : <><Copy size={11}/> {label}</>}
    </button>
  );
}

export default function FormsPage() {
  const [tab, setTab]               = useState("connections");
  const [formsList, setFormsList]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [editForm, setEditForm]     = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [copied, setCopied]         = useState("");

  // Assignment roster state
  const [reps, setReps]             = useState([]);
  const [queued, setQueued]         = useState([]);
  const [loadingReps, setLoadingReps] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [assignTarget, setAssignTarget] = useState({});
  const [toast, setToast]           = useState("");

  const BASE    = typeof window !== "undefined" ? window.location.origin : "";
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const [tenantId, setTenantId]     = useState("YOUR_TENANT_ID");

  useEffect(() => {
    fetchForms();
    fetchReps();
    fetchQueued();
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setTenantId(user.tenantId || user.tenant?.id || "YOUR_TENANT_ID");
    } catch {}
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const fetchForms = async () => {
    try {
      setLoading(true);
      const res  = await getForms();
      const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.forms || [];
      setFormsList(data.length ? data : DEMO_FORMS);
    } catch { setFormsList(DEMO_FORMS); }
    finally { setLoading(false); }
  };

  const fetchReps = async () => {
    setLoadingReps(true);
    try {
      const res = await api.get("/webhooks/duty/reps");
      setReps(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch(e) { console.error(e); }
    finally { setLoadingReps(false); }
  };

  const fetchQueued = async () => {
    try {
      const res = await api.get("/webhooks/queued");
      setQueued(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch(e) { console.error(e); }
  };

  const toggleDuty = async (rep) => {
    setTogglingId(rep.id);
    try {
      await api.patch(`/webhooks/duty/reps/${rep.id}`, { onDuty: !rep.onDuty });
      setReps(prev => prev.map(r => r.id === rep.id ? { ...r, onDuty: !r.onDuty } : r));
      showToast(!rep.onDuty
        ? `✅ ${rep.firstName} is now On Duty — will receive leads`
        : `⏸ ${rep.firstName} is Off Duty — will be skipped`);
    } catch(e) {
      showToast("❌ " + (e?.response?.data?.message || e?.message || "Failed"));
    } finally { setTogglingId(null); }
  };

  const assignQueued = async (leadId) => {
    const name = assignTarget[leadId];
    if (!name) return alert("Select a rep first");
    setAssigningId(leadId);
    try {
      await api.patch(`/webhooks/queued/${leadId}/assign`, { assignedTo: name });
      setQueued(prev => prev.filter(l => l.id !== leadId));
      showToast(`✅ Lead assigned to ${name}`);
    } catch(e) {
      showToast("❌ " + (e?.response?.data?.message || e?.message || "Failed"));
    } finally { setAssigningId(null); }
  };

  const saveForm = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editForm ? await updateForm(editForm.id, form) : await createForm(form);
      await fetchForms();
      setShowModal(false); setEditForm(null); setForm(EMPTY_FORM);
    } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this form?")) return;
    try { await deleteForm(id); fetchForms(); } catch(e) { alert(e.message); }
  };

  const handleToggle = async (f) => {
    try { await publishForm(f.id, !f.isPublished); fetchForms(); } catch { fetchForms(); }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const addField    = () => setForm(p => ({ ...p, fields:[...p.fields, { id:"f"+Date.now(), label:"New Field", type:"text", required:false, placeholder:"" }] }));
  const removeField = (i) => setForm(p => ({ ...p, fields: p.fields.filter((_,j) => j!==i) }));
  const updateField = (i,k,v) => setForm(p => ({ ...p, fields: p.fields.map((f,j) => j===i ? {...f,[k]:v} : f) }));

  const openEdit = (f) => {
    setEditForm(f);
    setForm({
      name: f.name||"", description: f.description||"", assignedTo: f.assignedTo||"",
      marketerName: f.marketerName||"", campaignName: f.campaignName||"",
      source: f.source||"Landing Page", redirectUrl: f.redirectUrl||"",
      thankYouMessage: f.thankYouMessage||"Thank you! We will be in touch shortly.",
      fields: f.fields?.length ? f.fields.map(x=>({...x})) : [{ id:"f1", label:"Full Name", type:"text", required:true, placeholder:"" }],
      active: f.active!==false,
    });
    setShowModal(true);
  };

  const webhookUrl   = (platform) => `${API_URL}/api/webhooks/${platform}/${tenantId}`;
  const onDutyCount  = reps.filter(r => r.onDuty).length;
  const offDutyCount = reps.filter(r => !r.onDuty).length;

  const TABS = [
    { k:"connections", label:"🔌 Ad Connections" },
    { k:"assignment",  label:"👥 Assignment Roster" },
    { k:"queued",      label:`⏳ Queued ${queued.length > 0 ? `(${queued.length})` : ""}` },
    { k:"forms",       label:"📋 Native Forms" },
    { k:"guide",       label:"📖 Setup Guide" },
  ];

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[70] px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background:"#0a1f12", border:"1px solid #22c55e", color:"#86efac", maxWidth:"360px" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Forms & Integrations</h1>
          <p className="page-subtitle">Ads connect here — leads flow in automatically and get assigned instantly</p>
        </div>
        {tab === "forms" && (
          <button onClick={() => { setEditForm(null); setForm(EMPTY_FORM); setShowModal(true); }}
            className="btn-primary flex items-center gap-2">
            <Plus size={15}/> New Form
          </button>
        )}
      </div>

      {/* Flow diagram */}
      <div className="deji-card p-4">
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:"var(--text-muted)"}}>How It Works</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { icon:"📢", label:"Run Ad" },
            { icon:"👤", label:"Lead Fills Form" },
            { icon:"⚡", label:"Webhook Fires" },
            { icon:"🤖", label:"Deji Receives" },
            { icon:"🔄", label:"Auto-Assigns Rep" },
            { icon:"📋", label:"In Pipeline" },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{background:"var(--primary-dim)"}}>
                  {s.icon}
                </div>
                <p className="text-[10px] mt-1 text-center whitespace-nowrap"
                  style={{color:"var(--text-muted)"}}>{s.label}</p>
              </div>
              {i < arr.length - 1 && (
                <span className="text-lg flex-shrink-0" style={{color:"var(--primary)"}}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap"
            style={{
              background:  tab===t.k ? "var(--primary)" : "transparent",
              color:       tab===t.k ? "#fff" : "var(--text-muted)",
              borderColor: tab===t.k ? "var(--primary)" : "var(--border)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ CONNECTIONS TAB ══ */}
      {tab === "connections" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl flex items-start gap-3"
            style={{background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)"}}>
            <Zap size={16} style={{color:"#22c55e", flexShrink:0, marginTop:2}}/>
            <div>
              <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>
                Copy your webhook URL and paste it into your ad platform
              </p>
              <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>
                Every time someone fills your lead form, Deji receives it instantly and assigns it to an on-duty rep automatically.
              </p>
            </div>
          </div>

          {PLATFORMS.map(p => (
            <div key={p.id} className="deji-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{background: p.color + "22"}}>
                    {p.icon}
                  </div>
                  <div>
                    <p className="font-bold" style={{color:"var(--text-primary)"}}>{p.name}</p>
                    <p className="text-xs" style={{color:"var(--text-muted)"}}>{p.desc}</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0"
                  style={{background:"rgba(34,197,94,0.1)", color:"#22c55e"}}>
                  ● Ready
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{color:"var(--text-muted)"}}>Webhook URL</p>
                  <div className="flex items-center gap-2 p-3 rounded-xl"
                    style={{background:"var(--bg-hover)", border:"1px solid var(--border)"}}>
                    <code className="text-xs flex-1 truncate" style={{color:"var(--primary)"}}>
                      {webhookUrl(p.id)}
                    </code>
                    <CopyButton text={webhookUrl(p.id)}/>
                  </div>
                </div>

                {p.id === "meta" && (
                  <div className="p-3 rounded-xl"
                    style={{background:"rgba(24,119,242,0.08)", border:"1px solid rgba(24,119,242,0.2)"}}>
                    <p className="text-xs font-semibold mb-2" style={{color:"#60a5fa"}}>
                      📘 Meta also needs a Verify Token
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs flex-1" style={{color:"var(--text-muted)"}}>
                        deji_meta_verify_2024
                      </code>
                      <CopyButton text="deji_meta_verify_2024"/>
                    </div>
                    <p className="text-[10px] mt-1.5" style={{color:"var(--text-muted)"}}>
                      Paste this as the Verify Token when registering in Meta for Developers.
                    </p>
                  </div>
                )}

                <div className="pt-2" style={{borderTop:"1px solid var(--border)"}}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                    style={{color:"var(--text-muted)"}}>Expected Fields</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.fields.map(f => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-lg font-mono"
                        style={{background:"var(--bg-card)", color:"var(--text-muted)", border:"1px solid var(--border)"}}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ ASSIGNMENT ROSTER TAB ══ */}
      {tab === "assignment" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"On Duty",      value:onDutyCount,    color:"#22c55e", icon:"●" },
              { label:"Off Duty",     value:offDutyCount,   color:"#ef4444", icon:"○" },
              { label:"Queued Leads", value:queued.length,  color:"#eab308", icon:"⏳" },
            ].map(s => (
              <div key={s.label} className="kpi-card">
                <p className="text-2xl font-bold mb-1"
                  style={{fontFamily:"Playfair Display,serif", color:s.color}}>{s.value}</p>
                <p className="text-xs font-semibold" style={{color:"var(--text-muted)"}}>
                  {s.icon} {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl flex items-start gap-3"
            style={{background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)"}}>
            <RefreshCw size={15} style={{color:"#818cf8", flexShrink:0, marginTop:2}}/>
            <div>
              <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>
                Round-Robin Auto-Assignment
              </p>
              <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>
                Incoming leads are distributed evenly across all{" "}
                <strong style={{color:"#22c55e"}}>On Duty</strong> reps in rotation.
                If all reps are Off Duty, leads are queued automatically.
              </p>
            </div>
          </div>

          {onDutyCount === 0 && (
            <div className="p-4 rounded-2xl flex items-start gap-3"
              style={{background:"rgba(234,179,8,0.08)", border:"1px solid rgba(234,179,8,0.25)"}}>
              <AlertCircle size={16} style={{color:"#eab308", flexShrink:0, marginTop:1}}/>
              <div>
                <p className="text-sm font-semibold" style={{color:"#eab308"}}>
                  ⚠️ No reps are On Duty
                </p>
                <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>
                  All incoming leads will be queued until at least one rep is set to On Duty.
                </p>
              </div>
            </div>
          )}

          <div className="deji-card overflow-hidden">
            <div className="p-4 flex items-center justify-between"
              style={{borderBottom:"1px solid var(--border)"}}>
              <p className="font-bold text-sm" style={{color:"var(--text-primary)"}}>Sales Rep Roster</p>
              <button onClick={fetchReps}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                <RefreshCw size={11}/> Refresh
              </button>
            </div>
            {loadingReps ? (
              <div className="p-8 text-center" style={{color:"var(--text-muted)"}}>Loading reps...</div>
            ) : reps.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">👥</div>
                <p style={{color:"var(--text-muted)"}}>No sales reps found</p>
                <p className="text-xs mt-1" style={{color:"var(--text-muted)"}}>
                  Add staff with Sales Rep role in Staff Management
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{borderColor:"var(--border)"}}>
                {reps.map((rep, idx) => (
                  <div key={rep.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{background: rep.onDuty ? "var(--primary)" : "#6b7280"}}>
                        {rep.firstName?.[0]}{rep.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{color:"var(--text-primary)"}}>
                          {rep.firstName} {rep.lastName}
                        </p>
                        <p className="text-xs" style={{color:"var(--text-muted)"}}>{rep.email}</p>
                        <p className="text-[10px]" style={{color:"var(--text-muted)"}}>
                          Position #{idx + 1} in rotation
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleDuty(rep)}
                      disabled={togglingId === rep.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all min-w-28 justify-center"
                      style={{
                        background:  rep.onDuty ? "rgba(34,197,94,0.1)"  : "rgba(239,68,68,0.1)",
                        border:     `1px solid ${rep.onDuty ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        opacity:    togglingId === rep.id ? 0.6 : 1,
                        cursor:     togglingId === rep.id ? "not-allowed" : "pointer",
                      }}>
                      {rep.onDuty
                        ? <><ToggleRight size={16} style={{color:"#22c55e"}}/><span className="text-xs font-bold text-green-400">{togglingId===rep.id?"...":"On Duty"}</span></>
                        : <><ToggleLeft  size={16} style={{color:"#ef4444"}}/><span className="text-xs font-bold text-red-400">{togglingId===rep.id?"...":"Off Duty"}</span></>
                      }
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ QUEUED LEADS TAB ══ */}
      {tab === "queued" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl flex items-start gap-3"
            style={{background:"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.2)"}}>
            <Clock size={15} style={{color:"#eab308", flexShrink:0, marginTop:2}}/>
            <p className="text-sm" style={{color:"var(--text-muted)"}}>
              These leads arrived when no rep was on duty. Assign them manually below,
              or set a rep to On Duty — future leads will auto-assign immediately.
            </p>
          </div>

          <div className="deji-card overflow-hidden">
            {queued.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-3">✅</div>
                <p className="font-semibold" style={{color:"var(--text-primary)"}}>No queued leads</p>
                <p className="text-sm mt-1" style={{color:"var(--text-muted)"}}>
                  All incoming leads are being assigned automatically
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="deji-table w-full">
                  <thead>
                    <tr>
                      <th>Lead</th><th>Source</th><th>Campaign</th>
                      <th>Received</th><th>Assign To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queued.map(lead => (
                      <tr key={lead.id}>
                        <td>
                          <p className="font-semibold text-sm" style={{color:"var(--text-primary)"}}>{lead.name}</p>
                          {lead.phone && <p className="text-xs" style={{color:"var(--text-muted)"}}>{lead.phone}</p>}
                          {lead.email && <p className="text-xs" style={{color:"var(--text-muted)"}}>{lead.email}</p>}
                        </td>
                        <td>
                          <span className="badge badge-purple text-xs">{lead.source || "Webhook"}</span>
                        </td>
                        <td>
                          <span className="text-xs" style={{color:"var(--text-muted)"}}>{lead.campaignName || "—"}</span>
                        </td>
                        <td>
                          <span className="text-xs" style={{color:"var(--text-muted)"}}>
                            {lead.createdAt
                              ? new Date(lead.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})
                              : "—"}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <select
                              value={assignTarget[lead.id] || ""}
                              onChange={e => setAssignTarget(p => ({...p, [lead.id]: e.target.value}))}
                              className="deji-input text-xs py-1.5 w-36">
                              <option value="">Select rep...</option>
                              {reps.map(r => (
                                <option key={r.id} value={`${r.firstName} ${r.lastName}`}>
                                  {r.firstName} {r.lastName}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => assignQueued(lead.id)}
                              disabled={assigningId === lead.id || !assignTarget[lead.id]}
                              className="btn-primary text-xs py-1.5 px-3"
                              style={{opacity: !assignTarget[lead.id] ? 0.5 : 1}}>
                              {assigningId === lead.id ? "..." : "Assign"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ NATIVE FORMS TAB ══ */}
      {tab === "forms" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border flex items-start gap-3"
            style={{background:"var(--primary-dim)", borderColor:"var(--primary)"}}>
            <span className="text-xl flex-shrink-0">💡</span>
            <p className="text-xs" style={{color:"var(--text-muted)"}}>
              Create a form → share the link on Instagram bio, WhatsApp status, or embed on your website →
              every submission instantly creates a lead in your pipeline with marketer, campaign, and sales rep pre-assigned.
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center" style={{color:"var(--text-muted)"}}>Loading forms...</div>
          ) : formsList.length === 0 ? (
            <div className="deji-card p-12 text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="mb-4" style={{color:"var(--text-muted)"}}>No forms yet</p>
              <button onClick={() => setShowModal(true)} className="btn-primary">Create First Form</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formsList.map(f => {
                const link  = `${BASE}/f/${f.slug || f.id}`;
                const embed = `<iframe src="${link}" width="100%" height="600" frameborder="0" style="border:none;border-radius:16px;"></iframe>`;
                return (
                  <div key={f.id} className="deji-card p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-sm" style={{color:"var(--text-primary)"}}>{f.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${f.isPublished ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                            {f.isPublished ? "● LIVE" : "○ DRAFT"}
                          </span>
                        </div>
                        <p className="text-xs" style={{color:"var(--text-muted)"}}>
                          📊 {f.submissionsCount || 0} submissions
                          {f.marketerName && ` · 📢 ${f.marketerName}`}
                          {f.campaignName  && ` · 🎯 ${f.campaignName}`}
                          {f.assignedTo    && ` · 👤 ${f.assignedTo}`}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => setShowPreview(f)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{background:"var(--bg-hover)", color:"var(--text-muted)"}}>
                          <Eye size={12}/>
                        </button>
                        <button onClick={() => openEdit(f)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{background:"var(--bg-hover)", color:"var(--text-muted)"}}>
                          <Edit size={12}/>
                        </button>
                        <button onClick={() => handleDelete(f.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400"
                          style={{background:"var(--bg-hover)", color:"var(--text-muted)"}}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                        style={{color:"var(--text-muted)"}}>Share Link</p>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl"
                        style={{background:"var(--bg-hover)"}}>
                        <span className="text-xs flex-1 truncate font-mono"
                          style={{color:"var(--text-primary)"}}>{link}</span>
                        <button onClick={() => copy(link, f.id+"l")}
                          className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                          style={{background:"var(--primary-dim)", color:"var(--primary)"}}>
                          {copied===f.id+"l" ? <><Check size={10}/> Copied!</> : <><Copy size={10}/> Copy</>}
                        </button>
                        <a href={link} target="_blank" rel="noreferrer"
                          style={{color:"var(--text-muted)"}}>
                          <ExternalLink size={12}/>
                        </a>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                        style={{color:"var(--text-muted)"}}>Embed Code</p>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl"
                        style={{background:"var(--bg-hover)"}}>
                        <span className="text-xs flex-1 truncate font-mono"
                          style={{color:"var(--text-muted)"}}>{embed.slice(0,55)}...</span>
                        <button onClick={() => copy(embed, f.id+"e")}
                          className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                          style={{background:"var(--primary-dim)", color:"var(--primary)"}}>
                          {copied===f.id+"e" ? <><Check size={10}/> Copied!</> : <><Copy size={10}/> Copy</>}
                        </button>
                      </div>
                    </div>

                    <button onClick={() => handleToggle(f)}
                      className="w-full py-2 rounded-xl text-xs font-bold border transition-all"
                      style={{
                        borderColor: f.isPublished ? "#ef4444" : "var(--primary)",
                        color:       f.isPublished ? "#ef4444" : "var(--primary)",
                        background:  "transparent",
                      }}>
                      {f.isPublished ? "⏸ Pause Form" : "▶ Go Live"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ SETUP GUIDE TAB ══ */}
      {tab === "guide" && (
        <div className="space-y-4 max-w-2xl">
          {[
            {
              title:"Connect Facebook / Instagram Lead Ads", icon:"📘", color:"#1877f2",
              steps:[
                "Go to Meta for Developers → your App → Webhooks",
                "Select 'Page' as the webhook object",
                `Paste your Webhook URL: ${webhookUrl("meta")}`,
                "Set Verify Token to: deji_meta_verify_2024",
                "Click Verify and Save, then subscribe to the 'leadgen' field",
                "In Ads Manager, connect the Page to your Lead Ad form",
                "Submit a test lead — it appears in Deji within seconds",
              ],
            },
            {
              title:"Connect TikTok Lead Generation Ads", icon:"🎵", color:"#ff0050",
              steps:[
                "Go to TikTok Ads Manager → Tools → Lead Generation",
                "Open your Lead Form → Settings → Webhook",
                `Paste your Webhook URL: ${webhookUrl("tiktok")}`,
                "Set the event to 'Lead Submitted' and save",
                "Test using TikTok's test lead tool",
              ],
            },
            {
              title:"Connect Google Lead Form Extensions", icon:"🔍", color:"#4285f4",
              steps:[
                "Go to Google Ads → Campaign → Assets → Lead Form",
                "Open the Lead Form asset → Webhook integration",
                `Paste your Webhook URL: ${webhookUrl("google")}`,
                "Set any string as the Google Key (e.g. 'deji')",
                "Save and submit a test lead",
              ],
            },
            {
              title:"Connect Typeform / Tally / JotForm", icon:"🔗", color:"#6366f1",
              steps:[
                "In your form tool → Settings → Integrations → Webhooks",
                `Paste your Webhook URL: ${webhookUrl("generic")}`,
                "Ensure your form has fields named: name, email, phone",
                "Save and submit a test response",
                "Lead appears in Deji pipeline automatically",
              ],
            },
            {
              title:"Connect via Zapier or Make", icon:"⚡", color:"#f97316",
              steps:[
                "Create a new Zap / Scenario",
                "Trigger: your ad platform (Facebook, Google, TikTok etc.)",
                "Action: Webhooks by Zapier → POST",
                `URL: ${webhookUrl("generic")}`,
                "Map fields: name, phone, email, source, campaign_name",
                "Test and activate",
              ],
            },
          ].map(guide => (
            <div key={guide.title} className="deji-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{background: guide.color + "22"}}>
                  {guide.icon}
                </div>
                <p className="font-bold" style={{color:"var(--text-primary)"}}>{guide.title}</p>
              </div>
              <ol className="space-y-2.5">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                      style={{background: guide.color}}>
                      {i + 1}
                    </span>
                    <p className="text-sm" style={{color:"var(--text-muted)"}}>{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {/* ══ FORM PREVIEW MODAL ══ */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowPreview(null)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{showPreview.name}</h2>
              <button onClick={() => setShowPreview(null)} className="text-gray-400"><X size={18}/></button>
            </div>
            {showPreview.description && (
              <p className="text-sm text-gray-500 mb-4">{showPreview.description}</p>
            )}
            <div className="space-y-4">
              {(showPreview.fields || []).map((field, i) => (
                <div key={i}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea placeholder={field.placeholder} rows={3} readOnly
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"/>
                  ) : field.type === "select" ? (
                    <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                      <option>Select an option...</option>
                    </select>
                  ) : (
                    <input type={field.type==="phone"?"tel":field.type}
                      placeholder={field.placeholder} readOnly
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"/>
                  )}
                </div>
              ))}
              <button className="w-full py-3 rounded-xl text-white font-bold text-sm"
                style={{background:"#22c55e"}}>Submit</button>
              <p className="text-[10px] text-center text-gray-400">
                {showPreview.thankYouMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══ CREATE / EDIT FORM MODAL ══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="deji-card p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold"
                style={{fontFamily:"Playfair Display,serif", color:"var(--text-primary)"}}>
                {editForm ? "Edit Form" : "Create New Form"}
              </h2>
              <button onClick={() => { setShowModal(false); setEditForm(null); }}
                style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <form onSubmit={saveForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="deji-label">Form Name *</label>
                  <input value={form.name}
                    onChange={e => setForm(p => ({...p, name:e.target.value}))}
                    className="deji-input" required placeholder="e.g. Instagram Bio Form"/>
                </div>
                <div className="col-span-2">
                  <label className="deji-label">Description</label>
                  <input value={form.description}
                    onChange={e => setForm(p => ({...p, description:e.target.value}))}
                    className="deji-input" placeholder="Optional — shown above the form"/>
                </div>
              </div>

              <div style={{borderTop:"1px solid var(--border)", paddingTop:"1rem"}}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3"
                  style={{color:"var(--text-muted)"}}>Lead Attribution</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="deji-label">Assigned Sales Rep</label>
                    <input value={form.assignedTo}
                      onChange={e => setForm(p => ({...p, assignedTo:e.target.value}))}
                      className="deji-input" placeholder="Tunde"/>
                  </div>
                  <div>
                    <label className="deji-label">Digital Marketer</label>
                    <input value={form.marketerName}
                      onChange={e => setForm(p => ({...p, marketerName:e.target.value}))}
                      className="deji-input" placeholder="Amaka"/>
                  </div>
                  <div>
                    <label className="deji-label">Campaign Name</label>
                    <input value={form.campaignName}
                      onChange={e => setForm(p => ({...p, campaignName:e.target.value}))}
                      className="deji-input" placeholder="Lagos Summer Sale"/>
                  </div>
                  <div>
                    <label className="deji-label">Lead Source</label>
                    <select value={form.source}
                      onChange={e => setForm(p => ({...p, source:e.target.value}))}
                      className="deji-input">
                      {SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{borderTop:"1px solid var(--border)", paddingTop:"1rem"}}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider"
                    style={{color:"var(--text-muted)"}}>Form Fields</p>
                  <button type="button" onClick={addField}
                    className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
                    <Plus size={11}/> Add Field
                  </button>
                </div>
                <div className="space-y-3">
                  {form.fields.map((field, i) => (
                    <div key={field.id||i} className="p-3 rounded-xl space-y-2"
                      style={{background:"var(--bg-hover)"}}>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="deji-label">Label</label>
                          <input value={field.label}
                            onChange={e => updateField(i,"label",e.target.value)}
                            className="deji-input text-sm" placeholder="Field label"/>
                        </div>
                        <div>
                          <label className="deji-label">Type</label>
                          <select value={field.type}
                            onChange={e => updateField(i,"type",e.target.value)}
                            className="deji-input text-sm">
                            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="deji-label">Placeholder</label>
                          <input value={field.placeholder}
                            onChange={e => updateField(i,"placeholder",e.target.value)}
                            className="deji-input text-sm"/>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs cursor-pointer"
                          style={{color:"var(--text-muted)"}}>
                          <input type="checkbox" checked={field.required||false}
                            onChange={e => updateField(i,"required",e.target.checked)}
                            className="accent-green-500"/>
                          Required field
                        </label>
                        {form.fields.length > 1 && (
                          <button type="button" onClick={() => removeField(i)}
                            className="text-xs flex items-center gap-1 text-red-400">
                            <X size={10}/> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{borderTop:"1px solid var(--border)", paddingTop:"1rem"}}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3"
                  style={{color:"var(--text-muted)"}}>After Submission</p>
                <div className="space-y-3">
                  <div>
                    <label className="deji-label">Thank You Message</label>
                    <input value={form.thankYouMessage}
                      onChange={e => setForm(p => ({...p, thankYouMessage:e.target.value}))}
                      className="deji-input"/>
                  </div>
                  <div>
                    <label className="deji-label">Redirect URL (optional)</label>
                    <input value={form.redirectUrl}
                      onChange={e => setForm(p => ({...p, redirectUrl:e.target.value}))}
                      className="deji-input" placeholder="https://yoursite.com/thank-you"/>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button"
                  onClick={() => { setShowModal(false); setEditForm(null); }}
                  className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Saving..." : editForm ? "Update Form" : "Create Form"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}