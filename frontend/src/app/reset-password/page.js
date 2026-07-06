"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await r.json();
      if (r.ok) setSuccess(true);
      else setError(data.detail || "Invalid or expired link");
    } catch { setError("Network error"); }
    setLoading(false);
  };

  if (!token) return (
    <div className="text-center">
      <p className="text-red-600">Invalid reset link. No token provided.</p>
      <Link href="/forgot-password" className="text-[#B5652B] mt-4 inline-block">Request a new link</Link>
    </div>
  );

  if (success) return (
    <div className="text-center">
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm mb-4">
        ✅ Password reset successfully!
      </div>
      <Link href="/login" className="btn btn-primary inline-block">Sign in</Link>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-3.5 rounded-xl text-sm">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-[#453D30] mb-1.5">New Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="input-field" placeholder="Min 6 characters" required minLength={6} />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#453D30] mb-1.5">Confirm Password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          className="input-field" placeholder="Enter again" required />
      </div>
      <button type="submit" disabled={loading}
        className="btn btn-primary btn-full">
        {loading ? "Resetting..." : "Reset Password →"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <Suspense fallback={<div className="spinner mx-auto" />}>
        <div className="auth-card animate-fade-in">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C1810] to-[#B5652B] flex items-center justify-center text-white font-bold text-lg shadow-sm">D</div>
            </Link>
            <h1>Set new password</h1>
            <p className="subtitle">Make it a good one this time</p>
          </div>
          <ResetForm />
        </div>
      </Suspense>
    </div>
  );
}
