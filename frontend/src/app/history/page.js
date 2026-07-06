"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HistoryPage() {
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const { user, token, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/extractions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setExtractions(data.map((e) => ({ ...e, result: JSON.parse(e.result_json) })));
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [token, authLoading, router]);

  const toggleRow = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  if (authLoading || loading) return (
    <div className="bg-[#FAF9F6] min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  );
  if (error) return <div className="min-h-screen flex items-center justify-center text-[#9B3A22] text-sm p-4">{error}</div>;

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Mobile-first nav */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-[#F0EDE6] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2.5 lg:py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-gradient-to-br from-[#1C1810] to-[#B5652B] flex items-center justify-center text-white font-bold text-xs lg:text-sm shadow-sm">D</div>
            <span className="font-bold text-[#1C1810] text-base lg:text-lg tracking-tight">DealSheet</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
            <Link href="/" className="text-xs lg:text-sm text-[#8A8272] hover:text-[#1C1810]">Extract</Link>
            <Link href="/dashboard" className="text-xs lg:text-sm text-[#8A8272] hover:text-[#1C1810]">Dashboard</Link>
            <Link href="/history" className="text-xs lg:text-sm font-semibold text-[#1C1810]">History</Link>
            <button onClick={() => { logout(); router.push("/login"); }}
              className="text-xs lg:text-sm text-[#A39C8E] hover:text-[#9B3A22] transition-colors font-medium whitespace-nowrap ml-1">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-8">
        <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-8">
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-[#1C1810]/10 to-[#B5652B]/20 flex items-center justify-center">
            <span className="text-base lg:text-lg">📋</span>
          </div>
          <div>
            <h1 className="text-lg lg:text-2xl font-semibold text-[#1C1810] tracking-tight">History</h1>
            <p className="text-xs lg:text-sm text-[#8A8272]">All your past document extractions</p>
          </div>
        </div>

        {extractions.length === 0 && (
          <div className="bg-white rounded-xl lg:rounded-3xl elevated-shadow border border-[#F0EDE6] p-8 lg:p-16 text-center">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-3 lg:mb-4">
              <span className="text-2xl lg:text-3xl">📋</span>
            </div>
            <p className="text-[#1C1810] font-semibold text-sm lg:text-base mb-1">No extractions yet</p>
            <Link href="/" className="text-[#B5652B] hover:text-[#96501F] text-xs lg:text-sm font-medium hover:underline">Extract your first document →</Link>
          </div>
        )}

        <div className="space-y-2 lg:space-y-3">
          {extractions.map((e) => (
            <div key={e.id} className="bg-white rounded-xl lg:rounded-2xl elevated-shadow border border-[#F0EDE6] overflow-hidden">
              <button onClick={() => toggleRow(e.id)}
                className="w-full text-left px-4 lg:px-6 py-3 lg:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2 lg:gap-3 hover:bg-[#FAF9F6] transition-colors min-h-[52px] lg:min-h-0">
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-[#1C1810]/5 to-[#B5652B]/10 flex items-center justify-center shrink-0">
                    <span className="text-sm lg:text-lg">📄</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs lg:text-sm text-[#1C1810] truncate">{e.filename}</p>
                    <p className="text-[10px] lg:text-xs text-[#A39C8E] mt-0.5">{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-left lg:text-right shrink-0 ml-0 lg:ml-4 pl-10 lg:pl-0">
                  {e.result?.property?.street_address && <p className="text-xs lg:text-sm text-[#8A8272] truncate max-w-[200px] lg:max-w-[280px]">{e.result.property.street_address}</p>}
                  {e.result?.financial_terms?.purchase_price && <p className="text-xs lg:text-sm font-semibold text-[#1C1810] mt-0.5">${Number(e.result.financial_terms.purchase_price).toLocaleString()}</p>}
                </div>
              </button>
              {expanded.has(e.id) && (
                <div className="border-t border-[#F0EDE6] bg-[#FAF9F6] px-4 lg:px-6 py-3 lg:py-4 animate-fade-in">
                  <div className="flex items-center gap-1.5 lg:gap-2 mb-2 lg:mb-3">
                    <div className="w-1 h-3 lg:h-4 rounded-full bg-gradient-to-b from-[#1C1810] to-[#B5652B]" />
                    <span className="text-[10px] lg:text-xs font-semibold text-[#453D30] uppercase tracking-wider">Raw Data</span>
                  </div>
                  <pre className="text-[10px] lg:text-xs text-[#453D30] overflow-x-auto bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-[#F0EDE6] leading-relaxed">
                    {JSON.stringify(e.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
