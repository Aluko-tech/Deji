"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const Logo = () => (
    <div className="flex items-center gap-3 justify-center">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white"
        style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", fontFamily: "Syne,sans-serif" }}>D</div>
      <p className="font-black text-2xl" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
        Deji<span style={{ color: "#22c55e" }}>.</span>
      </p>
    </div>
  );

  // ── Sent state ────────────────────────────────────────────────────────────
  if (sent) return (
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
            If <span style={{ color: "#22c55e" }}>{email}</span> has an account, we sent a password reset link. It expires in 1 hour.
          </p>
        </div>
        <div className="p-4 rounded-2xl text-left space-y-2.5"
          style={{ background: "#0d1f13", border: "1px solid #1a3322" }}>
          {[
            "Check your spam / junk folder if you don't see it",
            "The link expires in 1 hour",
            "You can request another link if it expires",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: "#22c55e" }}/>
              <p className="text-xs" style={{ color: "#86efac", opacity: 0.8 }}>{tip}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <button onClick={() => { setSent(false); setEmail(""); }}
            className="w-full py-3 rounded-2xl font-bold text-sm"
            style={{ background: "#0d1f13", border: "1px solid #1a3322", color: "#22c55e" }}>
            Send another link
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

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#050d08" }}>
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#22c55e 1px,transparent 1px),linear-gradient(90deg,#22c55e 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }}/>

      <div className="w-full max-w-md space-y-7 relative">
        <Logo/>

        <div>
          <h1 className="text-3xl font-black mb-1" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
            Forgot password?
          </h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Enter your email and we'll send you a reset link.
          </p>
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
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
              style={{ background: "#0d1f13", border: "1px solid #1a3322", color: "#f0fdf4", caretColor: "#22c55e" }}
              onFocus={e => e.target.style.borderColor = "#22c55e"}
              onBlur={e => e.target.style.borderColor = "#1a3322"}
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "#fff",
              opacity: loading ? 0.75 : 1,
            }}>
            {loading ? <><Loader2 size={15} className="animate-spin"/> Sending...</> : "Send Reset Link →"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "#6b7280" }}>
          Remembered it?{" "}
          <Link href="/login" className="font-bold" style={{ color: "#22c55e" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}