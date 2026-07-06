"use client";

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (r.ok) setSent(true);
      else setError(data.detail || "Something went wrong");
    } catch { setError("Network error"); }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C1810] to-[#B5652B] flex items-center justify-center text-white font-bold text-lg shadow-sm">D</div>
          </Link>
          <h1>Forgot password?</h1>
          <p className="subtitle">No worries, we&apos;ll send you a reset link</p>
        </div>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm text-center">
            ✉️ Check your email for the reset link. It expires in 1 hour.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 p-3.5 rounded-xl text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#453D30] mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="you@example.com" required />
            </div>
            <button type="submit" disabled={loading}
              className="btn btn-primary btn-full">
              {loading ? "Sending..." : "Send Reset Link →"}
            </button>
          </form>
        )}

        <p className="text-sm text-[#8A8272] text-center mt-6">
          <Link href="/login" className="text-[#B5652B] hover:text-[#96501F] font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
