"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
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

export default function InvitePage() {
  const searchParams = useSearchParams();
  const token        = searchParams.get("token");
  const router       = useRouter();

  const [step, setStep]                   = useState("loading"); // loading|valid|invalid|success
  const [invite, setInvite]               = useState(null);
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirm]     = useState("");
  const [showPw, setShowPw]               = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");

  useEffect(() => {
    if (!token) { setStep("invalid"); return; }
    api.get(`/auth/invite/${token}`)
      .then(res => { setInvite(res.data); setStep("valid"); })
      .catch(() => setStep("invalid"));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/accept-invite", { token, password });
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }
      setStep("success");
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to accept invite. The link may have expired.");
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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (step === "loading") return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#050d08" }}>
      <div className="text-center space-y-4">
        <Logo/>
        <Loader2 size={24} className="animate-spin mx-auto" style={{ color: "#22c55e" }}/>
        <p className="text-sm" style={{ color: "#6b7280" }}>Validating your invite link...</p>
      </div>
    </div>
  );

  // ── Invalid ──────────────────────────────────────────────────────────────
  if (step === "invalid") return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#050d08" }}>
      <div className="w-full max-w-md text-center space-y-6">
        <Logo/>
        <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle size={36} className="text-red-400"/>
        </div>
        <div>
          <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
            Invalid or expired link
          </h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            This invite link is no longer valid. It may have been used already or expired after 7 days.
            Contact your admin to send a new invite.
          </p>
        </div>
        <Link href="/login"
          className="block w-full py-3.5 rounded-2xl font-bold text-sm text-center"
          style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff" }}>
          Back to Sign In
        </Link>
      </div>
    </div>
  );

  // ── Success ──────────────────────────────────────────────────────────────
  if (step === "success") return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#050d08" }}>
      <div className="w-full max-w-md text-center space-y-6">
        <Logo/>
        <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <CheckCircle2 size={36} style={{ color: "#22c55e" }}/>
        </div>
        <div>
          <h1 className="text-2xl font-black mb-2" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
            You're all set{invite?.firstName ? `, ${invite.firstName}` : ""}!
          </h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Your account is ready. Taking you to the dashboard...
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" style={{ color: "#22c55e" }}/>
          <p className="text-sm" style={{ color: "#22c55e" }}>Redirecting...</p>
        </div>
      </div>
    </div>
  );

  // ── Set password form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: "#050d08" }}>
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#22c55e 1px,transparent 1px),linear-gradient(90deg,#22c55e 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }}/>

      <div className="w-full max-w-md space-y-6 relative">
        <Logo/>

        {/* Business context card */}
        <div className="p-5 rounded-2xl text-center"
          style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center font-black text-2xl text-white"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", fontFamily: "Syne,sans-serif" }}>
            {invite?.businessName?.[0]?.toUpperCase() || "D"}
          </div>
          <p className="text-sm font-bold" style={{ color: "#f0fdf4" }}>You've been invited to join</p>
          <p className="text-lg font-black mt-1" style={{ fontFamily: "Syne,sans-serif", color: "#22c55e" }}>
            {invite?.businessName || "your workspace"}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <ShieldCheck size={13} style={{ color: "#4ade80" }}/>
            <p className="text-xs capitalize" style={{ color: "#86efac" }}>
              Role: <span className="font-bold">{invite?.role || "Staff"}</span>
            </p>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black mb-1" style={{ fontFamily: "Syne,sans-serif", color: "#f0fdf4" }}>
            Set your password
          </h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Welcome{invite?.firstName ? `, ${invite.firstName}` : ""}! Choose a secure password to activate{" "}
            <span style={{ color: "#22c55e" }}>{invite?.email}</span>
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
              <input type={showPw ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters" required
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
            <input type="password" value={confirmPassword}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password" required
              style={{
                ...inp,
                borderColor: confirmPassword && confirmPassword !== password ? "#ef4444" : "#1a3322",
              }}
              onFocus={e => e.target.style.borderColor = confirmPassword !== password ? "#ef4444" : "#22c55e"}
              onBlur={e => e.target.style.borderColor = confirmPassword && confirmPassword !== password ? "#ef4444" : "#1a3322"}
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
            {confirmPassword && confirmPassword === password && (
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
            {loading ? <><Loader2 size={15} className="animate-spin"/> Activating account...</> : "Activate My Account →"}
          </button>
        </form>

        <p className="text-center text-xs" style={{ color: "#4b5563" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "#22c55e" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}