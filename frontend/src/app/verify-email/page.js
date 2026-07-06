"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("No verification token provided"); return; }
    fetch(`${API}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) { setStatus("success"); setMessage("Email verified! You can now extract deals."); }
        else { setStatus("error"); setMessage(data.detail || "Verification failed"); }
      })
      .catch(() => { setStatus("error"); setMessage("Network error"); });
  }, [token]);

  return (
    <>
      {status === "verifying" && (
        <>
          <div className="spinner mx-auto mb-4" />
          <p className="text-[#453D30] font-medium">Verifying your email...</p>
        </>
      )}
      {status === "success" && (
        <>
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-lg font-semibold text-[#1C1810] mb-2">Email Verified!</h1>
          <p className="text-sm text-[#A39C8E] mb-6">{message}</p>
          <Link href="/" className="btn btn-primary">Start Extracting →</Link>
        </>
      )}
      {status === "error" && (
        <>
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-lg font-semibold text-[#1C1810] mb-2">Verification Failed</h1>
          <p className="text-sm text-[#A39C8E] mb-6">{message}</p>
          <Link href="/login" className="btn btn-primary">Back to login</Link>
        </>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="auth-page">
      <Suspense fallback={<div className="spinner mx-auto" />}>
        <div className="auth-card animate-fade-in text-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1C1810] to-[#B5652B] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">D</span>
          </div>
          <VerifyContent />
        </div>
      </Suspense>
    </div>
  );
}
