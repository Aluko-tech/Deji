"use client";
import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import api from "@/lib/api";

const COLORS = ["#22c55e","#6366f1","#f97316","#eab308","#3b82f6","#8b5cf6","#ef4444","#14b8a6"];

function safeArray(val) {
  if (Array.isArray(val))           return val;
  if (Array.isArray(val?.data))     return val.data;
  if (Array.isArray(val?.invoices)) return val.invoices;
  if (Array.isArray(val?.products)) return val.products;
  if (Array.isArray(val?.entries))  return val.entries;
  if (Array.isArray(val?.leads))    return val.leads;
  if (Array.isArray(val?.contacts)) return val.contacts;
  if (Array.isArray(val?.staff))    return val.staff;
  if (Array.isArray(val?.results))  return val.results;
  return [];
}

function invTotal(inv) {
  const sub = (inv.items || []).reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0
  );
  const disc = inv.discount
    ? inv.discountType === "percent"
      ? sub * (Number(inv.discount) / 100)
      : Number(inv.discount)
    : 0;
  return Math.max(0, sub - disc);
}

function bucketByPeriod(invoices, period) {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const buckets = {};
  invoices.forEach(inv => {
    const d = new Date(inv.createdAt || inv.date);
    const key = period === "daily"
      ? DAYS[d.getDay()]
      : period === "weekly"
      ? `Week ${Math.ceil(d.getDate() / 7)}`
      : MONTHS[d.getMonth()];
    if (!buckets[key]) buckets[key] = { date: key, revenue: 0, invoices: 0 };
    if (inv.status === "paid") buckets[key].revenue += invTotal(inv);
    buckets[key].invoices++;
  });
  const ORDER = period === "daily"
    ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    : period === "weekly"
    ? ["Week 1","Week 2","Week 3","Week 4","Week 5"]
    : MONTHS;
  return ORDER.filter(k => buckets[k]).map(k => buckets[k]);
}

const Tip = ({ active, payload, label }) =>
  active && payload?.length ? (
    <div className="px-3 py-2 rounded-xl shadow-xl text-sm"
      style={{ background:"var(--bg-card)", border:"1px solid var(--border)" }}>
      <p className="font-bold mb-1" style={{ color:"var(--text-primary)" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "var(--primary)" }}>
          {p.name}: {typeof p.value === "number" && p.value > 999 ? "₦" + p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  ) : null;

const SECTIONS = [
  { key:"overview",  label:"📈 Revenue"    },
  { key:"reps",      label:"👔 Sales Reps" },
  { key:"marketers", label:"📢 Campaigns"  },
  { key:"products",  label:"📦 Products"   },
  { key:"funnel",    label:"🔽 Funnel"     },
];

function EmptyState({ icon, title, desc }) {
  return (
    <div className="deji-card p-12 text-center">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="font-bold mb-1" style={{ color:"var(--text-primary)" }}>{title}</p>
      <p className="text-sm max-w-xs mx-auto" style={{ color:"var(--text-muted)" }}>{desc}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [period,  setPeriod]  = useState("weekly");
  const [section, setSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [leads,    setLeads]    = useState([]);
  const [products, setProducts] = useState([]);
  const [staff,    setStaff]    = useState([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [ir, lr, pr, sr] = await Promise.allSettled([
      api.get("/invoices?limit=500"),
      api.get("/crm/leads?limit=500"),
      api.get("/products?limit=500"),
      api.get("/auth/staff"),
    ]);
    setInvoices(ir.status === "fulfilled" ? safeArray(ir.value?.data) : []);
    setLeads   (lr.status === "fulfilled" ? safeArray(lr.value?.data) : []);
    setProducts(pr.status === "fulfilled" ? safeArray(pr.value?.data) : []);
    setStaff   (sr.status === "fulfilled" ? safeArray(sr.value?.data) : []);
    setLoading(false);
  };

  // ── Revenue ────────────────────────────────────────────────────────────────
  const revenueData   = bucketByPeriod(invoices, period);
  const totalRevenue  = invoices.filter(i => i.status === "paid").reduce((s, i) => s + invTotal(i), 0);
  const totalInvoices = invoices.length;

  // ── Leads / Funnel ─────────────────────────────────────────────────────────
  const stageMap = {};
  leads.forEach(l => {
    const s = (l.stage || l.status || "new").toLowerCase();
    stageMap[s] = (stageMap[s] || 0) + 1;
  });
  const STAGE_ORDER = ["new","contacted","qualified","negotiation","won","lost"];
  const funnelData = Object.entries(stageMap)
    .sort((a, b) => {
      const ai = STAGE_ORDER.indexOf(a[0]); const bi = STAGE_ORDER.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([s, v]) => ({ stage: s.charAt(0).toUpperCase() + s.slice(1), value: v }));

  const wonLeads   = leads.filter(l => l.status === "won" || l.stage === "won").length;
  const totalLeads = leads.length;
  const funnelConv = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // ── Channel mix ────────────────────────────────────────────────────────────
  const chanMap = {};
  leads.forEach(l => { const ch = l.source || l.channel || "Direct"; chanMap[ch] = (chanMap[ch] || 0) + 1; });
  const channelMix = Object.entries(chanMap).map(([name, value]) => ({ name, value }));

  // ── Top products ───────────────────────────────────────────────────────────
  const prodMap = {};
  invoices.forEach(inv => {
    (inv.items || []).forEach(it => {
      const k = it.description || it.name || "Unknown";
      if (!prodMap[k]) prodMap[k] = { name: k, sold: 0, revenue: 0 };
      prodMap[k].sold    += Number(it.quantity) || 0;
      prodMap[k].revenue += (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    });
  });
  const topProducts = Object.values(prodMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map(p => {
      const found = products.find(pr => pr.name === p.name);
      return { ...p, stock: found?.stock ?? "—", category: found?.category || "—" };
    });

  // ── Sales reps ─────────────────────────────────────────────────────────────
  const repsData = staff
    .map(s => {
      const name    = `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email;
      const myLeads = leads.filter(l => l.assignedTo === s.id || l.ownerId === s.id);
      const won     = myLeads.filter(l => l.status === "won" || l.stage === "won").length;
      const lost    = myLeads.filter(l => l.status === "lost" || l.stage === "lost").length;
      const revenue = invoices
        .filter(inv => (inv.assignedTo === s.id || inv.ownerId === s.id) && inv.status === "paid")
        .reduce((sum, inv) => sum + invTotal(inv), 0);
      return { name, assigned: myLeads.length, won, lost, revenue };
    })
    .filter(r => r.assigned > 0);

  // ── Marketers ──────────────────────────────────────────────────────────────
  const marketersData = staff
    .filter(s => s.role?.toLowerCase() === "marketer")
    .map(s => {
      const name     = `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email;
      const myLeads  = leads.filter(l => l.marketerId === s.id || l.assignedTo === s.id);
      const won      = myLeads.filter(l => l.status === "won" || l.stage === "won").length;
      const convRate = myLeads.length ? Math.round((won / myLeads.length) * 1000) / 10 : 0;
      return { name, channel: s.channel || "Direct", leads: myLeads.length, won, convRate };
    })
    .filter(m => m.leads > 0);

  return (
    <div className="space-y-5 pb-20 lg:pb-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            {loading ? "Loading..." : `${totalInvoices} invoices · ${totalLeads} leads`}
          </p>
        </div>
        <div className="flex gap-2">
          {["daily","weekly","monthly"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-all"
              style={{
                background:  period === p ? "var(--primary)" : "transparent",
                color:       period === p ? "#fff" : "var(--text-muted)",
                borderColor: period === p ? "var(--primary)" : "var(--border)",
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Revenue Collected", value:`₦${totalRevenue.toLocaleString()}`, icon:"💰" },
          { label:"Total Invoices",    value: totalInvoices,                       icon:"🧾" },
          { label:"Total Leads",       value: totalLeads,                          icon:"🎯" },
          { label:"Funnel Conversion", value:`${funnelConv}%`,                     icon:"🏆" },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-2xl mb-1">{k.icon}</div>
            <p className="text-xl font-bold"
              style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
              {loading ? "—" : k.value}
            </p>
            <p className="text-xs" style={{ color:"var(--text-muted)" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap"
            style={{
              background:  section === s.key ? "var(--primary)" : "transparent",
              color:       section === s.key ? "#fff" : "var(--text-muted)",
              borderColor: section === s.key ? "var(--primary)" : "var(--border)",
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="deji-card p-12 text-center">
          <div className="text-4xl mb-3 animate-pulse">📊</div>
          <p style={{ color:"var(--text-muted)" }}>Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {section === "overview" && (
            <div className="space-y-4">
              {revenueData.length === 0 ? (
                <EmptyState icon="📈" title="No revenue data yet"
                  desc="Create and mark invoices as paid to see revenue trends here."/>
              ) : (
                <div className="deji-card p-5">
                  <h3 className="font-bold mb-4"
                    style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
                    Revenue ({period})
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                      <XAxis dataKey="date" tick={{ fill:"var(--text-muted)", fontSize:11 }} axisLine={false} tickLine={false}/>
                      <YAxis hide/>
                      <Tooltip content={<Tip/>}/>
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2.5} fill="url(#rv)"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {revenueData.length > 0 && (
                  <div className="deji-card p-5">
                    <h3 className="font-bold mb-4"
                      style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
                      Invoice Volume
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                        <XAxis dataKey="date" tick={{ fill:"var(--text-muted)", fontSize:11 }} axisLine={false} tickLine={false}/>
                        <YAxis hide/>
                        <Tooltip content={<Tip/>}/>
                        <Bar dataKey="invoices" name="Invoices" fill="#6366f1" radius={[6,6,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {channelMix.length > 0 && (
                  <div className="deji-card p-5">
                    <h3 className="font-bold mb-4"
                      style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
                      Lead Source Mix
                    </h3>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={channelMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
                          {channelMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                        </Pie>
                        <Tooltip/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {channelMix.map((x, i) => (
                        <div key={x.name} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }}/>
                          <span className="text-xs truncate" style={{ color:"var(--text-muted)" }}>{x.name}</span>
                          <span className="text-xs font-bold ml-auto" style={{ color:"var(--text-primary)" }}>{x.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {revenueData.length === 0 && channelMix.length === 0 && null}
              </div>
            </div>
          )}

          {/* ── SALES REPS ── */}
          {section === "reps" && (
            repsData.length === 0 ? (
              <EmptyState icon="👔" title="No rep data yet"
                desc="Assign leads to staff members to track individual sales performance here."/>
            ) : (
              <div className="space-y-3">
                <div className="deji-card p-5">
                  <h3 className="font-bold mb-4"
                    style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
                    Revenue by Rep
                  </h3>
                  <ResponsiveContainer width="100%" height={Math.max(180, repsData.length * 52)}>
                    <BarChart data={repsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                      <XAxis type="number" hide/>
                      <YAxis type="category" dataKey="name"
                        tick={{ fill:"var(--text-muted)", fontSize:11 }}
                        axisLine={false} tickLine={false} width={120}/>
                      <Tooltip content={<Tip/>}/>
                      <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[0,6,6,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="deji-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="deji-table w-full">
                      <thead>
                        <tr><th>Rep</th><th>Assigned</th><th>Won</th><th>Lost</th><th>Conv %</th><th>Revenue</th></tr>
                      </thead>
                      <tbody>
                        {repsData.map((rep, i) => {
                          const conv = rep.assigned ? Math.round((rep.won / rep.assigned) * 100) : 0;
                          return (
                            <tr key={i}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                    style={{ background: COLORS[i % COLORS.length] }}>
                                    {rep.name[0]}
                                  </div>
                                  <span className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{rep.name}</span>
                                </div>
                              </td>
                              <td>{rep.assigned}</td>
                              <td><span className="text-green-400 font-bold">{rep.won}</span></td>
                              <td><span className="text-red-400">{rep.lost}</span></td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full min-w-12" style={{ background:"var(--border)" }}>
                                    <div className="h-full rounded-full"
                                      style={{ width:`${Math.min(conv,100)}%`, background:"var(--primary)" }}/>
                                  </div>
                                  <span className="text-xs font-bold" style={{ color:"var(--primary)" }}>{conv}%</span>
                                </div>
                              </td>
                              <td><span className="text-green-400 font-bold">₦{(rep.revenue||0).toLocaleString()}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ── MARKETERS ── */}
          {section === "marketers" && (
            marketersData.length === 0 ? (
              <EmptyState icon="📢" title="No campaign data yet"
                desc="Invite staff with the Marketer role and assign leads to track campaign attribution."/>
            ) : (
              <div className="deji-card overflow-hidden">
                <div className="p-4" style={{ borderBottom:"1px solid var(--border)" }}>
                  <h3 className="font-bold"
                    style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
                    Campaign Attribution
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="deji-table w-full">
                    <thead>
                      <tr><th>Marketer</th><th>Channel</th><th>Leads</th><th>Won</th><th>Conv %</th></tr>
                    </thead>
                    <tbody>
                      {marketersData.map((m, i) => (
                        <tr key={i}>
                          <td><span className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{m.name}</span></td>
                          <td><span className="badge badge-blue text-[10px]">{m.channel}</span></td>
                          <td>{m.leads}</td>
                          <td><span className="text-green-400 font-bold">{m.won}</span></td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full min-w-12" style={{ background:"var(--border)" }}>
                                <div className="h-full rounded-full"
                                  style={{ width:`${Math.min(m.convRate,100)}%`, background:"var(--primary)" }}/>
                              </div>
                              <span className="text-xs font-bold" style={{ color:"var(--primary)" }}>{m.convRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ── PRODUCTS ── */}
          {section === "products" && (
            topProducts.length === 0 ? (
              <EmptyState icon="📦" title="No product data yet"
                desc="Create invoices with line items to see product performance here."/>
            ) : (
              <div className="deji-card overflow-hidden">
                <div className="p-4" style={{ borderBottom:"1px solid var(--border)" }}>
                  <h3 className="font-bold"
                    style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
                    Product Performance
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="deji-table w-full">
                    <thead>
                      <tr><th>Product</th><th>Category</th><th>Units Sold</th><th>Revenue</th><th>Stock</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p, i) => (
                        <tr key={i}>
                          <td><span className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{p.name}</span></td>
                          <td><span className="badge badge-blue text-[10px]">{p.category}</span></td>
                          <td><span className="font-bold" style={{ color:"var(--text-primary)" }}>{p.sold}</span></td>
                          <td><span className="text-green-400 font-bold">₦{(p.revenue||0).toLocaleString()}</span></td>
                          <td>
                            <span style={{
                              color: p.stock === 0 ? "#f87171" : p.stock < 10 ? "#fb923c" : "var(--text-primary)",
                              fontWeight:"bold",
                            }}>{p.stock}</span>
                          </td>
                          <td>
                            <span className={`badge text-[10px] ${
                              p.stock === 0 ? "badge-red" : p.stock < 10 ? "badge-orange" : p.sold > 50 ? "badge-green" : "badge-blue"
                            }`}>
                              {p.stock === 0 ? "Out of Stock" : p.stock < 10 ? "Low Stock" : p.sold > 50 ? "Best Seller" : "Normal"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ── FUNNEL ── */}
          {section === "funnel" && (
            funnelData.length === 0 ? (
              <EmptyState icon="🔽" title="No funnel data yet"
                desc="Add leads and move them through stages to see your conversion funnel."/>
            ) : (
              <div className="deji-card p-5 max-w-2xl">
                <h3 className="font-bold mb-6"
                  style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
                  Conversion Funnel
                </h3>
                <div className="space-y-3">
                  {funnelData.map((stage, i, arr) => {
                    const pct  = arr[0]?.value ? Math.round((stage.value / arr[0].value) * 100) : 0;
                    const drop = i > 0 && arr[i-1]?.value
                      ? Math.round(((arr[i-1].value - stage.value) / arr[i-1].value) * 100) : 0;
                    return (
                      <div key={stage.stage}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{stage.stage}</span>
                          <div className="flex items-center gap-3">
                            {i > 0 && <span className="text-[10px] text-red-400 font-semibold">-{drop}% drop-off</span>}
                            <span className="text-sm font-bold" style={{ color:"var(--primary)" }}>{stage.value} leads</span>
                          </div>
                        </div>
                        <div className="h-8 rounded-xl overflow-hidden" style={{ background:"var(--bg-hover)" }}>
                          <div className="h-full rounded-xl flex items-center pl-3 transition-all duration-500"
                            style={{ width:`${Math.max(pct, 4)}%`, background:"var(--primary-dim)" }}>
                            <span className="text-xs font-bold" style={{ color:"var(--primary)" }}>{pct}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-6 pt-4" style={{ borderTop:"1px solid var(--border)" }}>
                  {[
                    { label:"Total Leads", value: funnelData[0]?.value || 0 },
                    { label:"Won",         value: wonLeads                  },
                    { label:"Conversion",  value: `${funnelConv}%`          },
                  ].map(k => (
                    <div key={k.label} className="p-3 rounded-xl text-center" style={{ background:"var(--bg-hover)" }}>
                      <p className="text-xl font-bold"
                        style={{ fontFamily:"Playfair Display,serif", color:"var(--primary)" }}>{k.value}</p>
                      <p className="text-xs" style={{ color:"var(--text-muted)" }}>{k.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}