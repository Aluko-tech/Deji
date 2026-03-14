"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { login } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (err) {
      // Show the exact message from the backend
      const msg = err?.response?.data?.message || err?.message || "Invalid email or password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    background: "#0d1f13",
    border: "1px solid #1a3322",
    color: "#f0fdf4",
    caretColor: "#22c55e",
    width: "100%",
    padding: "14px 16px",
    borderRadius: "16px",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#050d08" }}>

      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#0a1f12 0%,#050d08 55%,#061a0e 100%)" }}>
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: "linear-gradient(#22c55e 1px,transparent 1px),linear-gradient(90deg,#22c55e 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}/>
        <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-10"
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
            Your business,<br/><span style={{ color: "#22c55e" }}>fully in control.</span>
          </h2>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "#86efac", opacity: 0.7 }}>
            Inventory, sales, finance, CRM — everything your team needs in one place. Built for African businesses.
          </p>
          <div className="flex gap-8 pt-2">
            {[["500+","Businesses"],["99.9%","Uptime"],["₦2B+","Processed"]].map(([v,l]) => (
              <div key={l}>
                <p className="text-xl font-black" style={{ fontFamily: "Syne,sans-serif", color: "#4ade80" }}>{v}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: "#86efac", opacity: 0.5 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs" style={{ color: "#4ade80", opacity: 0.35 }}>
          © {new Date().getFullYear()} Deji Business OS. All rights reserved.
        </p>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-7">

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
              Welcome back
            </h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>Sign in to your workspace</p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl flex items-start gap-3"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0"/>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>
                Email Address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required
                style={inp}
                onFocus={e => e.target.style.borderColor = "#22c55e"}
                onBlur={e => e.target.style.borderColor = "#1a3322"}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold" style={{ color: "#22c55e" }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={show ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ ...inp, paddingRight: "48px" }}
                  onFocus={e => e.target.style.borderColor = "#22c55e"}
                  onBlur={e => e.target.style.borderColor = "#1a3322"}
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#4b5563" }}>
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: "linear-gradient(135deg,#22c55e,#16a34a)",
                color: "#fff",
                opacity: loading ? 0.75 : 1,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? <><Loader2 size={15} className="animate-spin"/> Signing in...</> : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-sm" style={{ color: "#6b7280" }}>
            Don't have an account?{" "}
            <Link href="/signup" className="font-bold" style={{ color: "#22c55e" }}>Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}