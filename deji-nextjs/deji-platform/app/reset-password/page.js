"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

const Logo = () => (
  <div className="flex items-center gap-3 justify-center">
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white"
      style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", fontFamily: "Syne,sans-serif" }}>D</div>
    <p className="font-black text-2xl" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
      Deji<span style={{ color: "#22c55e" }}>.</span>
    </p>
  </div>
);

export default function ResetPasswordPage() {
  const searchParams          = useSearchParams();
  const token                 = searchParams.get("token");
  const router                = useRouter();
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);

  useEffect(() => {
    if (!token) router.replace("/forgot-password");
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Reset failed. The link may have expired.");
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

  // ── Success ───────────────────────────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#050d08" }}>
      <div className="w-full max-w-md text-center space-y-6">
        <Logo/>
        <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <CheckCircle2 size={36} style={{ color: "#22c55e" }}/>
        </div>
        <div>
          <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
            Password reset!
          </h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Your password has been updated. Redirecting you to sign in...
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" style={{ color: "#22c55e" }}/>
          <p className="text-sm" style={{ color: "#22c55e" }}>Taking you to login...</p>
        </div>
      </div>
    </div>
  );

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#050d08" }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#22c55e 1px,transparent 1px),linear-gradient(90deg,#22c55e 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }}/>

      <div className="w-full max-w-md space-y-7 relative">
        <Logo/>

        <div>
          <h1 className="text-3xl font-black mb-1" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
            Set new password
          </h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Choose a strong password for your account.
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
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                style={{ ...inp, paddingRight: "48px" }}
                onFocus={e => e.target.style.borderColor = "#22c55e"}
                onBlur={e => e.target.style.borderColor = "#1a3322"}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#4b5563" }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {/* Strength bar */}
            {password && (
              <div className="mt-2 flex gap-1">
                {[1,2,3,4].map(n => (
                  <div key={n} className="h-1 flex-1 rounded-full transition-all"
                    style={{
                      background: password.length >= n * 2
                        ? n <= 2 ? "#ef4444" : n === 3 ? "#f59e0b" : "#22c55e"
                        : "#1a3322"
                    }}/>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              style={{
                ...inp,
                borderColor: confirm && confirm !== password ? "#ef4444" : "#1a3322",
              }}
              onFocus={e => e.target.style.borderColor = confirm !== password ? "#ef4444" : "#22c55e"}
              onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? "#ef4444" : "#1a3322"}
            />
            {confirm && confirm !== password && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
            {confirm && confirm === password && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#22c55e" }}>
                <CheckCircle2 size={11}/> Passwords match
              </p>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "#fff",
              opacity: loading ? 0.75 : 1,
            }}>
            {loading ? <><Loader2 size={15} className="animate-spin"/> Resetting...</> : "Reset Password →"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "#6b7280" }}>
          <Link href="/login" className="font-bold" style={{ color: "#22c55e" }}>Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}