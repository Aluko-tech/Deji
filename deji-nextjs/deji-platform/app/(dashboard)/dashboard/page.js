"use client";
import { useCurrency } from "@/lib/currencyContext";
import { useState, useEffect } from "react";
import {
  ShoppingCart, Users, TrendingUp, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Zap, RefreshCw, Clock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "";
const COLORS = ["#22c55e","#6366f1","#3b82f6","#f97316","#ec4899","#eab308"];
const AD_SOURCE_COLORS = {
  "Facebook Ads":"#1877f2", "TikTok Ads":"#ff0050",
  "Google Ads":"#4285f4", "Instagram":"#e1306c",
  "Website Form":"#6366f1", "Manual":"#6b7280",
};

function getToken() {
  if (typeof window==="undefined") return null;
  return localStorage.getItem("token");
}

function getUser() {
  if (typeof window==="undefined") return {};
  try { return JSON.parse(localStorage.getItem("user")||"{}"); } catch { return {}; }
}


export default function DashboardPage() {
  const [data,setData]       = useState(null);
  const { format, symbol } = useCurrency();
  const [loading,setLoading] = useState(true);
  const [lastRefresh,setLastRefresh] = useState(new Date());
  const user = getUser();

  useEffect(() => { fetchDashboard(); }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchDashboard(true), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${API}/api/dashboard`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
      setData(null);
      setLastRefresh(new Date());
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const d   = data || {};
  const fmt = (n) => {format(Number(n||0).toLocaleString())};
  const pct = (c,p) => p ? (((c-p)/p)*100).toFixed(1) : 0;

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr  = new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  const KPIs = [
    {
      label:"TODAY'S REVENUE", value:fmt(d.todayRevenue),
      change:pct(d.todayRevenue,d.yesterdayRevenue), sub:"vs yesterday", icon:"💰", color:"#22c55e",
    },
    {
      label:"NEW LEADS", value:d.newLeads||0,
      change:pct(d.newLeads,d.yesterdayLeads),
      sub:`${d.adLeads||0} from ads today`, icon:"👥", color:"#6366f1",
    },
    {
      label:"POS SALES", value:d.posSales||0,
      change:pct(d.posSales,d.yesterdayPOS), sub:"transactions today", icon:"🛒", color:"#f97316",
    },
    {
      label:"LOW STOCK", value:`${d.lowStockCount||0} items`,
      change:null, sub:"Needs restocking", icon:"📦", color:"#ef4444",
      warn:d.lowStockCount>0,
    },
  ];

  if (loading) return (
    <div className="space-y-5">
      <div className="skeleton h-8 w-48 rounded-xl"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl"/>)}
      </div>
      <div className="skeleton h-64 rounded-2xl"/>
    </div>
  );

  return (
    <div className="space-y-5 pb-20 lg:pb-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold"
            style={{fontFamily:"Syne,sans-serif", color:"var(--text-primary)"}}>
            {greeting},{" "}
            <span style={{color:"var(--primary)"}}>
              {user.tenantName || user.firstName || "Deji"}
            </span> 👋
          </h1>
          <p className="text-sm mt-0.5" style={{color:"var(--text-muted)"}}>{dateStr}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchDashboard()}
            className="btn-secondary flex items-center gap-1.5 text-xs">
            <RefreshCw size={13}/>
            <span className="hidden md:inline">
              {lastRefresh.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
            </span>
          </button>
          <Link href="/pos" className="btn-primary flex items-center gap-2">
            <ShoppingCart size={15}/> New Sale
          </Link>
        </div>
      </div>

      {/* Ad + duty status bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl flex items-center gap-3"
          style={{background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)"}}>
          <Zap size={16} style={{color:"#22c55e", flexShrink:0}}/>
          <div>
            <p className="text-sm font-bold" style={{color:"#22c55e"}}>
              {d.adLeads||0} leads from ads today
            </p>
            <p className="text-xs" style={{color:"var(--text-muted)"}}>
              Auto-captured from Facebook, TikTok, Google
            </p>
          </div>
        </div>
        <div className="p-3 rounded-2xl flex items-center gap-3"
          style={{background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.2)"}}>
          <Users size={16} style={{color:"#6366f1", flexShrink:0}}/>
          <div>
            <p className="text-sm font-bold" style={{color:"#6366f1"}}>
              {d.onDutyReps||0} reps on duty
            </p>
            <p className="text-xs" style={{color:"var(--text-muted)"}}>
              Auto-assigning incoming leads
            </p>
          </div>
        </div>
        <div className="p-3 rounded-2xl flex items-center gap-3 cursor-pointer"
          style={{
            background: (d.queuedLeads||0)>0 ? "rgba(234,179,8,0.08)" : "rgba(34,197,94,0.06)",
            border: `1px solid ${(d.queuedLeads||0)>0 ? "rgba(234,179,8,0.25)" : "rgba(34,197,94,0.2)"}`,
          }}>
          <Clock size={16} style={{color:(d.queuedLeads||0)>0?"#eab308":"#22c55e", flexShrink:0}}/>
          <div>
            <p className="text-sm font-bold"
              style={{color:(d.queuedLeads||0)>0?"#eab308":"#22c55e"}}>
              {d.queuedLeads||0} leads queued
            </p>
            <p className="text-xs" style={{color:"var(--text-muted)"}}>
              {(d.queuedLeads||0)>0 ? "No rep on duty when received" : "All leads assigned ✓"}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIs.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider"
                style={{color:"var(--text-muted)"}}>{k.label}</p>
              <span className="text-xl">{k.icon}</span>
            </div>
            <p className="text-2xl font-bold"
              style={{fontFamily:"Syne,sans-serif", color:"var(--text-primary)"}}>{k.value}</p>
            <div className="flex items-center gap-1.5 mt-2">
              {k.change !== null ? (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${Number(k.change)>=0?"text-green-400":"text-red-400"}`}>
                  {Number(k.change)>=0?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>}
                  {Math.abs(k.change)}%
                </span>
              ) : k.warn ? <AlertTriangle size={12} className="text-yellow-400"/> : null}
              <span className="text-[10px]" style={{color:"var(--text-muted)"}}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 deji-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>
                Revenue This Week
              </h2>
              <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>
                Total: {fmt(d.revenueChart?.reduce((s,r)=>s+r.revenue,0)||0)}
              </p>
            </div>
            <Link href="/erp/finance" className="text-xs font-semibold" style={{color:"var(--primary)"}}>
              Full report →
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.revenueChart}>
              <defs>
                <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{fill:"var(--text-muted)",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip
                formatter={(v) => fmt(v)}
                contentStyle={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"12px",color:"var(--text-primary)"}}/>
              <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} fill="url(#rv)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead sources pie */}
        <div className="deji-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>
              Lead Sources
            </h2>
            <Link href="/crm/leads?tab=ad" className="text-xs font-semibold flex items-center gap-1"
              style={{color:"#22c55e"}}>
              <Zap size={10}/> View all
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={d.leadSources} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                paddingAngle={3} dataKey="value">
                {d.leadSources?.map((s,i) => (
                  <Cell key={i} fill={AD_SOURCE_COLORS[s.name]||COLORS[i%COLORS.length]}/>
                ))}
              </Pie>
              <Tooltip contentStyle={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"12px"}}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {d.leadSources?.map((s,i) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full"
                    style={{background:AD_SOURCE_COLORS[s.name]||COLORS[i%COLORS.length]}}/>
                  <span className="text-xs" style={{color:"var(--text-muted)"}}>{s.name}</span>
                </div>
                <span className="text-xs font-bold" style={{color:"var(--text-primary)"}}>{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline + Activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pipeline by stage bar chart */}
        <div className="deji-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>
              Pipeline Stages
            </h2>
            <Link href="/crm/pipeline" className="text-xs font-semibold" style={{color:"var(--primary)"}}>
              Open →
            </Link>
          </div>
          <div className="space-y-2">
            {(d.pipelineByStage||[]).map((s,i) => (
              <div key={s.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{color:"var(--text-muted)"}}>{s.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{color:"var(--text-primary)"}}>{s.count}</span>
                    <span className="text-[10px]" style={{color:"var(--text-muted)"}}>
                      {fmt(s.value)}
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{background:"var(--bg-hover)"}}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width:`${Math.min(100,(s.count/((d.pipelineByStage?.[0]?.count)||1))*100)}%`,
                      background:COLORS[i%COLORS.length],
                    }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="deji-card p-5">
          <h2 className="font-bold mb-4" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>
            Live Activity
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-64">
            {(d.recentActivity||[]).map(a => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{
                    background: a.type==="lead" && a.source
                      ? (AD_SOURCE_COLORS[a.source+""]+"22" || "rgba(34,197,94,0.1)")
                      : "var(--primary-dim)",
                  }}>
                  {a.type==="sale"?"🛒":a.type==="lead"?"👤":a.type==="stock"?"📦":"💰"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{color:"var(--text-primary)"}}>{a.text}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {a.source && (
                      <span className="text-[9px] font-bold flex items-center gap-0.5"
                        style={{color:AD_SOURCE_COLORS[a.source]||"#22c55e"}}>
                        <Zap size={7}/>{a.source}
                      </span>
                    )}
                    <span className="text-[10px]" style={{color:"var(--text-muted)"}}>{a.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Reps + Quick Actions */}
        <div className="space-y-4">
          {/* Top reps */}
          <div className="deji-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>
                Top Reps
              </h2>
              <Link href="/settings/staff" className="text-xs" style={{color:"var(--primary)"}}>Manage →</Link>
            </div>
            <div className="space-y-3">
              {(d.topReps||[]).map((rep,i) => (
                <div key={rep.name} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{background:COLORS[i%COLORS.length]}}>
                    {rep.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{color:"var(--text-primary)"}}>{rep.name}</p>
                    <p className="text-[10px]" style={{color:"var(--text-muted)"}}>
                      {rep.leads} leads · {rep.won} won · {fmt(rep.revenue)}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{background:COLORS[i]+"22",color:COLORS[i]}}>
                    #{i+1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="deji-card p-5">
            <h2 className="font-bold text-sm mb-3" style={{fontFamily:"Syne,sans-serif",color:"var(--text-primary)"}}>
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href:"/pos",           label:"New Sale",    icon:"🛒" },
                { href:"/crm/leads",     label:"Add Lead",    icon:"👤" },
                { href:"/erp/inventory", label:"Inventory",   icon:"📦" },
                { href:"/erp/finance",   label:"Invoice",     icon:"🧾" },
                { href:"/forms",         label:"Ad Leads",    icon:"⚡" },
                { href:"/crm/pipeline",  label:"Pipeline",    icon:"📊" },
              ].map(a => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-2 p-2.5 rounded-xl transition-all text-xs"
                  style={{background:"var(--bg-hover)", border:"1px solid var(--border)", color:"var(--text-primary)"}}>
                  <span className="text-base">{a.icon}</span>{a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}