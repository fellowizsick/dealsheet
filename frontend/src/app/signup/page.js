"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const t1 = setTimeout(() => setAnimPhase(1), 600);
    const t2 = setTimeout(() => setAnimPhase(2), 1400);
    const t3 = setTimeout(() => setAnimPhase(3), 2200);
    const t4 = setTimeout(() => setAnimPhase(4), 2800);
    const loop = setTimeout(() => {
      setAnimPhase(0);
      setTimeout(() => setAnimPhase(1), 600);
      setTimeout(() => setAnimPhase(2), 1400);
      setTimeout(() => setAnimPhase(3), 2200);
      setTimeout(() => setAnimPhase(4), 2800);
    }, 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(loop); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Signup failed");
      login(data.token, { id: data.user_id, email: data.email });
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-gradient min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="auth-blob absolute top-[-12%] right-[-8%] rounded-full bg-[#D98A4D]/10 blur-[120px]" />
      <div className="w-[350px] h-[350px] absolute bottom-[-15%] left-[-8%] rounded-full bg-[#D4A017]/8 blur-[100px]" />

      {/* Form card */}
      <div className="glass-card-solid rounded-3xl elevated-shadow w-full max-w-md p-6 sm:p-8 lg:p-10 animate-fade-in relative z-10 mx-auto">
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1C1810] via-[#B5652B] to-[#D4A017] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#B5652B]/20 logo-glow group-hover:scale-105 transition-transform duration-300">
              D
            </div>
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#1C1810] tracking-tight">
            Start closing deals
          </h1>
          <p className="text-[#8A8272] text-sm mt-1.5">Free account. No credit card. 50 extractions.</p>
        </div>

        {error && (
          <div className="bg-[#FBEEEC]/80 border border-[#E8C4BC] text-[#9B3A22] p-3.5 rounded-2xl mb-6 text-sm flex items-start gap-3 animate-fade-in">
            <span className="text-lg shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#453D30] mb-1.5">Email</label>
            <div className="input-wrap rounded-2xl">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-modern w-full border-2 border-[#E8E4DC] rounded-2xl px-4 py-3.5 text-base bg-white/70 outline-none text-[#1C1810] placeholder:text-[#A39C8E]"
                placeholder="you@example.com" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#453D30] mb-1.5">Password</label>
            <div className="input-wrap rounded-2xl">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-modern w-full border-2 border-[#E8E4DC] rounded-2xl px-4 py-3.5 text-base bg-white/70 outline-none text-[#1C1810] placeholder:text-[#A39C8E]"
                placeholder="Create a strong password" required minLength={6} />
            </div>
            <p className="text-xs text-[#A39C8E] mt-1.5 ml-1">At least 6 characters</p>
          </div>
          <button type="submit" disabled={loading}
            className="btn-accent w-full text-white py-4 rounded-2xl font-semibold text-sm disabled:opacity-40 min-h-[52px]">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner !w-4 !h-4 !border-2" />
                Creating account...
              </span>
            ) : "Create Free Account →"}
          </button>
        </form>

        <p className="text-sm text-[#8A8272] text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#B5652B] hover:text-[#96501F] font-semibold hover:underline transition-colors">
            Sign in
          </Link>
        </p>

        <div className="mt-8 pt-6 border-t border-[#F0EDE6]">
          <p className="text-xs text-[#A39C8E] text-center">50 free extractions · No credit card · Cancel anytime</p>
        </div>
      </div>

      {/* RIGHT: Transformation visual */}
      <div className="hidden lg:flex flex-col items-start justify-center w-[340px] ml-10 animate-fade-in-2 relative z-10">
        <div className="glass-card rounded-3xl p-6 text-white overflow-hidden relative min-h-[340px]">
          {/* Background shimmer */}
          <div className={`absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4A017]/40 to-transparent transition-all duration-1000 ${animPhase >= 2 ? 'opacity-100' : 'opacity-0'}`} style={{ top: '48%' }} />

          {/* BEFORE: PDF */}
          <div className={`absolute left-6 top-6 w-[120px] transition-all duration-700 ease-out ${animPhase >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <div className="w-full aspect-[3/4] rounded-xl bg-white/10 border border-white/15 p-3 backdrop-blur-sm">
              <div className="w-3/4 h-1.5 rounded bg-white/20 mb-2" />
              <div className="w-full h-1.5 rounded bg-white/15 mb-1.5" />
              <div className="w-5/6 h-1.5 rounded bg-white/15 mb-1.5" />
              <div className="w-2/3 h-1.5 rounded bg-white/15 mb-1.5" />
              <div className="w-4/5 h-1.5 rounded bg-white/15 mb-1.5" />
              <div className="w-3/4 h-1.5 rounded bg-white/15 mb-1.5" />
              <div className="w-1/3 h-1.5 rounded bg-[#D4A017]/30 mt-3" />
              <div className="w-1/2 h-1.5 rounded bg-[#D4A017]/20 mt-1" />
            </div>
            <span className="text-[10px] text-white/40 mt-1.5 block text-center">Purchase Agreement PDF</span>
          </div>

          {/* ARROW */}
          <div className={`absolute left-[150px] top-1/2 -translate-y-1/2 transition-all duration-700 delay-200 ${animPhase >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
              <path d="M0 12H32M32 12L24 4M32 12L24 20" stroke="url(#g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="g" x1="0" y1="12" x2="40" y2="12" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#D98A4D" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#D4A017" />
                  <stop offset="100%" stopColor="#D4A017" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* AFTER: Deal Card */}
          <div className={`absolute right-6 top-6 w-[150px] transition-all duration-700 delay-500 ${animPhase >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="w-full bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 p-4">
              <div className={`flex items-center gap-1.5 mb-3 transition-all duration-500 delay-700 ${animPhase >= 4 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-4 h-4 rounded-full bg-[#D4A017] flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[10px] font-semibold text-[#D4A017] uppercase tracking-wider">Extracted</span>
              </div>

              <div className={`transition-all duration-500 delay-800 ${animPhase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <p className="text-xs font-medium text-white leading-tight">742 Evergreen Terr</p>
                <p className="text-[10px] text-white/50 mb-2">Seattle, WA 98101</p>
              </div>

              <div className={`flex items-center justify-between border-t border-white/10 pt-2 transition-all duration-500 delay-900 ${animPhase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <span className="text-[10px] text-white/50">Purchase Price</span>
                <span className="text-sm font-bold text-[#D4A017]">$1.2M</span>
              </div>

              <div className={`flex justify-between mt-1.5 transition-all duration-500 delay-1000 ${animPhase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <div>
                  <p className="text-[9px] text-white/40">Sq Ft</p>
                  <p className="text-[11px] font-medium text-white">3,200</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-white/40">Closing</p>
                  <p className="text-[11px] font-medium text-white">Sep 1</p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-white/40 mt-1.5 text-center">Structured deal data in seconds</p>
          </div>
        </div>
      </div>
    </div>
  );
}
