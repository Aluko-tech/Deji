"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import api from "@/lib/api";

const BUSINESS_TYPES = [
  { value: "retail",     label: "🛍️ Retail Store"    },
  { value: "ecommerce",  label: "🛒 E-Commerce"       },
  { value: "wholesale",  label: "📦 Wholesale"        },
];

export default function SignupPage() {
  const [step, setStep]       = useState(1); // 1 = form, 2 = check email
  const [form, setForm]       = useState({ email:"", password:"", tenantName:"", businessType:"retail" });
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/register", { ...form, role: "admin" });
      // Auto-login: backend now returns token + user directly
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        window.location.href = "/dashboard";
      } else {
        // Fallback: show verify email screen (shouldn't happen)
        setStep(2);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api.post("/auth/resend-verification", { email: form.email });
      alert("Verification email resent!");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to resend. Try again.");
    }
  };

  const inp = {
    background: "#0d1f13",
    border: "1px solid #1a3322",
    color: "#f0fdf4",
    caretColor: "#22c55e",
  };

  const Logo = () => (
    <div className="flex items-center gap-3 justify-center">
      <img src="/icons/icon-192x192.png" alt="Deji" className="w-10 h-10 rounded-2xl object-cover"/>
      <p className="font-black text-2xl" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
        Deji<span style={{ color: "#22c55e" }}>.</span>
      </p>
    </div>
  );

  // ── STEP 2: Check your email ───────────────────────────────────────────────
  if (step === 2) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#050d08" }}>
      <div className="w-full max-w-md space-y-6 text-center">
        <Logo/>
        <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <Mail size={36} style={{ color: "#22c55e" }}/>
        </div>
        <div>
          <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
            Check your inbox
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
            We sent a verification link to{" "}
            <span className="font-semibold" style={{ color: "#22c55e" }}>{form.email}</span>.
            Click it to activate your account.
          </p>
        </div>
        <div className="p-4 rounded-2xl text-left space-y-2.5"
          style={{ background: "#0d1f13", border: "1px solid #1a3322" }}>
          {[
            "Check your spam / junk folder if you don't see it",
            "The verification link expires in 24 hours",
            "You won't be able to log in until verified",
          ].map((tip,i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: "#22c55e" }}/>
              <p className="text-xs" style={{ color: "#86efac", opacity: 0.8 }}>{tip}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <button onClick={resend}
            className="w-full py-3 rounded-2xl font-bold text-sm"
            style={{ background: "#0d1f13", border: "1px solid #1a3322", color: "#22c55e" }}>
            Resend verification email
          </button>
          <Link href="/login"
            className="block w-full py-3 rounded-2xl font-bold text-sm text-center"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff" }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );

  // ── STEP 1: Registration form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: "#050d08" }}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#0a1f12 0%,#050d08 55%,#061a0e 100%)" }}>
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: "linear-gradient(#22c55e 1px,transparent 1px),linear-gradient(90deg,#22c55e 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}/>
        <div className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle,#22c55e,transparent)" }}/>

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xl text-white"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", fontFamily: "Syne,sans-serif" }}>D</div>
          <div>
            <p className="font-black text-2xl" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
              Deji<span style={{ color: "#22c55e" }}>.</span>
            </p>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "#4ade80", opacity: 0.6 }}>Business OS</p>
          </div>
        </div>

        <div className="relative space-y-5">
          <div className="w-10 h-0.5 rounded-full" style={{ background: "#22c55e" }}/>
          <h2 className="text-4xl font-black leading-tight" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
            Launch your<br/><span style={{ color: "#22c55e" }}>business today.</span>
          </h2>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "#86efac", opacity: 0.7 }}>
            Free to start. No credit card required. Ready in under 2 minutes.
          </p>
          <div className="space-y-2.5 pt-2">
            {["✦ Inventory & POS included","✦ Invoicing & ledger built in","✦ CRM & team management","✦ Your brand, your colours"].map(f => (
              <p key={f} className="text-sm font-semibold" style={{ color: "#4ade80" }}>{f}</p>
            ))}
          </div>
        </div>

        <p className="relative text-xs" style={{ color: "#4ade80", opacity: 0.35 }}>© {new Date().getFullYear()} Deji Business OS</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-[440px] space-y-6">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white"
              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", fontFamily: "Syne,sans-serif" }}>D</div>
            <p className="font-black text-2xl" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
              Deji<span style={{ color: "#22c55e" }}>.</span>
            </p>
          </div>

          <div>
            <h1 className="text-3xl font-black mb-1" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
              Create your workspace
            </h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>Set up your business in under 2 minutes</p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl flex items-start gap-3"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0"/>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Business name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>
                Business Name *
              </label>
              <input type="text" value={form.tenantName} onChange={set("tenantName")}
                placeholder="Adewale's Fashion Store" required
                className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
                style={inp}
                onFocus={e => e.target.style.borderColor = "#22c55e"}
                onBlur={e => e.target.style.borderColor = "#1a3322"}
              />
            </div>

            {/* Business type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>
                Business Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BUSINESS_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setForm(p => ({ ...p, businessType: t.value }))}
                    className="p-3 rounded-xl text-sm font-semibold text-left transition-all"
                    style={{
                      background:  form.businessType === t.value ? "rgba(34,197,94,0.1)" : "#0d1f13",
                      border:      `1px solid ${form.businessType === t.value ? "#22c55e" : "#1a3322"}`,
                      color:       form.businessType === t.value ? "#22c55e" : "#6b7280",
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>
                Email Address *
              </label>
              <input type="email" value={form.email} onChange={set("email")}
                placeholder="you@company.com" required
                className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
                style={inp}
                onFocus={e => e.target.style.borderColor = "#22c55e"}
                onBlur={e => e.target.style.borderColor = "#1a3322"}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>
                Password *
              </label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={form.password} onChange={set("password")}
                  placeholder="Min. 8 characters" minLength={8} required
                  className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all pr-12"
                  style={inp}
                  onFocus={e => e.target.style.borderColor = "#22c55e"}
                  onBlur={e => e.target.style.borderColor = "#1a3322"}
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#4b5563" }}>
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
                <div className="mt-2 flex gap-1">
                  {[1,2,3,4].map(n => (
                    <div key={n} className="h-1 flex-1 rounded-full transition-all"
                      style={{
                        background: form.password.length >= n * 2
                          ? n <= 2 ? "#ef4444" : n === 3 ? "#f59e0b" : "#22c55e"
                          : "#1a3322"
                      }}/>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: "linear-gradient(135deg,#22c55e,#16a34a)",
                color: "#fff",
                opacity: loading ? 0.75 : 1,
              }}>
              {loading ? <><Loader2 size={15} className="animate-spin"/> Creating workspace...</> : "Create Free Account →"}
            </button>

            <p className="text-center text-xs" style={{ color: "#4b5563" }}>
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          <p className="text-center text-sm" style={{ color: "#6b7280" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-bold" style={{ color: "#22c55e" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}