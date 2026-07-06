"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const COLORS = ["#1C1810", "#B5652B", "#D98A4D", "#5C3413", "#A39C8E", "#453D30"];

const STATUSES = [
  { key: "active", label: "Active", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { key: "under_contract", label: "Under Contract", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { key: "closed", label: "Closed", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { key: "archived", label: "Archived", color: "bg-gray-100 text-gray-500 border-gray-200" },
];

const STATUS_ICONS = {
  active: "📋",
  under_contract: "📝",
  closed: "✅",
  archived: "📦",
};

export default function DashboardPage() {
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pipelineStats, setPipelineStats] = useState({ active: 0, under_contract: 0, closed: 0, archived: 0, total: 0 });
  const [showManual, setShowManual] = useState(false);
  const { user, token, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push("/login"); return; }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/extractions`, { headers }).then((r) => r.json()),
      fetch(`${API}/pipeline/stats`, { headers }).then((r) => r.json()),
    ])
      .then(([extractionsData, stats]) => {
        setExtractions(extractionsData.map((e) => ({ ...e, result: JSON.parse(e.result_json) })));
        setPipelineStats(stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, authLoading, router]);

  const updateStatus = async (id, newStatus) => {
    try {
      await fetch(`${API}/extractions/${id}/status?status=${newStatus}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setExtractions((prev) => prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e)));
      setPipelineStats((prev) => ({
        ...prev,
        [prev.status]: Math.max(0, (prev[prev.status] || 0) - 1),
        [newStatus]: (prev[newStatus] || 0) + 1,
      }));
    } catch {}
  };

  const toggleFavorite = async (id, tags) => {
    const newTags = tags?.includes("favorite") ? tags.replace("favorite", "").replace(",,", ",").replace(/^,|,$/g, "") : (tags ? `${tags},favorite` : "favorite");
    try {
      await fetch(`${API}/extractions/${id}/tags?tags=${encodeURIComponent(newTags)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setExtractions((prev) => prev.map((e) => (e.id === id ? { ...e, tags: newTags } : e)));
    } catch {}
  };

  if (authLoading || loading) return (
    <div className="bg-[#FAF9F6] min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  );
  if (!token) return null;

  const monthlyData = {};
  const contingencyCounts = {};
  let totalValue = 0;

  extractions.forEach((e) => {
    const month = e.created_at?.slice(0, 7) || "unknown";
    monthlyData[month] = (monthlyData[month] || 0) + 1;
    if (e.result?.financial_terms?.purchase_price) totalValue += Number(e.result.financial_terms.purchase_price);
    (e.result?.contingencies || []).forEach((c) => contingencyCounts[c.type] = (contingencyCounts[c.type] || 0) + 1);
  });

  const monthlyChart = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
  const contingencyChart = Object.entries(contingencyCounts).map(([name, value]) => ({ name, value }));

  const dealsByStatus = {};
  STATUSES.forEach((s) => { dealsByStatus[s.key] = extractions.filter((e) => (e.status || "active") === s.key); });

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <nav className="bg-white/95 backdrop-blur-md border-b border-[#F0EDE6] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2.5 lg:py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-gradient-to-br from-[#1C1810] to-[#B5652B] flex items-center justify-center text-white font-bold text-xs lg:text-sm shadow-sm">D</div>
            <span className="font-bold text-[#1C1810] text-base lg:text-lg tracking-tight">DealSheet</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
            <Link href="/" className="text-xs lg:text-sm text-[#8A8272] hover:text-[#1C1810]">Extract</Link>
            <Link href="/dashboard" className="text-xs lg:text-sm font-semibold text-[#1C1810]">Dashboard</Link>
            <Link href="/history" className="text-xs lg:text-sm text-[#8A8272] hover:text-[#1C1810]">History</Link>
            <button onClick={() => { logout(); router.push("/login"); }}
              className="text-xs lg:text-sm text-[#A39C8E] hover:text-[#9B3A22] transition-colors font-medium whitespace-nowrap ml-1">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-[#1C1810]/10 to-[#B5652B]/20 flex items-center justify-center">
              <span className="text-base lg:text-lg">📊</span>
            </div>
            <div>
              <h1 className="text-lg lg:text-2xl font-semibold text-[#1C1810] tracking-tight">Pipeline</h1>
              <p className="text-xs lg:text-sm text-[#8A8272]">{pipelineStats.total} total deals</p>
            </div>
          </div>
          <button onClick={() => setShowManual(!showManual)}
            className="btn-accent text-white px-3 lg:px-5 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-semibold min-h-[36px] lg:min-h-[44px] whitespace-nowrap">
            + Add Deal
          </button>
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-4 lg:mb-6">
          {STATUSES.map((s) => (
            <div key={s.key} className={`stat-card rounded-xl lg:rounded-2xl p-3 lg:p-4 rich-shadow border-l-4 ${s.key === "active" ? "border-l-blue-500" : s.key === "under_contract" ? "border-l-amber-500" : s.key === "closed" ? "border-l-emerald-500" : "border-l-gray-400"}`}>
              <p className="text-[10px] lg:text-xs text-[#A39C8E] uppercase tracking-wider font-semibold">{s.label}</p>
              <p className="text-xl lg:text-3xl font-bold text-[#1C1810] mt-1">{pipelineStats[s.key] || 0}</p>
            </div>
          ))}
        </div>

        {/* Manual Deal Form */}
        {showManual && (
          <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 rich-shadow border border-[#F0EDE6] mb-4 lg:mb-6 animate-fade-in">
            <h3 className="text-sm font-semibold text-[#1C1810] mb-3">Add Deal Manually</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <input id="manual-address" className="border-2 border-[#E8E4DC] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#B5652B] text-[#1C1810]" placeholder="Property address" />
              <input id="manual-price" className="border-2 border-[#E8E4DC] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#B5652B] text-[#1C1810]" placeholder="Purchase price" type="number" />
              <select id="manual-status" className="border-2 border-[#E8E4DC] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#B5652B] text-[#1C1810] bg-white">
                <option value="active">Active</option>
                <option value="under_contract">Under Contract</option>
                <option value="closed">Closed</option>
              </select>
              <button onClick={async () => {
                const addr = document.getElementById("manual-address").value;
                const price = document.getElementById("manual-price").value;
                const status = document.getElementById("manual-status").value;
                if (!addr) return;
                await fetch(`${API}/pipeline/manual-deal`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    filename: addr,
                    status,
                    result: { property: { street_address: addr }, financial_terms: { purchase_price: price || null } },
                  }),
                });
                setShowManual(false);
                window.location.reload();
              }} className="btn-accent text-white rounded-xl text-sm font-semibold min-h-[44px] px-4">
                Save Deal
              </button>
            </div>
          </div>
        )}

        {/* Pipeline Kanban */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {STATUSES.map((column) => (
            <div key={column.key} className="bg-white/60 rounded-xl lg:rounded-2xl p-3 lg:p-4 border border-[#F0EDE6] min-h-[200px]">
              <div className="flex items-center gap-2 mb-3">
                <span>{STATUS_ICONS[column.key]}</span>
                <h3 className="text-xs font-semibold text-[#453D30] uppercase tracking-wider">{column.label}</h3>
                <span className="text-xs text-[#A39C8E] ml-auto">{(dealsByStatus[column.key] || []).length}</span>
              </div>
              <div className="space-y-2">
                {(dealsByStatus[column.key] || []).slice(0, 8).map((deal) => (
                  <div key={deal.id}
                    className="bg-white rounded-xl p-3 border border-[#F0EDE6] shadow-sm hover:shadow-md transition-shadow cursor-pointer text-xs group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-[#1C1810] truncate text-xs flex-1">{deal.filename}</p>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(deal.id, deal.tags); }}
                        className="text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {deal.tags?.includes("favorite") ? "⭐" : "☆"}
                      </button>
                    </div>
                    {deal.result?.property?.street_address && (
                      <p className="text-[10px] text-[#A39C8E] truncate mt-0.5">{deal.result.property.street_address}</p>
                    )}
                    {deal.result?.financial_terms?.purchase_price && (
                      <p className="text-xs font-semibold text-[#1C1810] mt-1">${Number(deal.result.financial_terms.purchase_price).toLocaleString()}</p>
                    )}
                    <div className="flex gap-1 mt-2">
                      {STATUSES.filter((s) => s.key !== (deal.status || "active")).slice(0, 2).map((s) => (
                        <button key={s.key} onClick={(e) => { e.stopPropagation(); updateStatus(deal.id, s.key); }}
                          className="text-[10px] px-1.5 py-0.5 rounded-md border hover:bg-[#FAF9F6] transition-colors text-[#A39C8E] border-[#E8E4DC]">
                          → {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {(!dealsByStatus[column.key] || dealsByStatus[column.key].length === 0) && (
                  <p className="text-[10px] text-[#A39C8E] text-center py-6">No deals</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 mb-4 lg:mb-8">
          <div className="section-card bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 rich-shadow border border-[#F0EDE6]">
            <h2 className="text-[10px] lg:text-xs font-semibold text-[#453D30] mb-3 lg:mb-4 uppercase tracking-wider">Extractions Over Time</h2>
            {monthlyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyChart}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8A8272" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8A8272" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #F0EDE6", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#B5652B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-[#A39C8E] text-xs lg:text-sm text-center py-8 lg:py-16">No data yet</p>}
          </div>
          <div className="section-card bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 rich-shadow border border-[#F0EDE6]">
            <h2 className="text-[10px] lg:text-xs font-semibold text-[#453D30] mb-3 lg:mb-4 uppercase tracking-wider">Contingency Types</h2>
            {contingencyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={contingencyChart} cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {contingencyChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #F0EDE6" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-[#A39C8E] text-xs lg:text-sm text-center py-8 lg:py-16">No data yet</p>}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="section-card bg-white rounded-xl lg:rounded-2xl rich-shadow border border-[#F0EDE6] overflow-hidden">
          <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-[#F0EDE6] flex items-center justify-between">
            <div className="flex items-center gap-1.5 lg:gap-2">
              <span className="text-xs lg:text-sm">📋</span>
              <h2 className="text-[10px] lg:text-xs font-semibold text-[#453D30] uppercase tracking-wider">Recent Activity</h2>
            </div>
            <Link href="/history" className="text-[10px] text-[#B5652B] hover:underline font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-[#F0EDE6]">
            {extractions.slice(0, 5).map((e) => (
              <div key={e.id} className="px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between text-xs lg:text-sm hover:bg-[#FAF9F6] transition-colors">
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                  <span className="text-sm">{e.tags?.includes("favorite") ? "⭐" : "📄"}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-[#1C1810] truncate">{e.filename}</p>
                    <p className="text-[10px] lg:text-xs text-[#A39C8E]">{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {STATUSES.map((s) => s.key === (e.status || "active") && (
                    <span key={s.key} className={`text-[10px] px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
