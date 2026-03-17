"use client";
import { useState, useEffect } from "react";
import {
  Plus, Search, X, Edit, Trash2, Shield,
  Mail, Phone, Send, ChevronDown, ChevronUp, Check, AlertCircle, ToggleLeft, ToggleRight,
} from "lucide-react";
import { getStaff, inviteStaff, updateStaff, deleteStaff, resendInvite } from "@/lib/api";

const MODULES = [
  { key: "crm",       label: "CRM (Leads, Pipeline, Contacts)", icon: "👥" },
  { key: "inventory", label: "Inventory Management",            icon: "📦" },
  { key: "pos",       label: "Point of Sale",                   icon: "🛒" },
  { key: "finance",   label: "Finance & Invoices",              icon: "💰" },
  { key: "ledger",    label: "Ledger & Accounts",               icon: "📒" },
  { key: "analytics", label: "Analytics & Reports",             icon: "📊" },
  { key: "forms",     label: "Forms & Webhooks",                icon: "📋" },
  { key: "website",   label: "Website Builder",                 icon: "🌐" },
  { key: "settings",  label: "Settings",                        icon: "⚙️"  },
  { key: "staff",     label: "Staff Management",                icon: "🔐" },
];

const ROLE_PRESETS = [
  {
    value: "admin",    label: "Admin",     color: "#ef4444",
    desc: "Full access to everything",
    perms: { crm:true, inventory:true, pos:true, finance:true, ledger:true, analytics:true, forms:true, website:true, settings:true, staff:true },
  },
  {
    value: "manager",  label: "Manager",   color: "#f97316",
    desc: "All except billing & staff delete",
    perms: { crm:true, inventory:true, pos:true, finance:true, ledger:false, analytics:true, forms:true, website:true, settings:false, staff:false },
  },
  {
    value: "sales",    label: "Sales Rep", color: "#22c55e",
    desc: "Leads, pipeline & POS only",
    perms: { crm:true, inventory:false, pos:true, finance:false, ledger:false, analytics:false, forms:false, website:false, settings:false, staff:false },
  },
  {
    value: "marketer", label: "Marketer",  color: "#a855f7",
    desc: "Campaigns, forms & leads",
    perms: { crm:true, inventory:false, pos:false, finance:false, ledger:false, analytics:true, forms:true, website:true, settings:false, staff:false },
  },
  {
    value: "inventory",label: "Inventory", color: "#3b82f6",
    desc: "Inventory & POS only",
    perms: { crm:false, inventory:true, pos:true, finance:false, ledger:false, analytics:false, forms:false, website:false, settings:false, staff:false },
  },
  {
    value: "finance",  label: "Finance",   color: "#eab308",
    desc: "Finance, invoices & ledger",
    perms: { crm:false, inventory:false, pos:false, finance:true, ledger:true, analytics:true, forms:false, website:false, settings:false, staff:false },
  },
  {
    value: "support",  label: "Support",   color: "#06b6d4",
    desc: "Read-only CRM & contacts",
    perms: { crm:true, inventory:false, pos:false, finance:false, ledger:false, analytics:false, forms:false, website:false, settings:false, staff:false },
  },
  {
    value: "custom",   label: "Custom",    color: "#6b7280",
    desc: "Set every permission manually",
    perms: { crm:false, inventory:false, pos:false, finance:false, ledger:false, analytics:false, forms:false, website:false, settings:false, staff:false },
  },
];

const defaultPerms = () => Object.fromEntries(MODULES.map(m => [m.key, false]));
const salesPreset  = ROLE_PRESETS.find(r => r.value === "sales");
const EMPTY_FORM   = {
  firstName: "", lastName: "", email: "", phone: "",
  role: "sales",
  permissions: { ...salesPreset.perms },
};

function DeleteModal({ member, onConfirm, onCancel, loading }) {
  if (!member) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="deji-card p-6 w-full max-w-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)" }}>
          <Trash2 size={24} className="text-red-400"/>
        </div>
        <div>
          <h3 className="font-bold text-lg" style={{ color:"var(--text-primary)" }}>Remove Staff Member</h3>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>
            Are you sure you want to remove{" "}
            <strong style={{ color:"var(--text-primary)" }}>
              {member.firstName} {member.lastName}
            </strong>? Their account will be deactivated.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: loading ? "#7f1d1d" : "#ef4444", border:"none" }}>
            {loading ? "Removing..." : <><Trash2 size={13}/> Remove</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const [staff, setStaff]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterRole, setFilterRole]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [tab, setTab]                   = useState("staff");
  const [showModal, setShowModal]       = useState(false);
  const [editStaff, setEditStaff]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId]     = useState(null);
  const [togglingId, setTogglingId]     = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [errors, setErrors]             = useState({});
  const [apiError, setApiError]         = useState("");
  const [showPerms, setShowPerms]       = useState(false);
  const [toast, setToast]               = useState("");
  const [pendingInviteUrl, setPendingInviteUrl] = useState("");

  useEffect(() => { fetchStaff(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res  = await getStaff();
      const data = Array.isArray(res.data) ? res.data
                 : res.data?.data || res.data?.users || res.data?.staff || [];
      setStaff(data);
    } catch(e) {
      console.error("Failed to load staff:", e);
      setStaff([]);
    } finally { setLoading(false); }
  };

  // ── Toggle active/inactive ────────────────────────────────────────────────
  const handleToggleActive = async (member) => {
    setTogglingId(member.id);
    try {
      const newStatus = !member.isActive;
      await updateStaff(member.id, { isActive: newStatus });
      setStaff(prev => prev.map(m =>
        m.id === member.id ? { ...m, isActive: newStatus } : m
      ));
      showToast(newStatus
        ? `✅ ${member.firstName} is now Active`
        : `⏸ ${member.firstName} has been set to Inactive`
      );
    } catch(e) {
      showToast("❌ " + (e?.response?.data?.message || e?.message || "Failed to update status."));
    } finally { setTogglingId(null); }
  };

  const handleRoleChange = (role) => {
    const preset = ROLE_PRESETS.find(r => r.value === role);
    setForm(p => ({ ...p, role, permissions: { ...defaultPerms(), ...(preset?.perms || {}) } }));
    if (role === "custom") setShowPerms(true);
  };

  const togglePerm = (key) => {
    setForm(p => ({ ...p, role:"custom", permissions: { ...p.permissions, [key]: !p.permissions[key] } }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim())  e.lastName  = "Required";
    if (!form.email.trim())     e.email     = "Required";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setApiError("");
    try {
      const payload = {
        firstName:   form.firstName,
        lastName:    form.lastName,
        email:       form.email,
        phone:       form.phone || undefined,
        role:        form.role,
        permissions: form.permissions,
      };
      if (editStaff) {
        await updateStaff(editStaff.id, payload);
        showToast(`✅ ${form.firstName}'s profile updated.`);
      } else {
        const res = await inviteStaff(payload);
        const { emailSent, inviteUrl } = res.data || {};
        if (emailSent) {
          showToast(`📧 Invite sent to ${form.email}!`);
        } else {
          setPendingInviteUrl(inviteUrl || "");
        }
      }
      await fetchStaff();
      closeModal();
    } catch(err) {
      setApiError(err?.response?.data?.message || err?.message || "Something went wrong.");
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteStaff(deleteTarget.id);
      showToast(`🗑️ ${deleteTarget.firstName} ${deleteTarget.lastName} removed.`);
      await fetchStaff();
      setDeleteTarget(null);
    } catch(err) {
      showToast("❌ " + (err?.response?.data?.message || err?.message || "Failed to delete."));
      setDeleteTarget(null);
    } finally { setDeletingId(null); }
  };

  const handleResendInvite = async (email, firstName) => {
    try {
      const res = await resendInvite({ email });
      const { emailSent, inviteUrl } = res.data || {};
      if (emailSent) {
        showToast(`📧 Invite resent to ${firstName}!`);
      } else {
        setPendingInviteUrl(inviteUrl || "");
      }
    } catch(err) {
      showToast("❌ " + (err?.response?.data?.message || err?.message || "Failed to resend."));
    }
  };

  const closeModal = () => {
    setShowModal(false); setEditStaff(null);
    setForm(EMPTY_FORM); setErrors({});
    setShowPerms(false); setApiError("");
  };

  const openEdit = (m) => {
    setEditStaff(m);
    setForm({
      firstName:   m.firstName || "",
      lastName:    m.lastName  || "",
      email:       m.email     || "",
      phone:       m.phone     || "",
      role:        m.role      || "sales",
      permissions: { ...defaultPerms(), ...(m.permissions || ROLE_PRESETS.find(r => r.value === m.role)?.perms || {}) },
    });
    setErrors({}); setShowPerms(false); setApiError("");
    setShowModal(true);
  };

  const roleInfo = (role) => ROLE_PRESETS.find(r => r.value === role) || ROLE_PRESETS[ROLE_PRESETS.length - 1];

  const formatLastLogin = (iso) => {
    if (!iso) return "Never";
    const d = Date.now() - new Date(iso).getTime();
    if (d < 60000)     return "Just now";
    if (d < 3600000)   return Math.floor(d / 60000)    + "m ago";
    if (d < 86400000)  return Math.floor(d / 3600000)  + "h ago";
    if (d < 604800000) return Math.floor(d / 86400000) + "d ago";
    return new Date(iso).toLocaleDateString("en-GB", { day:"numeric", month:"short" });
  };

  const filtered = staff.filter(m => {
    if (filterRole !== "all" && m.role !== filterRole) return false;
    if (filterStatus === "active"   && (!m.isActive || m.invitePending)) return false;
    if (filterStatus === "inactive" && m.isActive) return false;
    if (filterStatus === "pending"  && !m.invitePending) return false;
    const q = search.toLowerCase();
    if (q && !m.firstName?.toLowerCase().includes(q) &&
             !m.lastName?.toLowerCase().includes(q) &&
             !m.email?.toLowerCase().includes(q)) return false;
    return true;
  });

  const permCount = Object.values(form.permissions).filter(Boolean).length;

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[70] px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background:"#0a1f12", border:"1px solid #22c55e", color:"#86efac", maxWidth:"360px" }}>
          {toast}
        </div>
      )}

      {/* Invite link modal */}
      {pendingInviteUrl && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="deji-card p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg" style={{ color:"var(--text-primary)" }}>✅ Staff Member Created</h3>
              <button onClick={() => setPendingInviteUrl("")} style={{ color:"var(--text-muted)" }}><X size={18}/></button>
            </div>
            <div className="p-3 rounded-xl"
              style={{ background:"rgba(234,179,8,0.08)", border:"1px solid rgba(234,179,8,0.2)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color:"#eab308" }}>⚠️ Email not configured</p>
              <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                Share this invite link with the staff member directly — it expires in 7 days.
              </p>
            </div>
            <div>
              <label className="deji-label mb-2 block">Invite Link</label>
              <div className="flex gap-2">
                <input readOnly value={pendingInviteUrl} className="deji-input text-xs flex-1"
                  style={{ color:"var(--primary)" }} onClick={e => e.target.select()}/>
                <button
                  onClick={() => { navigator.clipboard.writeText(pendingInviteUrl); showToast("📋 Copied!"); }}
                  className="btn-primary px-4 text-sm">Copy</button>
              </div>
            </div>
            <button onClick={() => setPendingInviteUrl("")} className="btn-secondary w-full">Done</button>
          </div>
        </div>
      )}

      <DeleteModal
        member={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={!!deletingId}/>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">
            {staff.length} members · {staff.filter(m => m.isActive && !m.invitePending).length} active
            · {staff.filter(m => !m.isActive).length} inactive
          </p>
        </div>
        <button onClick={() => { setEditStaff(null); setForm(EMPTY_FORM); setErrors({}); setShowPerms(false); setApiError(""); setShowModal(true); }}
          className="btn-primary flex items-center gap-2">
          <Plus size={15}/> Invite Staff
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ k:"staff", label:"👥 Staff Members" }, { k:"roles", label:"🔐 Role Reference" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
            style={{
              background:  tab === t.k ? "var(--primary)" : "transparent",
              color:       tab === t.k ? "#fff" : "var(--text-muted)",
              borderColor: tab === t.k ? "var(--primary)" : "var(--border)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "staff" && (
        <>
          {/* Status summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"Active",   value:staff.filter(m => m.isActive && !m.invitePending).length, color:"#22c55e", icon:"●" },
              { label:"Inactive", value:staff.filter(m => !m.isActive).length,                    color:"#ef4444", icon:"○" },
              { label:"Pending",  value:staff.filter(m => m.invitePending).length,                color:"#eab308", icon:"⏳" },
            ].map(s => (
              <button key={s.label}
                onClick={() => setFilterStatus(filterStatus === s.label.toLowerCase() ? "all" : s.label.toLowerCase())}
                className="kpi-card text-left transition-all"
                style={{ borderColor: filterStatus === s.label.toLowerCase() ? s.color : undefined }}>
                <p className="text-2xl font-bold mb-1"
                  style={{ fontFamily:"Playfair Display,serif", color: s.color }}>{s.value}</p>
                <p className="text-xs font-semibold" style={{ color:"var(--text-muted)" }}>
                  {s.icon} {s.label}
                </p>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", ...ROLE_PRESETS.map(r => r.value)].map(r => (
              <button key={r} onClick={() => setFilterRole(r)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap"
                style={{
                  background:  filterRole === r ? "var(--primary)" : "transparent",
                  color:       filterRole === r ? "#fff" : "var(--text-muted)",
                  borderColor: filterRole === r ? "var(--primary)" : "var(--border)",
                }}>
                {r === "all" ? "All Roles" : ROLE_PRESETS.find(x => x.value === r)?.label || r}
                <span className="ml-1 opacity-60">
                  {r === "all" ? staff.length : staff.filter(m => m.role === r).length}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--text-muted)" }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..." className="deji-input pl-9"/>
          </div>

          <div className="deji-card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center" style={{ color:"var(--text-muted)" }}>Loading staff...</div>
            ) : staff.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-3">👥</div>
                <p className="mb-4" style={{ color:"var(--text-muted)" }}>No staff yet. Invite your first team member.</p>
                <button onClick={() => setShowModal(true)} className="btn-primary">Invite Staff Member</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p style={{ color:"var(--text-muted)" }}>No staff match your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="deji-table w-full" style={{ minWidth:"860px" }}>
                  <thead>
                    <tr>
                      <th>Staff Member</th><th>Contact</th><th>Role</th>
                      <th>Access</th><th>Status</th><th>Last Login</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(m => {
                      const role  = roleInfo(m.role);
                      const perms = { ...defaultPerms(), ...(m.permissions || {}) };
                      const count = Object.values(perms).filter(Boolean).length;
                      const isToggling = togglingId === m.id;
                      return (
                        <tr key={m.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                style={{ background: m.isActive ? role.color : "#6b7280", opacity: m.isActive ? 1 : 0.6 }}>
                                {m.firstName?.[0]?.toUpperCase()}{m.lastName?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-sm" style={{ color: m.isActive ? "var(--text-primary)" : "var(--text-muted)" }}>
                                  {m.firstName} {m.lastName}
                                </p>
                                {m.invitePending && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ background:"rgba(234,179,8,0.15)", color:"#eab308" }}>
                                    ⏳ Invite Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-xs" style={{ color:"var(--text-muted)" }}>
                                <Mail size={9}/>{m.email}
                              </div>
                              {m.phone && (
                                <div className="flex items-center gap-1.5 text-xs" style={{ color:"var(--text-muted)" }}>
                                  <Phone size={9}/>{m.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="text-xs font-bold px-2 py-1 rounded-full"
                              style={{ background: role.color + "22", color: role.color }}>
                              {role.label}
                            </span>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1 max-w-40">
                              {MODULES.filter(mod => perms[mod.key]).slice(0,3).map(mod => (
                                <span key={mod.key} className="text-[9px] px-1.5 py-0.5 rounded"
                                  style={{ background:"var(--bg-hover)", color:"var(--text-muted)" }}>
                                  {mod.icon}
                                </span>
                              ))}
                              {count > 3 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded"
                                  style={{ background:"var(--primary-dim)", color:"var(--primary)" }}>
                                  +{count - 3}
                                </span>
                              )}
                              {count === 0 && <span className="text-[9px]" style={{ color:"var(--text-muted)" }}>No access</span>}
                            </div>
                          </td>
                          <td>
                            {/* ── Active/Inactive toggle ── */}
                            <button
                              onClick={() => handleToggleActive(m)}
                              disabled={isToggling || m.invitePending}
                              title={m.invitePending ? "Pending invite" : m.isActive ? "Click to deactivate" : "Click to activate"}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
                              style={{
                                background: m.isActive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                border: `1px solid ${m.isActive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                                opacity: isToggling || m.invitePending ? 0.6 : 1,
                                cursor: m.invitePending ? "not-allowed" : "pointer",
                              }}>
                              {m.invitePending ? (
                                <span className="text-[10px] font-bold" style={{ color:"#eab308" }}>⏳ Pending</span>
                              ) : m.isActive ? (
                                <>
                                  <ToggleRight size={14} style={{ color:"#22c55e" }}/>
                                  <span className="text-[10px] font-bold text-green-400">
                                    {isToggling ? "..." : "Active"}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft size={14} style={{ color:"#ef4444" }}/>
                                  <span className="text-[10px] font-bold text-red-400">
                                    {isToggling ? "..." : "Inactive"}
                                  </span>
                                </>
                              )}
                            </button>
                          </td>
                          <td>
                            <span className="text-xs" style={{ color:"var(--text-muted)" }}>
                              {formatLastLogin(m.lastLoginAt)}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-1.5">
                              {m.invitePending && (
                                <button onClick={() => handleResendInvite(m.email, m.firstName)}
                                  title="Resend invite"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-yellow-400"
                                  style={{ background:"var(--bg-hover)" }}>
                                  <Send size={11}/>
                                </button>
                              )}
                              <button onClick={() => openEdit(m)} title="Edit"
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ background:"var(--bg-hover)", color:"var(--text-muted)" }}>
                                <Edit size={12}/>
                              </button>
                              <button onClick={() => setDeleteTarget(m)} title="Remove"
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400"
                                style={{ background:"var(--bg-hover)", color:"var(--text-muted)" }}>
                                <Trash2 size={12}/>
                              </button>
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
        </>
      )}

      {/* Role Reference Tab */}
      {tab === "roles" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border flex items-start gap-3"
            style={{ background:"var(--primary-dim)", borderColor:"var(--primary)" }}>
            <Shield size={18} style={{ color:"var(--primary)", flexShrink:0, marginTop:2 }}/>
            <div>
              <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>Fully customisable per person</p>
              <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>
                Role presets are starting points. When inviting or editing staff, toggle each module individually.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ROLE_PRESETS.map(role => (
              <div key={role.value} className="deji-card p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                    style={{ background: role.color }}>
                    {role.label[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>{role.label}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: role.color + "22", color: role.color }}>
                        {staff.filter(m => m.role === role.value).length} staff
                      </span>
                    </div>
                    <p className="text-xs" style={{ color:"var(--text-muted)" }}>{role.desc}</p>
                  </div>
                </div>
                <div className="space-y-1.5 pt-3" style={{ borderTop:"1px solid var(--border)" }}>
                  {MODULES.map(mod => {
                    const has = role.perms[mod.key];
                    return (
                      <div key={mod.key} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color:"var(--text-muted)" }}>{mod.icon} {mod.label}</span>
                        <span className={`text-xs font-bold ${has ? "text-green-400" : "text-red-400"}`}>{has ? "✓" : "✗"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={closeModal}>
          <div className="deji-card p-6 w-full max-w-xl max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold"
                style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
                {editStaff ? "Edit Staff Member" : "Invite Staff Member"}
              </h2>
              <button onClick={closeModal} style={{ color:"var(--text-muted)" }}><X size={18}/></button>
            </div>

            {!editStaff && (
              <div className="mb-5 p-3.5 rounded-xl flex items-start gap-3"
                style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)" }}>
                <Send size={13} style={{ color:"#22c55e", flexShrink:0, marginTop:1 }}/>
                <p className="text-xs" style={{ color:"#86efac" }}>
                  An invite email will be sent. They&apos;ll click the link to set their own password.
                </p>
              </div>
            )}

            {apiError && (
              <div className="mb-4 p-3.5 rounded-xl flex items-start gap-3"
                style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-red-400">{apiError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="deji-label">First Name *</label>
                  <input value={form.firstName}
                    onChange={e => setForm(p => ({ ...p, firstName:e.target.value }))}
                    className={`deji-input ${errors.firstName ? "border-red-500" : ""}`}
                    placeholder="Tunde"/>
                  {errors.firstName && <p className="text-xs text-red-400 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="deji-label">Last Name *</label>
                  <input value={form.lastName}
                    onChange={e => setForm(p => ({ ...p, lastName:e.target.value }))}
                    className={`deji-input ${errors.lastName ? "border-red-500" : ""}`}
                    placeholder="Adeyemi"/>
                  {errors.lastName && <p className="text-xs text-red-400 mt-1">{errors.lastName}</p>}
                </div>
                <div className="col-span-2">
                  <label className="deji-label">Email Address *</label>
                  <input type="email" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email:e.target.value }))}
                    className={`deji-input ${errors.email ? "border-red-500" : ""}`}
                    placeholder="tunde@yourbusiness.com"
                    disabled={!!editStaff}
                    style={editStaff ? { opacity:0.6, cursor:"not-allowed" } : {}}/>
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                  {editStaff && <p className="text-[10px] mt-1" style={{ color:"var(--text-muted)" }}>Email cannot be changed.</p>}
                </div>
                <div className="col-span-2">
                  <label className="deji-label">Phone Number</label>
                  <input value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone:e.target.value }))}
                    className="deji-input" placeholder="08012345678"/>
                </div>
              </div>

              {/* Role presets */}
              <div style={{ borderTop:"1px solid var(--border)", paddingTop:"1rem" }}>
                <label className="deji-label mb-3 block">Role Preset</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_PRESETS.map(r => (
                    <button key={r.value} type="button" onClick={() => handleRoleChange(r.value)}
                      className="p-3 rounded-xl text-left border transition-all"
                      style={{
                        background:  form.role === r.value ? r.color + "15" : "transparent",
                        borderColor: form.role === r.value ? r.color : "var(--border)",
                      }}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold"
                          style={{ color: form.role === r.value ? r.color : "var(--text-primary)" }}>
                          {r.label}
                        </span>
                        {form.role === r.value && <Check size={11} style={{ color:r.color }}/>}
                      </div>
                      <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom permissions */}
              <div style={{ borderTop:"1px solid var(--border)", paddingTop:"1rem" }}>
                <button type="button" onClick={() => setShowPerms(!showPerms)}
                  className="w-full flex items-center justify-between mb-1"
                  style={{ color:"var(--text-primary)" }}>
                  <div className="flex items-center gap-2">
                    <Shield size={14} style={{ color:"var(--primary)" }}/>
                    <span className="text-sm font-semibold">Customise Permissions</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background:"var(--primary-dim)", color:"var(--primary)" }}>
                      {permCount}/{MODULES.length} on
                    </span>
                  </div>
                  {showPerms ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                <p className="text-[10px] mb-3" style={{ color:"var(--text-muted)" }}>
                  Override the preset — toggle exactly what this person can access.
                </p>
                {showPerms && (
                  <div className="space-y-1.5 p-3 rounded-xl" style={{ background:"var(--bg-hover)" }}>
                    {MODULES.map(mod => {
                      const on = form.permissions[mod.key];
                      return (
                        <div key={mod.key}
                          className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all"
                          style={{ background: on ? "rgba(34,197,94,0.05)" : "transparent" }}
                          onClick={() => togglePerm(mod.key)}>
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{mod.icon}</span>
                            <span className="text-sm" style={{ color:"var(--text-primary)" }}>{mod.label}</span>
                          </div>
                          <div className="w-9 h-5 rounded-full relative transition-all flex-shrink-0"
                            style={{ background: on ? "var(--primary)" : "var(--border)" }}>
                            <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                              style={{ left: on ? "calc(100% - 18px)" : "2px" }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? "Saving..." : editStaff ? "Update Member" : <><Send size={13}/> Send Invite</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}