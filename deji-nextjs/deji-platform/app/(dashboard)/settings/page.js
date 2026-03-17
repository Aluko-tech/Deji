"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Save, Loader2, Building2, Bell, CreditCard, Globe, Palette, Upload, X, Check, Users, User, Shield, Crown, Zap, Star } from "lucide-react";
import { getTenantSettings, updateTenantSettings } from "@/lib/api";
import { useCurrency } from "@/lib/currencyContext";
import api from "@/lib/api";
import { CURRENCIES, CURRENCY_GROUPS, getCurrencyLabel } from "@/lib/currency";
import Link from "next/link";

const TABS = [
  { id:"profile",       label:"Profile",       icon:User       },
  { id:"business",      label:"Business",      icon:Building2  },
  { id:"localization",  label:"Localization",  icon:Globe      },
  { id:"notifications", label:"Notifications", icon:Bell       },
  { id:"payments",      label:"Payments",      icon:CreditCard },
  { id:"branding",      label:"Branding",      icon:Palette    },
];

const TIMEZONES = [
  "Africa/Lagos","Africa/Nairobi","Africa/Johannesburg","Africa/Cairo",
  "Africa/Accra","Africa/Casablanca","Africa/Abidjan","Africa/Addis_Ababa",
  "Africa/Kampala","Africa/Dar_es_Salaam","Africa/Kigali","Africa/Luanda",
  "Europe/London","Europe/Paris","America/New_York","America/Los_Angeles",
  "Asia/Dubai","Asia/Singapore","Asia/Tokyo",
];

const LANGUAGES = [
  {code:"en", label:"🇬🇧 English"},
  {code:"fr", label:"🇫🇷 French"},
  {code:"ar", label:"🇸🇦 Arabic"},
  {code:"sw", label:"🇰🇪 Swahili"},
  {code:"ha", label:"🇳🇬 Hausa"},
  {code:"yo", label:"🇳🇬 Yoruba"},
  {code:"ig", label:"🇳🇬 Igbo"},
  {code:"pt", label:"🇵🇹 Portuguese"},
  {code:"am", label:"🇪🇹 Amharic"},
];

const PLANS = {
  FREE:       {
    label:"Free", color:"#6b7280", icon:Star, price:"₦0/mo", priceRaw:0,
    features:["2 users","50 contacts","50 leads","20 products","10 invoices/mo","1 warehouse","1 form","Community support"],
    restricted:["AI Insights","Custom branding","API access","White-label"],
  },
  STARTER:    {
    label:"Starter", color:"#3b82f6", icon:Zap, price:"₦18,500/mo", priceRaw:18500,
    features:["5 users","500 contacts","300 leads","100 products","50 invoices/mo","10 warehouses","10 forms","2 landing pages","Receipt generation","Email support (48hr)"],
    restricted:["AI Insights","Custom branding","API access","White-label"],
  },
  PRO:        {
    label:"Pro", color:"#22c55e", icon:Shield, price:"₦37,500/mo", priceRaw:37500,
    features:["20 users","10,000 contacts","5,000 leads","1,000 products","500 invoices/mo","25 warehouses","25 forms","10 landing pages","AI Insights","Custom branding","API access","Priority support (24hr)"],
    restricted:["White-label"],
  },
  BUSINESS:   {
    label:"Business", color:"#f97316", icon:Crown, price:"₦78,500/mo", priceRaw:78500,
    features:["50 users","50,000 contacts","20,000 leads","5,000 products","2,000 invoices/mo","50 warehouses","Unlimited forms","AI Insights (Advanced)","White-label","Dedicated support (4hr)","Onboarding call"],
    restricted:[],
  },
  ENTERPRISE: {
    label:"Enterprise", color:"#8b5cf6", icon:Crown, price:"₦150,000/mo", priceRaw:150000,
    features:["Unlimited users","Unlimited everything","Custom integrations","SLA 99.9%","Custom domain","Dedicated account manager","Monthly strategy call","Full white-label"],
    restricted:[],
  },
};

const DEFAULT = {
  businessName:"", email:"", phone:"", address:"", website:"",
  logoUrl:"", receiptLogoUrl:"",
  notifyEmail:true, notifyWhatsApp:true, lowStockAlerts:true,
  stripeKey:"", paystackKey:"", flutterwaveKey:"",
  currency:"NGN", timezone:"Africa/Lagos", language:"en",
  primaryColor:"#22c55e", invoicePrefix:"INV-", lowStockThreshold:5,
  receiptFooter:"Thank you for your business!",
};

const CLOUDINARY_CLOUD = "dievws0yz";
const CLOUDINARY_PRESET = "deji-unsigned";

function ImageUpload({ label, hint, value, onChange }) {
  const ref = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 2*1024*1024) { alert("Image must be under 2MB"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_PRESET);
      formData.append("folder", "deji-logos");
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (data.secure_url) {
        onChange(data.secure_url);
      } else {
        alert("Upload failed: " + (data.error?.message || "Unknown error"));
      }
    } catch(e) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="deji-label">{label}</label>
      {hint && <p className="text-xs mb-2" style={{color:"var(--text-muted)"}}>{hint}</p>}
      <div className="flex items-center gap-4">
        {value ? (
          <div className="relative">
            <img src={value} alt={label} className="w-20 h-20 rounded-2xl object-contain"
              style={{background:"var(--bg-hover)",border:"1px solid var(--border)"}}/>
            <button type="button" onClick={()=>onChange("")}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
              <X size={10}/>
            </button>
          </div>
        ) : (
          <div onClick={()=>ref.current?.click()}
            className="w-20 h-20 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all"
            style={{borderColor:"var(--border)",color:"var(--text-muted)"}}>
            {uploading ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18}/>}
            <span className="text-[10px] mt-1">{uploading ? "Uploading..." : "Upload"}</span>
          </div>
        )}
        <div>
          <button type="button" onClick={()=>ref.current?.click()} disabled={uploading}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-2"
            style={{opacity: uploading ? 0.6 : 1}}>
            {uploading ? <Loader2 size={12} className="animate-spin"/> : <Upload size={12}/>}
            {uploading ? "Uploading..." : value ? "Change" : "Upload"} Image
          </button>
          <p className="text-[10px] mt-1" style={{color:"var(--text-muted)"}}>PNG or JPG · max 2MB · square recommended</p>
          {value && <p className="text-[10px] mt-1 text-green-400">✓ Uploaded to Cloudinary</p>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}/>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ settings }) {
  const [user, setUser]           = useState(null);
  const [form, setForm]           = useState({ firstName:"", lastName:"", phone:"" });
  const [pwForm, setPwForm]       = useState({ current:"", newPw:"", confirm:"" });
  const [saving, setSaving]       = useState(false);
  const [savingPw, setSavingPw]   = useState(false);
  const [saved, setSaved]         = useState("");
  const [currentPlan, setCurrentPlan]         = useState("FREE");
  const [subLoading, setSubLoading]           = useState(true);
  const [sub, setSub]                         = useState(null);
  const [inTrial, setInTrial]                 = useState(false);
  const [trialEndsAt, setTrialEndsAt]         = useState(null);
  const [billingCycle, setBillingCycle]       = useState("monthly");
  const [usage, setUsage]                     = useState({invoicesThisMonth:0,contactsTotal:0,productsTotal:0,usersTotal:0});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [invoiceHistory, setInvoiceHistory]   = useState([]);
  const [upgrading, setUpgrading]             = useState(false);
  const plan       = PLANS[currentPlan] || PLANS["FREE"];
  const plan_limits = { invoicesPerMonth:10, contactsMax:50, productsMax:20, usersMax:2, ...plan };
  const PlanIcon   = plan.icon;

  useEffect(() => {
    // Load subscription
    api.get("/subscription").then(res => {
      const data = res.data;
      const p = data?.plan || data?.data?.plan || "FREE";
      setCurrentPlan(p.toUpperCase());
      setSub(data);
      setBillingCycle(data?.billingCycle || "monthly");
      // Check trial
      if (data?.trialEndsAt && !data?.trialUsed) {
        const trialEnd = new Date(data.trialEndsAt);
        if (trialEnd > new Date()) {
          setInTrial(true);
          setTrialEndsAt(trialEnd);
        }
      }
    }).catch(()=>{}).finally(()=>setSubLoading(false));
    // Load usage
    api.get("/subscription/usage").then(res => {
      setUsage(res.data || {});
    }).catch(()=>{});
  }, []);

  const handleUpgrade = async (planKey, planInfo) => {
    if (planInfo.priceRaw === 0) {
      // Downgrade to free — just call API directly
      try {
        setUpgrading(planKey);
        await api.post("/subscription/upgrade", { plan: planKey });
        setCurrentPlan(planKey);
        setShowUpgradeModal(false);
        alert("Plan updated to Free");
      } catch(e) { alert(e?.response?.data?.error || "Failed to update plan"); }
      finally { setUpgrading(false); }
      return;
    }
    // Paid plan — initiate Paystack payment
    try {
      setUpgrading(planKey);
      const userStr = localStorage.getItem("user");
      const userObj = userStr ? JSON.parse(userStr) : {};
      const email   = userObj.email;
      if (!email) { alert("Could not find your email. Please log in again."); return; }

      // Load Paystack inline script
      if (!window.PaystackPop) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://js.paystack.co/v1/inline.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      // Paystack requires plain functions, not async — wrap in regular function
      const handler = window.PaystackPop.setup({
        key:      process.env.NEXT_PUBLIC_PAYSTACK_KEY ||
                  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
                  "pk_test_36fb975407c11ee39a2994112c2d1cee819de203",
        email,
        amount:   (billingCycle === "annual"
                    ? planInfo.priceRaw * 10
                    : planInfo.priceRaw) * 100,
        currency: "NGN",
        ref:      "DEJI_" + Date.now() + "_" + Math.random().toString(36).slice(2,7).toUpperCase(),
        metadata: { custom_fields: [{ display_name:"Plan", variable_name:"plan", value: planKey }] },
        callback: function(response) {
          // Activate plan on backend after successful payment
          api.post("/subscription/upgrade", {
            plan: planKey,
            metadata: { paystackRef: response.reference, amount: planInfo.priceRaw },
          }).then(function() {
            setCurrentPlan(planKey);
            setShowUpgradeModal(false);
            setUpgrading(false);
            alert("✅ Successfully upgraded to " + planInfo.label + "!");
          }).catch(function(e) {
            setUpgrading(false);
            alert("Payment received but plan activation failed. Contact support with ref: " + response.reference);
          });
        },
        onClose: function() {
          setUpgrading(false);
        },
      });
      handler.openIframe();
    } catch(e) {
      alert(e?.response?.data?.error || e.message || "Payment failed");
    } finally {
      setUpgrading(false);
    }
  };

  const handleResume = async () => {
    try {
      await api.post("/subscription/resume");
      const res = await api.get("/subscription");
      setSub(res.data);
      alert("Subscription resumed!");
    } catch(e) { alert("Failed to resume"); }
  };

  const fetchInvoiceHistory = async () => {
    try {
      // Use audit logs filtered by subscription actions as billing history
      const res = await api.get("/audit-logs?action=SUBSCRIPTION_UPGRADE&limit=20");
      const logs = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setInvoiceHistory(logs.map(l => ({
        date:      l.createdAt,
        plan:      l.details?.plan || "—",
        amount:    l.details?.amount || 0,
        status:    "paid",
      })));
    } catch(e) {
      setInvoiceHistory([]);
    }
    setShowInvoiceHistory(true);
  };

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(u);
      setForm({ firstName: u.firstName||"", lastName: u.lastName||"", phone: u.phone||"" });
    } catch {}
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      // Update localStorage optimistically
      const updated = { ...user, ...form };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      setSaved("profile");
      setTimeout(() => setSaved(""), 2500);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (pwForm.newPw !== pwForm.confirm) { alert("Passwords don't match"); return; }
    if (pwForm.newPw.length < 8) { alert("Password must be at least 8 characters"); return; }
    setSavingPw(true);
    try {
      const { default: api } = await import("@/lib/api");
      await api.put("/auth/change-password", { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      setPwForm({ current:"", newPw:"", confirm:"" });
      setSaved("password");
      setTimeout(() => setSaved(""), 2500);
    } catch (e) { alert(e?.response?.data?.message || e.message || "Failed to update password"); }
    finally { setSavingPw(false); }
  };

  const initials = user
    ? ((user.firstName?.[0]||"")+(user.lastName?.[0]||"")).toUpperCase() || user.email?.[0]?.toUpperCase()
    : "U";

  return (
    <div className="space-y-5">

      {/* ── Account Info ── */}
      <div className="deji-card p-6 space-y-5">
        <h3 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>Account Information</h3>

        {/* Avatar + basic info */}
        <div className="flex items-center gap-4 p-4 rounded-2xl" style={{background:"var(--bg-hover)"}}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
            style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",fontFamily:"Syne,sans-serif"}}>
            {initials}
          </div>
          <div>
            <p className="font-bold" style={{color:"var(--text-primary)"}}>
              {user?.firstName ? `${user.firstName} ${user.lastName||""}`.trim() : user?.email}
            </p>
            <p className="text-sm" style={{color:"var(--text-muted)"}}>{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize"
                style={{background:"var(--primary-dim)",color:"var(--primary)"}}>
                {user?.role || "admin"}
              </span>
              {user?.tenantName && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{background:"var(--bg-base)",color:"var(--text-muted)",border:"1px solid var(--border)"}}>
                  {user.tenantName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit name/phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="deji-label">First Name</label>
            <input value={form.firstName} onChange={e=>setForm(p=>({...p,firstName:e.target.value}))}
              className="deji-input" placeholder="Tunde"/>
          </div>
          <div>
            <label className="deji-label">Last Name</label>
            <input value={form.lastName} onChange={e=>setForm(p=>({...p,lastName:e.target.value}))}
              className="deji-input" placeholder="Adeyemi"/>
          </div>
          <div className="col-span-2">
            <label className="deji-label">Phone Number</label>
            <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}
              className="deji-input" placeholder="08012345678"/>
          </div>
          <div className="col-span-2">
            <label className="deji-label">Email Address</label>
            <input value={user?.email||""} disabled
              className="deji-input opacity-50 cursor-not-allowed"
              style={{background:"var(--bg-hover)"}}/>
            <p className="text-[10px] mt-1" style={{color:"var(--text-muted)"}}>Email cannot be changed. Contact support if needed.</p>
          </div>
        </div>

        <button onClick={saveProfile} disabled={saving}
          className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin"/> : saved==="profile" ? <Check size={14}/> : <Save size={14}/>}
          {saving ? "Saving..." : saved==="profile" ? "Saved!" : "Save Profile"}
        </button>
      </div>

      {/* ── Subscription ── */}
      <div className="deji-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>Subscription</h3>
          <span className="text-xs px-3 py-1 rounded-full font-bold"
            style={{background:plan.color+"22",color:plan.color}}>
            {plan.label} Plan
          </span>
        </div>

        {/* Current plan card */}
        <div className="p-4 rounded-2xl" style={{background:plan.color+"0d",border:`1px solid ${plan.color}33`}}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{background:plan.color+"22"}}>
                <PlanIcon size={18} style={{color:plan.color}}/>
              </div>
              <div>
                <p className="font-bold text-sm" style={{color:"var(--text-primary)"}}>{plan.label} Plan</p>
                <p className="text-xs" style={{color:"var(--text-muted)"}}>Currently active</p>
              </div>
            </div>
            <p className="font-black text-lg" style={{color:plan.color,fontFamily:"Syne,sans-serif"}}>{plan.price}</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {plan.features.map(f => (
              <div key={f} className="flex items-center gap-2">
                <Check size={11} style={{color:plan.color,flexShrink:0}}/>
                <span className="text-xs" style={{color:"var(--text-muted)"}}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trial Banner */}
        {inTrial && trialEndsAt && (
          <div className="p-3 rounded-xl flex items-center gap-3 mb-2"
            style={{background:"rgba(251,146,60,0.08)", border:"1px solid rgba(251,146,60,0.3)"}}>
            <span className="text-xl">⏳</span>
            <div className="flex-1">
              <p className="text-xs font-bold" style={{color:"#f97316"}}>Free Trial Active</p>
              <p className="text-[11px]" style={{color:"var(--text-muted)"}}>
                Full access until {new Date(trialEndsAt).toLocaleDateString("en-NG",{day:"numeric",month:"long",year:"numeric"})}.
                {" "}{Math.max(0,Math.ceil((new Date(trialEndsAt)-new Date())/86400000))} days left — after trial you'll drop to Free plan.
              </p>
            </div>
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl mb-2" style={{background:"var(--bg-hover)"}}>
          <div>
            <p className="text-xs font-bold" style={{color:"var(--text-primary)"}}>Billing Cycle</p>
            <p className="text-[11px]" style={{color:"var(--text-muted)"}}>Annual = 10 months price, 2 months free</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{background:"var(--bg-base)",border:"1px solid var(--border)"}}>
            {["monthly","annual"].map(cycle => (
              <button key={cycle} onClick={()=>setBillingCycle(cycle)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize"
                style={{background:billingCycle===cycle?"var(--primary)":"transparent",color:billingCycle===cycle?"#fff":"var(--text-muted)"}}>
                {cycle==="annual"?"Annual 🎉":"Monthly"}
              </button>
            ))}
          </div>
        </div>

        {/* All plans */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:"var(--text-muted)"}}>Available Plans</p>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(PLANS).map(([key, p]) => {
              const Icon    = p.icon;
              const current = key === currentPlan;
              return (
                <div key={key} className="p-4 rounded-xl border transition-all"
                  style={{
                    background:  current ? p.color+"12" : "var(--bg-hover)",
                    borderColor: current ? p.color+"66" : "var(--border)",
                    boxShadow:   current ? `0 0 0 2px ${p.color}33` : "none",
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} style={{color:p.color}}/>
                      <span className="text-sm font-bold" style={{color: current ? p.color : "var(--text-primary)"}}>{p.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black" style={{color:p.color,fontFamily:"Syne,sans-serif"}}>{p.price}</p>
                      {current && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{background:p.color+"22",color:p.color}}>Active</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mb-2">
                    {p.features.slice(0,6).map((f,i) => (
                      <span key={i} className="text-[10px] flex items-center gap-1" style={{color:"var(--text-muted)"}}>
                        <span style={{color:p.color}}>✓</span> {f}
                      </span>
                    ))}
                  </div>
                  {!current && (
                    <button
                      onClick={() => {
                        setShowUpgradeModal(false);
                        // Small delay to let modal close before re-opening scrolled to this plan
                        setTimeout(() => setShowUpgradeModal(true), 50);
                        handleUpgrade(key, p);
                      }}
                      className="w-full text-[11px] py-1.5 rounded-lg font-semibold transition-all mt-1"
                      style={{background:p.color+"22", color:p.color, border:`1px solid ${p.color}44`}}>
                      Upgrade to {p.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Usage bar */}
        {!subLoading && (
          <div className="space-y-2 pt-1 border-t" style={{borderColor:"var(--border)"}}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>This Month Usage</p>
            {[
              {label:"Invoices",  used:usage.invoicesThisMonth, max:plan_limits.invoicesPerMonth},
              {label:"Contacts",  used:usage.contactsTotal,     max:plan_limits.contactsMax},
              {label:"Products",  used:usage.productsTotal,     max:plan_limits.productsMax},
              {label:"Staff",     used:usage.usersTotal,        max:plan_limits.usersMax},
            ].map(({label,used,max}) => {
              const pct = max >= 999999 ? 5 : Math.min(100, Math.round((used/max)*100));
              const warn = pct >= 80;
              return (
                <div key={label}>
                  <div className="flex justify-between text-[10px] mb-0.5" style={{color:"var(--text-muted)"}}>
                    <span>{label}</span>
                    <span style={{color: warn ? "#f97316" : "var(--text-muted)"}}>
                      {used} / {max >= 999999 ? "∞" : max}
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{background:"var(--border)"}}>
                    <div className="h-full rounded-full transition-all"
                      style={{width:`${pct}%`, background: warn ? "#f97316" : plan.color}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="btn-primary flex-1 text-sm">
            Upgrade Plan
          </button>
          <button
            onClick={fetchInvoiceHistory}
            className="btn-secondary flex-1 text-sm">
            View Invoice History
          </button>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{background:"rgba(0,0,0,0.7)"}}>
            <div className="deji-card p-6 w-full max-w-md space-y-4" style={{maxHeight:"90vh",overflowY:"auto"}}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg" style={{fontFamily:"Syne,sans-serif"}}>Choose a Plan</h3>
                <button onClick={()=>setShowUpgradeModal(false)}><X size={18}/></button>
              </div>
              {Object.entries(PLANS).map(([key, p]) => {
                const Icon = p.icon;
                const isCurrent = key === currentPlan;
                const isPaid = p.priceRaw > 0;
                return (
                  <div key={key} className="p-4 rounded-xl border"
                    style={{borderColor: isCurrent ? p.color+"66" : "var(--border)", background: isCurrent ? p.color+"0d" : "var(--bg-hover)"}}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{color:p.color}}/>
                        <span className="font-bold text-sm" style={{color:p.color}}>{p.label}</span>
                        {isCurrent && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{background:p.color+"22",color:p.color}}>Current</span>}
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm" style={{color:p.color,fontFamily:"Syne,sans-serif"}}>
                          {billingCycle === "annual" && p.priceRaw > 0
                            ? `₦${(p.priceRaw * 10).toLocaleString()}/yr`
                            : p.price}
                        </span>
                        {billingCycle === "annual" && p.priceRaw > 0 && (
                          <p className="text-[9px]" style={{color:"var(--text-muted)"}}>
                            ₦{p.priceRaw.toLocaleString()}/mo × 10
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mb-3">
                      {p.features.slice(0,6).map((f,i)=>(
                        <span key={i} className="text-[10px] flex items-center gap-1" style={{color:"var(--text-muted)"}}>
                          <span style={{color:p.color}}>✓</span>{f}
                        </span>
                      ))}
                    </div>
                    {!isCurrent && (
                      <button
                        disabled={upgrading}
                        onClick={() => handleUpgrade(key, p)}
                        className="w-full py-2 rounded-lg text-xs font-bold transition-all"
                        style={{background:p.color, color:"#fff", opacity: upgrading ? 0.6 : 1}}>
                        {upgrading === key ? "Processing..." : !isPaid ? "Switch to Free" :
                          billingCycle === "annual"
                            ? `Pay ₦${(p.priceRaw * 10).toLocaleString()}/yr & Upgrade`
                            : `Pay ₦${p.priceRaw.toLocaleString()}/mo & Upgrade`}
                      </button>
                    )}
                  </div>
                );
              })}
              {sub?.cancelAtPeriodEnd && (
                <button onClick={handleResume} className="w-full btn-secondary text-sm">
                  Resume Subscription
                </button>
              )}
            </div>
          </div>
        )}

        {/* Invoice History Modal */}
        {showInvoiceHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{background:"rgba(0,0,0,0.7)"}}>
            <div className="deji-card p-6 w-full max-w-lg space-y-4" style={{maxHeight:"80vh",overflowY:"auto"}}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg" style={{fontFamily:"Syne,sans-serif"}}>Subscription History</h3>
                <button onClick={()=>setShowInvoiceHistory(false)}><X size={18}/></button>
              </div>
              {invoiceHistory.length === 0 ? (
                <p className="text-sm text-center py-8" style={{color:"var(--text-muted)"}}>No billing history yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs" style={{color:"var(--text-muted)"}}>
                    <th className="pb-2">Date</th><th className="pb-2">Plan</th>
                    <th className="pb-2">Amount</th><th className="pb-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {invoiceHistory.map((inv,i)=>(
                      <tr key={i} className="border-t" style={{borderColor:"var(--border)"}}>
                        <td className="py-2 text-xs">{new Date(inv.createdAt||inv.date).toLocaleDateString()}</td>
                        <td className="py-2 text-xs">{inv.plan}</td>
                        <td className="py-2 text-xs">₦{Number(inv.amount||0).toLocaleString()}</td>
                        <td className="py-2"><span className="badge badge-green text-[10px]">{inv.status||"paid"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Security ── */}
      <div className="deji-card p-6 space-y-4">
        <h3 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>Security</h3>

        <div className="space-y-3">
          <div>
            <label className="deji-label">Current Password</label>
            <input type="password" value={pwForm.current}
              onChange={e=>setPwForm(p=>({...p,current:e.target.value}))}
              className="deji-input" placeholder="••••••••"/>
          </div>
          <div>
            <label className="deji-label">New Password</label>
            <input type="password" value={pwForm.newPw}
              onChange={e=>setPwForm(p=>({...p,newPw:e.target.value}))}
              className="deji-input" placeholder="Min. 8 characters"/>
          </div>
          <div>
            <label className="deji-label">Confirm New Password</label>
            <input type="password" value={pwForm.confirm}
              onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))}
              className="deji-input" placeholder="Re-enter new password"/>
            {pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
              <p className="text-xs text-red-400 mt-1">Passwords don&apos;t match</p>
            )}
          </div>
        </div>

        <button onClick={savePassword} disabled={savingPw || !pwForm.current || !pwForm.newPw}
          className="btn-primary flex items-center gap-2"
          style={{opacity: (!pwForm.current || !pwForm.newPw) ? 0.5 : 1}}>
          {savingPw ? <Loader2 size={14} className="animate-spin"/> : saved==="password" ? <Check size={14}/> : <Shield size={14}/>}
          {savingPw ? "Updating..." : saved==="password" ? "Password Updated!" : "Update Password"}
        </button>
      </div>

      {/* ── Workspace info ── */}
      <div className="deji-card p-6 space-y-3">
        <h3 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>Workspace</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label:"Business Name",  value: settings.businessName || user?.tenantName || "—" },
            { label:"Your Role",      value: user?.role ? user.role.charAt(0).toUpperCase()+user.role.slice(1) : "Admin" },
            { label:"Currency",       value: settings.currency || "NGN" },
            { label:"Timezone",       value: settings.timezone?.split("/")[1]?.replace("_"," ") || "Lagos" },
            { label:"Language",       value: LANGUAGES.find(l=>l.code===settings.language)?.label || "🇬🇧 English" },
            { label:"Member Since",   value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—" },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl" style={{background:"var(--bg-hover)"}}>
              <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{color:"var(--text-muted)"}}>{item.label}</p>
              <p className="text-sm font-semibold truncate" style={{color:"var(--text-primary)"}}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
function SettingsContent() {
  const searchParams               = useSearchParams();
  const router                     = useRouter();
  const initialTab                 = searchParams.get("tab") || "profile";
  const [tab, setTab]              = useState(initialTab);
  const [saving, setSaving]        = useState(false);
  const [saved, setSaved]          = useState(false);
  const [loading, setLoading]      = useState(true);
  const [settings, setSettings]    = useState(DEFAULT);
  const [currencySearch, setCurrencySearch] = useState("");

  // Sync tab with URL
  const changeTab = (t) => {
    setTab(t);
    router.replace(`/settings?tab=${t}`, { scroll: false });
  };

  useEffect(() => {
    getTenantSettings()
      .then(r => {
        const s = r.data?.settings || r.data || {};
        const merged = { ...DEFAULT, ...s };
        setSettings(merged);
        localStorage.setItem("tenantSettings", JSON.stringify(merged));
      })
      .catch(() => {
        const cached = localStorage.getItem("tenantSettings");
        if (cached) try { setSettings({ ...DEFAULT, ...JSON.parse(cached) }); } catch {}
      })
      .finally(() => setLoading(false));
  }, []);

  const set = key => e => setSettings(p => ({
    ...p,
    [key]: e.target.type==="checkbox" ? e.target.checked
         : e.target.type==="number"   ? Number(e.target.value)
         : e.target.value,
  }));

  const { setCurrency } = useCurrency();
  const save = async () => {
    setSaving(true);
    try {
      await updateTenantSettings(settings);
      if (settings.currency) { setCurrency(settings.currency); localStorage.setItem('deji_currency', settings.currency); }
      localStorage.setItem("tenantSettings", JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) { alert(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const filteredCurrencies = Object.entries(CURRENCY_GROUPS).reduce((acc,[group,codes]) => {
    const filtered = codes.filter(code => {
      if (!currencySearch) return true;
      const q = currencySearch.toLowerCase();
      return code.toLowerCase().includes(q) || getCurrencyLabel(code).toLowerCase().includes(q);
    });
    if (filtered.length) acc[group] = filtered;
    return acc;
  }, {});

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      <div className="skeleton h-10 rounded-2xl"/>
      <div className="skeleton h-12 rounded-2xl"/>
      <div className="skeleton h-64 rounded-2xl"/>
    </div>
  );

  const isProfileTab = tab === "profile";

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your business preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings/staff" className="btn-secondary flex items-center gap-2">
            <Users size={14}/> Manage Staff
          </Link>
          {!isProfileTab && (
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin"/> : saved ? <Check size={14}/> : <Save size={14}/>}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => changeTab(t.id)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap flex items-center gap-2"
              style={{
                background:  tab===t.id ? "var(--primary)" : "transparent",
                color:       tab===t.id ? "#fff" : "var(--text-muted)",
                borderColor: tab===t.id ? "var(--primary)" : "var(--border)",
              }}>
              <Icon size={14}/>{t.label}
            </button>
          );
        })}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab==="profile" && <ProfileTab settings={settings}/>}

      {/* ── BUSINESS TAB ── */}
      {tab==="business" && (
        <div className="deji-card p-6 space-y-5">
          <h3 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl" style={{background:"var(--bg-hover)"}}>
            <ImageUpload label="Company Logo" hint="Shown in the top-left corner and on your storefront"
              value={settings.logoUrl} onChange={v=>setSettings(p=>({...p,logoUrl:v}))}/>
            <ImageUpload label="Receipt / Invoice Logo" hint="Printed on POS receipts and invoices"
              value={settings.receiptLogoUrl} onChange={v=>setSettings(p=>({...p,receiptLogoUrl:v}))}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="deji-label">Business Name *</label>
              <input value={settings.businessName} onChange={set("businessName")} className="deji-input" placeholder="Deji Kicks Ltd"/>
            </div>
            <div>
              <label className="deji-label">Email Address</label>
              <input type="email" value={settings.email} onChange={set("email")} className="deji-input" placeholder="hello@yourbusiness.com"/>
            </div>
            <div>
              <label className="deji-label">Phone Number</label>
              <input value={settings.phone} onChange={set("phone")} className="deji-input" placeholder="08012345678"/>
            </div>
            <div className="col-span-2">
              <label className="deji-label">Business Address</label>
              <textarea value={settings.address} onChange={set("address")} className="deji-input resize-none" rows={2} placeholder="123 Victoria Island, Lagos"/>
            </div>
            <div className="col-span-2">
              <label className="deji-label">Website</label>
              <input value={settings.website} onChange={set("website")} className="deji-input" placeholder="https://yoursite.com"/>
            </div>
          </div>
          <div style={{borderTop:"1px solid var(--border)",paddingTop:"1rem"}}>
            <h4 className="font-semibold mb-3 text-sm" style={{color:"var(--text-primary)"}}>Invoice & Receipt Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="deji-label">Invoice Number Prefix</label>
                <input value={settings.invoicePrefix} onChange={set("invoicePrefix")} className="deji-input" placeholder="INV-"/>
              </div>
              <div>
                <label className="deji-label">Low Stock Alert Threshold</label>
                <input type="number" min="1" value={settings.lowStockThreshold} onChange={set("lowStockThreshold")} className="deji-input"/>
              </div>
              <div className="col-span-2">
                <label className="deji-label">Receipt Footer Message</label>
                <input value={settings.receiptFooter} onChange={set("receiptFooter")} className="deji-input" placeholder="Thank you for your business!"/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOCALIZATION TAB ── */}
      {tab==="localization" && (
        <div className="deji-card p-6 space-y-5">
          <h3 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>Localization</h3>
          <div>
            <label className="deji-label">Currency</label>
            <input value={currencySearch} onChange={e=>setCurrencySearch(e.target.value)}
              className="deji-input mb-3" placeholder="Search currency (e.g. Naira, USD, GHS)..."/>
            <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
              {Object.entries(filteredCurrencies).map(([group,codes]) => (
                <div key={group}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{color:"var(--text-muted)"}}>{group}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {codes.map(code => (
                      <button key={code} type="button" onClick={()=>setSettings(p=>({...p,currency:code}))}
                        className="text-left px-3 py-2 rounded-xl text-xs border transition-all"
                        style={{
                          background:  settings.currency===code?"var(--primary-dim)":"transparent",
                          borderColor: settings.currency===code?"var(--primary)":"var(--border)",
                          color:       settings.currency===code?"var(--primary)":"var(--text-muted)",
                        }}>
                        {getCurrencyLabel(code)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="deji-label">Timezone</label>
            <select value={settings.timezone} onChange={set("timezone")} className="deji-input">
              {TIMEZONES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="deji-label">Language</label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map(l => (
                <button key={l.code} type="button" onClick={()=>setSettings(p=>({...p,language:l.code}))}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background:  settings.language===l.code?"var(--primary)":"transparent",
                    color:       settings.language===l.code?"#fff":"var(--text-muted)",
                    borderColor: settings.language===l.code?"var(--primary)":"var(--border)",
                  }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab==="notifications" && (
        <div className="deji-card p-6 space-y-4">
          <h3 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>Notification Preferences</h3>
          {[
            {key:"notifyEmail",    label:"Email Notifications",  desc:"Receive order confirmations, new leads, and daily summaries by email"},
            {key:"notifyWhatsApp", label:"WhatsApp Alerts",      desc:"Real-time alerts for new sales, leads, and urgent stock warnings via WhatsApp"},
            {key:"lowStockAlerts", label:"Low Stock Alerts",     desc:"Get notified when any product falls below your stock threshold"},
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between p-4 rounded-2xl" style={{background:"var(--bg-hover)"}}>
              <div>
                <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>{n.label}</p>
                <p className="text-xs mt-0.5 max-w-sm" style={{color:"var(--text-muted)"}}>{n.desc}</p>
              </div>
              <button type="button"
                onClick={()=>setSettings(p=>({...p,[n.key]:!p[n.key]}))}
                className="w-11 h-6 rounded-full relative transition-all flex-shrink-0 ml-4"
                style={{background:settings[n.key]?"var(--primary)":"var(--border)"}}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                  style={{left:settings[n.key]?"calc(100% - 22px)":"2px"}}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab==="payments" && (
        <div className="deji-card p-6 space-y-5">
          <h3 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>Payment Gateway Keys</h3>
          <div className="p-3 rounded-xl" style={{background:"var(--primary-dim)",border:"1px solid var(--primary)"}}>
            <p className="text-xs" style={{color:"var(--primary)"}}>🔒 Keys are stored securely and never exposed to the client.</p>
          </div>
          {[
            {key:"paystackKey",    label:"Paystack Secret Key",    placeholder:"sk_live_xxxxxxxxx", icon:"🟢", hint:"dashboard.paystack.com → Settings → API Keys"},
            {key:"flutterwaveKey", label:"Flutterwave Secret Key", placeholder:"FLWSECK_TEST-xxxxx", icon:"🦋", hint:"app.flutterwave.com → Settings → API Keys"},
            {key:"stripeKey",      label:"Stripe Secret Key",      placeholder:"sk_live_xxxxxxxxx", icon:"💳", hint:"dashboard.stripe.com → Developers → API Keys"},
          ].map(p => (
            <div key={p.key}>
              <label className="deji-label">{p.icon} {p.label}</label>
              <input type="password" value={settings[p.key]} onChange={set(p.key)}
                className="deji-input font-mono" placeholder={p.placeholder} autoComplete="new-password"/>
              <p className="text-[10px] mt-1" style={{color:"var(--text-muted)"}}>{p.hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── BRANDING TAB ── */}
      {tab==="branding" && (
        <div className="deji-card p-6 space-y-5">
          <h3 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>Brand Customisation</h3>
          <div>
            <label className="deji-label">Primary Brand Colour</label>
            <p className="text-xs mb-3" style={{color:"var(--text-muted)"}}>Used for buttons, badges, highlights, and your storefront</p>
            <div className="flex items-center gap-3">
              <input type="color" value={settings.primaryColor} onChange={set("primaryColor")}
                className="w-12 h-12 rounded-xl border cursor-pointer flex-shrink-0"
                style={{borderColor:"var(--border)",background:"transparent"}}/>
              <input value={settings.primaryColor} onChange={set("primaryColor")}
                className="deji-input flex-1 font-mono" placeholder="#22c55e" maxLength={7}/>
            </div>
          </div>
          <div className="p-5 rounded-2xl space-y-4" style={{background:"var(--bg-hover)"}}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>Preview</p>
            <div className="flex flex-wrap gap-3 items-center">
              <button className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{background:settings.primaryColor}}>Primary Button</button>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{background:settings.primaryColor+"22",color:settings.primaryColor}}>Badge</span>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{background:settings.primaryColor}}>
                {settings.businessName?.[0]?.toUpperCase()||"D"}
              </div>
            </div>
          </div>
          <div className="p-3 rounded-xl" style={{background:"var(--primary-dim)",border:"1px solid var(--primary)"}}>
            <p className="text-xs" style={{color:"var(--primary)"}}>💡 After saving, refresh the page to apply your brand colour across the platform.</p>
          </div>
        </div>
      )}

      {/* Mobile save bar */}
      {!isProfileTab && (
        <div className="fixed bottom-20 left-0 right-0 lg:hidden px-4 z-40">
          <button onClick={save} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-2xl">
            {saving ? <Loader2 size={14} className="animate-spin"/> : saved ? <Check size={14}/> : <Save size={14}/>}
            {saving ? "Saving..." : saved ? "Changes Saved!" : "Save All Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="space-y-4 max-w-3xl"><div className="skeleton h-64 rounded-2xl"/></div>}>
      <SettingsContent/>
    </Suspense>
  );
}