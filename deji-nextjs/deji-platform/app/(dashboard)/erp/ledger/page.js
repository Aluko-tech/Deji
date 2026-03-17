"use client";
import { useCurrency } from "@/lib/currencyContext";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, TrendingUp, TrendingDown, DollarSign, Download, RefreshCw,
  Plus, X, FileText, BarChart2, BookOpen, Scale, AlertTriangle,
  ChevronDown, ChevronUp, Wallet, Clock, CheckCircle,
} from "lucide-react";
import { toDay, inRange, fmtDate } from "@/lib/dateUtils";
import { getLedgerEntries } from "@/lib/api";
import api from "@/lib/api";

// ── Nigerian Chart of Accounts (NASB-aligned) ─────────────────────────────────
const COA = {
  INCOME: [
    { code:"4001", name:"Sales Revenue",         category:"Sales"     },
    { code:"4002", name:"Service Revenue",        category:"Sales"     },
    { code:"4003", name:"POS Revenue",            category:"POS"       },
    { code:"4004", name:"Website / Online Sales", category:"Website"   },
    { code:"4005", name:"Commission Income",      category:"Sales"     },
    { code:"4006", name:"Rental Income",          category:"Other"     },
    { code:"4007", name:"FX Gain",                category:"FX"        },
    { code:"4099", name:"Other Income",           category:"Other"     },
  ],
  EXPENSE: [
    { code:"5001", name:"Cost of Goods Sold",     category:"Inventory" },
    { code:"5002", name:"Staff Salaries",         category:"Payroll"   },
    { code:"5003", name:"PAYE / Staff Tax",       category:"Tax"       },
    { code:"5004", name:"Office Rent",            category:"Rent"      },
    { code:"5005", name:"Generator / Diesel",     category:"Utilities" },
    { code:"5006", name:"NEPA / Electricity",     category:"Utilities" },
    { code:"5007", name:"Internet / Data",        category:"Utilities" },
    { code:"5008", name:"Marketing & Adverts",    category:"Marketing" },
    { code:"5009", name:"Logistics / Delivery",   category:"Logistics" },
    { code:"5010", name:"Bank Charges",           category:"Operations"},
    { code:"5011", name:"VAT Payable (7.5%)",     category:"Tax"       },
    { code:"5012", name:"Withholding Tax (WHT)",  category:"Tax"       },
    { code:"5013", name:"Refunds & Returns",      category:"Other"     },
    { code:"5014", name:"FX Loss",                category:"FX"        },
    { code:"5099", name:"Other Expenses",         category:"Operations"},
  ],
};
const ALL_ACCOUNTS = [...COA.INCOME, ...COA.EXPENSE];
const CATEGORIES   = ["all","Sales","POS","Website","Inventory","Operations","Payroll","Marketing","Logistics","Utilities","Rent","Tax","FX","Other"];
const PAY_METHODS  = ["Cash","Bank Transfer","Paystack","Flutterwave","Opay","PalmPay","POS","Cheque","Other"];
const WHT_RATES    = { "Rent":10, "Consultancy":10, "Construction":5, "Commission":10, "Services":5, "Dividends":10, "Interest":10, "Royalties":15 };

const EMPTY = {
  type:"EXPENSE", amount:"", description:"", category:"Operations",
  accountCode:"5099", reference:"", date:new Date().toISOString().split("T")[0],
  notes:"", paymentMethod:"Bank Transfer", currency:"NGN", fxRate:"",
  includeVAT:false, vatRate:7.5, includeWHT:false, whtRate:5,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeNum(v) { return parseFloat(v)||0; }

function safeArray(val) {
  if (Array.isArray(val))          return val;
  if (Array.isArray(val?.data))    return val.data;
  if (Array.isArray(val?.entries)) return val.entries;
  if (Array.isArray(val?.results)) return val.results;
  return [];
}

// Get date from entry — handle both new `date` field and legacy `createdAt`
function entryDate(e) { return e.date || e.createdAt; }

function getMonthRange(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to   = new Date(d.getFullYear(), d.getMonth()+1, 0);
  return { from:from.toISOString().split("T")[0], to:to.toISOString().split("T")[0], label:from.toLocaleString("en-NG",{month:"long",year:"numeric"}) };
}

function agingBucket(dateStr) {
  const days = Math.floor((Date.now()-new Date(dateStr))/86400000);
  if (days<=30) return "0-30";
  if (days<=60) return "31-60";
  if (days<=90) return "61-90";
  return "90+";
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LedgerPage() {
  const { format } = useCurrency();

  const [entries,    setEntries]    = useState([]);
  const [invoices,   setInvoices]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("journal");
  const [search,     setSearch]     = useState("");
  const [fType,      setFType]      = useState("all");
  const [fCat,       setFCat]       = useState("all");
  const [fMethod,    setFMethod]    = useState("all");
  const [dateFrom,   setDateFrom]   = useState(getMonthRange().from);
  const [dateTo,     setDateTo]     = useState(getMonthRange().to);
  const [period,     setPeriod]     = useState("this_month");
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [expanded,   setExpanded]   = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [le, ir] = await Promise.allSettled([
        getLedgerEntries({ limit: 1000 }),
        api.get("/invoices?limit=500"),
      ]);
      setEntries(le.status==="fulfilled" ? safeArray(le.value?.data??le.value) : []);
      setInvoices(ir.status==="fulfilled" ? safeArray(ir.value?.data??ir.value) : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const setPeriodRange = (p) => {
    setPeriod(p);
    const y = new Date().getFullYear();
    const r = {
      this_month: getMonthRange(0),
      last_month: getMonthRange(-1),
      q1: { from:`${y}-01-01`, to:`${y}-03-31` },
      q2: { from:`${y}-04-01`, to:`${y}-06-30` },
      q3: { from:`${y}-07-01`, to:`${y}-09-30` },
      q4: { from:`${y}-10-01`, to:`${y}-12-31` },
      this_year:  { from:`${y}-01-01`, to:`${y}-12-31` },
      all:        { from:"", to:"" },
    }[p];
    if (r) { setDateFrom(r.from||""); setDateTo(r.to||""); }
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const safe = Array.isArray(entries) ? entries : [];

  const filtered = useMemo(() => safe.filter(e => {
    if (fType!=="all" && e.type?.toUpperCase()!==fType)             return false;
    if (fCat!=="all"  && e.category!==fCat)                         return false;
    if (fMethod!=="all" && (e.paymentMethod||e.method)!==fMethod)   return false;
    if (!inRange(entryDate(e), dateFrom, dateTo))                   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.description?.toLowerCase().includes(q) && !e.reference?.toLowerCase().includes(q) && !e.category?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [safe, fType, fCat, fMethod, dateFrom, dateTo, search]);

  const totalInc  = useMemo(() => filtered.filter(e=>e.type?.toUpperCase()==="INCOME").reduce((s,e)=>s+safeNum(e.amount),0), [filtered]);
  const totalExp  = useMemo(() => filtered.filter(e=>e.type?.toUpperCase()==="EXPENSE").reduce((s,e)=>s+safeNum(e.amount),0), [filtered]);
  const net       = totalInc - totalExp;
  const allInc    = safe.filter(e=>e.type?.toUpperCase()==="INCOME").reduce((s,e)=>s+safeNum(e.amount),0);
  const allExp    = safe.filter(e=>e.type?.toUpperCase()==="EXPENSE").reduce((s,e)=>s+safeNum(e.amount),0);
  const implVAT   = totalInc * 0.075;
  const totalWHT  = filtered.filter(e=>e.category==="Tax"&&e.description?.toLowerCase().includes("wht")).reduce((s,e)=>s+safeNum(e.amount),0);

  const incByCat  = useMemo(() => {
    const m={};
    filtered.filter(e=>e.type?.toUpperCase()==="INCOME").forEach(e=>{ m[e.category||"Other"]=(m[e.category||"Other"]||0)+safeNum(e.amount); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [filtered]);

  const expByCat  = useMemo(() => {
    const m={};
    filtered.filter(e=>e.type?.toUpperCase()==="EXPENSE").forEach(e=>{ m[e.category||"Other"]=(m[e.category||"Other"]||0)+safeNum(e.amount); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [filtered]);

  const trialBal  = useMemo(() => {
    const b={};
    safe.forEach(e=>{
      const k = e.accountCode||(e.type?.toUpperCase()==="INCOME"?"4099":"5099");
      if (!b[k]) b[k]={debit:0,credit:0};
      if (e.type?.toUpperCase()==="INCOME") b[k].credit+=safeNum(e.amount);
      else                                  b[k].debit +=safeNum(e.amount);
    });
    return ALL_ACCOUNTS.map(a=>({
      ...a,
      debit:  b[a.code]?.debit  ||0,
      credit: b[a.code]?.credit ||0,
      balance: a.code.startsWith("4") ? (b[a.code]?.credit||0)-(b[a.code]?.debit||0) : (b[a.code]?.debit||0)-(b[a.code]?.credit||0),
    })).filter(a=>a.debit>0||a.credit>0);
  }, [safe]);

  const debtors   = useMemo(() => {
    const unpaid = invoices.filter(inv=>["sent","PENDING","overdue","partial","PARTIALLY_PAID"].includes(inv.status));
    const bkts   = {"0-30":0,"31-60":0,"61-90":0,"90+":0};
    const list   = [];
    unpaid.forEach(inv=>{
      const items = inv.items||inv.lineItems||[];
      const amt   = Number(inv.total)||items.reduce((s,i)=>s+(i.quantity||1)*(i.unitPrice||0),0);
      const bkt   = agingBucket(inv.dueDate||inv.createdAt);
      bkts[bkt]  += amt;
      list.push({ name:inv.contactName||"Unknown", inv:inv.invoiceNumber||inv.id?.slice(-6), amt, bkt, date:inv.dueDate||inv.createdAt });
    });
    return { bkts, list, total:Object.values(bkts).reduce((s,v)=>s+v,0) };
  }, [invoices]);

  // ── Save entry ─────────────────────────────────────────────────────────────
  const saveEntry = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const amt = Number(form.amount);
      const post = (data) => api.post("/ledger", data);

      // Main entry
      await post({
        type:form.type, amount:amt, description:form.description.trim(),
        category:form.category, reference:form.reference||`${form.type==="INCOME"?"INC":"EXP"}-${Date.now().toString().slice(-6)}`,
        date:new Date(form.date).toISOString(), accountCode:form.accountCode,
        paymentMethod:form.paymentMethod, currency:form.currency,
        fxRate:form.fxRate?Number(form.fxRate):null, notes:form.notes||null,
      });

      // Auto-VAT entry
      if (form.includeVAT && form.type==="INCOME") {
        await post({ type:"EXPENSE", amount:amt*(form.vatRate/100), description:`VAT 7.5% — ${form.description.slice(0,40)}`, category:"Tax", accountCode:"5011", date:new Date(form.date).toISOString(), paymentMethod:form.paymentMethod, reference:`VAT-${Date.now().toString().slice(-6)}`, currency:"NGN" });
      }

      // Auto-WHT entry
      if (form.includeWHT) {
        await post({ type:"EXPENSE", amount:amt*(form.whtRate/100), description:`WHT ${form.whtRate}% — ${form.description.slice(0,40)}`, category:"Tax", accountCode:"5012", date:new Date(form.date).toISOString(), paymentMethod:form.paymentMethod, reference:`WHT-${Date.now().toString().slice(-6)}`, currency:"NGN" });
      }

      await fetchAll(); setShowModal(false); setForm(EMPTY);
    } catch(err) { alert(err.response?.data?.message||err.message); }
    finally { setSaving(false); }
  };

  const deleteEntry = async (id) => {
    if (!confirm("Delete this ledger entry?")) return;
    try { await api.delete(`/ledger/${id}`); fetchAll(); } catch(e) { alert(e.message); }
  };

  // ── Export FIRS CSV ────────────────────────────────────────────────────────
  const exportFIRS = () => {
    const y = new Date().getFullYear();
    const rows = [
      `FIRS Financial Summary — ${y}`,`Generated: ${new Date().toLocaleDateString("en-NG")}`,``,
      `INCOME STATEMENT`,`Description,Category,Account Code,Amount (₦),Date,Reference,Payment Method`,
      ...filtered.filter(e=>e.type?.toUpperCase()==="INCOME").map(e=>`"${e.description}","${e.category||""}","${e.accountCode||"4099"}","${safeNum(e.amount).toFixed(2)}","${toDay(entryDate(e))||""}","${e.reference||""}","${e.paymentMethod||""}"`),
      ``,`TOTAL INCOME,,,${totalInc.toFixed(2)}`,``,
      `EXPENSES`,`Description,Category,Account Code,Amount (₦),Date,Reference,Payment Method`,
      ...filtered.filter(e=>e.type?.toUpperCase()==="EXPENSE").map(e=>`"${e.description}","${e.category||""}","${e.accountCode||"5099"}","${safeNum(e.amount).toFixed(2)}","${toDay(entryDate(e))||""}","${e.reference||""}","${e.paymentMethod||""}"`),
      ``,`TOTAL EXPENSES,,,${totalExp.toFixed(2)}`,`NET PROFIT / (LOSS),,,${net.toFixed(2)}`,``,
      `TAX SUMMARY`,`VAT Payable (7.5%),,,${implVAT.toFixed(2)}`,`WHT Deducted,,,${totalWHT.toFixed(2)}`,
    ].join("\n");
    const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows); a.download=`FIRS-summary-${y}.csv`; a.click();
  };

  const exportCSV = () => {
    const rows=["Date,Type,Description,Category,Account Code,Amount,Reference,Payment Method,Currency",...filtered.map(e=>`"${toDay(entryDate(e))||""}","${e.type||""}","${e.description||""}","${e.category||""}","${e.accountCode||""}","${safeNum(e.amount).toFixed(2)}","${e.reference||""}","${e.paymentMethod||e.method||""}","${e.currency||"NGN"}"`)].join("\n");
    const a=document.createElement("a"); a.href="data:text/csv,"+encodeURIComponent(rows); a.download="ledger.csv"; a.click();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Ledger</h1>
          <p className="page-subtitle">
            {safe.length} entries ·{" "}
            <span className="text-green-400">{format(allInc)}</span> income ·{" "}
            <span className="text-red-400">{format(allExp)}</span> expenses ·{" "}
            Net: <span className={allInc-allExp>=0?"text-green-400":"text-red-400"}>{allInc-allExp>=0?"+":""}{format(allInc-allExp)}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={fetchAll} className="btn-secondary flex items-center gap-1.5" title="Refresh"><RefreshCw size={13}/></button>
          <button onClick={exportFIRS} className="btn-secondary flex items-center gap-2 text-xs"><Download size={13}/> FIRS Export</button>
          <button onClick={exportCSV}  className="btn-secondary flex items-center gap-2 text-xs"><Download size={13}/> CSV</button>
          <button onClick={()=>{setForm(EMPTY);setShowModal(true);}} className="btn-primary flex items-center gap-2"><Plus size={15}/> Add Entry</button>
        </div>
      </div>

      {/* PERIOD SELECTOR */}
      <div className="flex gap-2 overflow-x-auto pb-1 items-center">
        {[{k:"this_month",l:"This Month"},{k:"last_month",l:"Last Month"},{k:"q1",l:"Q1"},{k:"q2",l:"Q2"},{k:"q3",l:"Q3"},{k:"q4",l:"Q4"},{k:"this_year",l:"Full Year"},{k:"all",l:"All Time"}].map(p=>(
          <button key={p.k} onClick={()=>setPeriodRange(p.k)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap"
            style={{background:period===p.k?"var(--primary)":"transparent",color:period===p.k?"#fff":"var(--text-muted)",borderColor:period===p.k?"var(--primary)":"var(--border)"}}>
            {p.l}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-2">
          <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPeriod("custom");}} className="deji-input text-xs w-36"/>
          <span className="text-xs" style={{color:"var(--text-muted)"}}>→</span>
          <input type="date" value={dateTo}   onChange={e=>{setDateTo(e.target.value);setPeriod("custom");}}   className="deji-input text-xs w-36"/>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Income",        value:format(totalInc),  icon:<TrendingUp size={18}/>,  color:"#22c55e", sub:`${filtered.filter(e=>e.type?.toUpperCase()==="INCOME").length} entries` },
          { label:"Expenses",      value:format(totalExp),  icon:<TrendingDown size={18}/>, color:"#ef4444", sub:`${filtered.filter(e=>e.type?.toUpperCase()==="EXPENSE").length} entries` },
          { label:"Net Profit",    value:format(net),       icon:<DollarSign size={18}/>,  color:net>=0?"#22c55e":"#ef4444", sub:`${net>=0?"Profitable":"Loss"} · ${totalInc>0?((net/totalInc)*100).toFixed(1):"0"}% margin` },
          { label:"VAT Liability", value:format(implVAT),   icon:<Scale size={18}/>,       color:"#f97316", sub:"7.5% of income (FIRS)" },
        ].map(k=>(
          <div key={k.label} className="kpi-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:k.color+"22",color:k.color}}>{k.icon}</div>
            <div className="min-w-0">
              <p className="text-lg font-bold truncate" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{k.value}</p>
              <p className="text-[10px] font-semibold" style={{color:"var(--text-muted)"}}>{k.label}</p>
              <p className="text-[9px]" style={{color:"var(--text-dim)"}}>{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          {k:"journal", l:"Journal",       icon:<BookOpen size={13}/>},
          {k:"pl",      l:"P&L Statement", icon:<BarChart2 size={13}/>},
          {k:"trial",   l:"Trial Balance", icon:<Scale size={13}/>},
          {k:"debtors", l:"Debtors Aging", icon:<Clock size={13}/>},
          {k:"tax",     l:"Tax Summary",   icon:<FileText size={13}/>},
          {k:"cashflow",l:"Cash Flow",     icon:<Wallet size={13}/>},
        ].map(t=>(
          <button key={t.k} onClick={()=>setActiveTab(t.k)}
            className="px-4 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5"
            style={{background:activeTab===t.k?"var(--primary)":"transparent",color:activeTab===t.k?"#fff":"var(--text-muted)",borderColor:activeTab===t.k?"var(--primary)":"var(--border)"}}>
            {t.icon} {t.l}
          </button>
        ))}
      </div>

      {/* ══ JOURNAL ══ */}
      {activeTab==="journal" && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search description, reference..." className="deji-input pl-9"/>
            </div>
            <select value={fType}   onChange={e=>setFType(e.target.value)}   className="deji-input w-auto">
              <option value="all">All Types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option>
            </select>
            <select value={fCat}    onChange={e=>setFCat(e.target.value)}    className="deji-input w-auto">
              {CATEGORIES.map(c=><option key={c} value={c}>{c==="all"?"All Categories":c}</option>)}
            </select>
            <select value={fMethod} onChange={e=>setFMethod(e.target.value)} className="deji-input w-auto">
              <option value="all">All Methods</option>
              {PAY_METHODS.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="deji-card overflow-hidden">
            {loading ? <div className="p-8 text-center" style={{color:"var(--text-muted)"}}>Loading entries...</div>
            : filtered.length===0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-3">📒</div>
                <p style={{color:"var(--text-muted)"}}>{safe.length===0?"No entries yet. Add your first income or expense.":"No entries match filters."}</p>
                {safe.length===0 && <button onClick={()=>{setForm(EMPTY);setShowModal(true);}} className="btn-primary mt-4 flex items-center gap-2 mx-auto"><Plus size={14}/> Add First Entry</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="deji-table w-full" style={{minWidth:"900px"}}>
                  <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Account</th><th>Category</th><th>Method</th><th>Debit (₦)</th><th>Credit (₦)</th><th>Ref</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map((e,idx)=>{
                      const amt   = safeNum(e.amount);
                      const isInc = e.type?.toUpperCase()==="INCOME";
                      const acct  = ALL_ACCOUNTS.find(a=>a.code===e.accountCode);
                      const isOpen= expanded===(e.id||idx);
                      return [
                        <tr key={e.id||idx} onClick={()=>setExpanded(isOpen?null:(e.id||idx))} style={{cursor:"pointer"}}>
                          <td><span className="text-xs font-mono" style={{color:"var(--text-muted)"}}>{toDay(entryDate(e))||fmtDate(entryDate(e))||"—"}</span></td>
                          <td><span className={`badge text-[10px] ${isInc?"badge-green":"badge-red"}`}>{isInc?"↑ Income":"↓ Expense"}</span></td>
                          <td>
                            <p className="text-sm font-semibold truncate max-w-[180px]" style={{color:"var(--text-primary)"}}>{e.description||"—"}</p>
                            {e.currency&&e.currency!=="NGN"&&<span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{background:"rgba(99,102,241,0.1)",color:"#6366f1"}}>{e.currency}{e.fxRate?` @₦${e.fxRate}`:""}</span>}
                          </td>
                          <td><span className="text-[10px] font-mono" style={{color:"var(--text-muted)"}}>{e.accountCode||"—"}{acct?` · ${acct.name.slice(0,12)}`:""}</span></td>
                          <td><span className="badge badge-blue text-[10px]">{e.category||"—"}</span></td>
                          <td><span className="text-[10px]" style={{color:"var(--text-muted)"}}>{e.paymentMethod||e.method||"—"}</span></td>
                          <td>{!isInc&&<span className="text-sm font-bold text-red-400">{format(amt)}</span>}</td>
                          <td>{isInc &&<span className="text-sm font-bold text-green-400">{format(amt)}</span>}</td>
                          <td><span className="text-[10px] font-mono" style={{color:"var(--text-muted)"}}>{e.reference||"—"}</span></td>
                          <td>
                            <div className="flex gap-1">
                              <button onClick={ev=>{ev.stopPropagation();deleteEntry(e.id);}} className="w-6 h-6 rounded flex items-center justify-center hover:text-red-400" style={{color:"var(--text-muted)"}}><X size={11}/></button>
                              {isOpen?<ChevronUp size={13} style={{color:"var(--text-muted)"}}/>:<ChevronDown size={13} style={{color:"var(--text-muted)"}}/>}
                            </div>
                          </td>
                        </tr>,
                        isOpen&&(
                          <tr key={`${e.id||idx}-x`} style={{background:"var(--bg-hover)"}}>
                            <td colSpan={10} className="px-4 py-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div><span style={{color:"var(--text-muted)"}}>Account:</span><p className="font-semibold">{acct?`${acct.code} — ${acct.name}`:e.accountCode||"—"}</p></div>
                                <div><span style={{color:"var(--text-muted)"}}>Currency:</span><p className="font-semibold">{e.currency||"NGN"}{e.fxRate?` @ ₦${e.fxRate}`:""}</p></div>
                                <div><span style={{color:"var(--text-muted)"}}>Notes:</span><p className="font-semibold">{e.notes||"—"}</p></div>
                                <div><span style={{color:"var(--text-muted)"}}>Entry ID:</span><p className="font-mono text-[10px] break-all">{e.id}</p></div>
                              </div>
                            </td>
                          </tr>
                        ),
                      ];
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{borderTop:"2px solid var(--border)",background:"var(--bg-hover)"}}>
                      <td colSpan={6} className="p-3"><span className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{filtered.length} entries</span></td>
                      <td className="p-3"><span className="text-sm font-bold text-red-400">-{format(totalExp)}</span></td>
                      <td className="p-3"><span className="text-sm font-bold text-green-400">+{format(totalInc)}</span></td>
                      <td colSpan={2} className="p-3"><span className={`text-sm font-bold ${net>=0?"text-green-400":"text-red-400"}`}>Net: {net>=0?"+":""}{format(net)}</span></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ P&L STATEMENT ══ */}
      {activeTab==="pl" && (
        <div className="deji-card p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>Profit & Loss Statement</h2>
            <p className="text-sm mt-1" style={{color:"var(--text-muted)"}}>{dateFrom&&dateTo?`${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`:"All Time"}</p>
          </div>

          {/* Income */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3 pb-2" style={{color:"var(--text-primary)",borderBottom:"2px solid var(--border)"}}>Income</p>
            {incByCat.length===0?<p className="text-sm" style={{color:"var(--text-muted)"}}>No income in this period</p>:
              incByCat.map(([cat,amt])=>(
                <div key={cat} className="flex items-center justify-between py-2 px-2" style={{borderBottom:"0.5px solid var(--border)"}}>
                  <span className="text-sm" style={{color:"var(--text-muted)"}}>{cat}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{background:"var(--bg-hover)"}}>
                      <div className="h-full rounded-full bg-green-400" style={{width:`${totalInc>0?(amt/totalInc)*100:0}%`}}/>
                    </div>
                    <span className="text-sm font-semibold w-28 text-right" style={{color:"var(--text-primary)"}}>{format(amt)}</span>
                  </div>
                </div>
              ))
            }
            <div className="flex justify-between py-3 px-2 mt-1 font-bold" style={{borderTop:"2px solid var(--border)"}}>
              <span style={{color:"var(--text-primary)"}}>Total Income</span>
              <span className="text-green-400">{format(totalInc)}</span>
            </div>
          </div>

          {/* Expenses */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3 pb-2" style={{color:"var(--text-primary)",borderBottom:"2px solid var(--border)"}}>Expenses</p>
            {expByCat.length===0?<p className="text-sm" style={{color:"var(--text-muted)"}}>No expenses in this period</p>:
              expByCat.map(([cat,amt])=>(
                <div key={cat} className="flex items-center justify-between py-2 px-2" style={{borderBottom:"0.5px solid var(--border)"}}>
                  <span className="text-sm" style={{color:"var(--text-muted)"}}>{cat}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{background:"var(--bg-hover)"}}>
                      <div className="h-full rounded-full bg-red-400" style={{width:`${totalExp>0?(amt/totalExp)*100:0}%`}}/>
                    </div>
                    <span className="text-sm font-semibold w-28 text-right" style={{color:"var(--text-primary)"}}>{format(amt)}</span>
                  </div>
                </div>
              ))
            }
            <div className="flex justify-between py-3 px-2 mt-1 font-bold" style={{borderTop:"2px solid var(--border)"}}>
              <span style={{color:"var(--text-primary)"}}>Total Expenses</span>
              <span className="text-red-400">({format(totalExp)})</span>
            </div>
          </div>

          {/* Net */}
          <div className="p-4 rounded-2xl" style={{background:net>=0?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",border:`1px solid ${net>=0?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`}}>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold" style={{color:"var(--text-primary)"}}>Net Profit / (Loss)</span>
              <span className={`text-2xl font-bold ${net>=0?"text-green-400":"text-red-400"}`} style={{fontFamily:"Playfair Display,serif"}}>{net>=0?"+":""}{format(net)}</span>
            </div>
            {totalInc>0&&<p className="text-xs mt-1" style={{color:"var(--text-muted)"}}>Profit margin: {((net/totalInc)*100).toFixed(1)}%</p>}
          </div>

          {/* Tax obligations */}
          <div className="p-4 rounded-xl" style={{background:"var(--bg-hover)"}}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:"var(--text-muted)"}}>Tax Obligations (FIRS)</p>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[11px]" style={{color:"var(--text-muted)"}}>VAT Payable (7.5% of income)</p><p className="text-base font-bold text-orange-400">{format(implVAT)}</p></div>
              <div><p className="text-[11px]" style={{color:"var(--text-muted)"}}>WHT Deducted</p><p className="text-base font-bold" style={{color:"var(--text-primary)"}}>{format(totalWHT)}</p></div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={exportFIRS} className="btn-primary flex items-center gap-2 flex-1 justify-center"><Download size={14}/> FIRS CSV</button>
            <button onClick={exportCSV}  className="btn-secondary flex items-center gap-2 flex-1 justify-center"><Download size={14}/> All Entries</button>
          </div>
        </div>
      )}

      {/* ══ TRIAL BALANCE ══ */}
      {activeTab==="trial" && (
        <div className="deji-card overflow-hidden">
          <div className="p-4" style={{borderBottom:"1px solid var(--border)"}}>
            <h3 className="text-base font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>Trial Balance</h3>
            <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>Nigerian Chart of Accounts — all-time balances. Run this quarterly for FIRS compliance.</p>
          </div>
          {trialBal.length===0?(
            <div className="p-12 text-center" style={{color:"var(--text-muted)"}}>No account entries yet. Add ledger entries with account codes to populate the trial balance.</div>
          ):(
            <div className="overflow-x-auto">
              <table className="deji-table w-full">
                <thead><tr><th>Code</th><th>Account Name</th><th>Category</th><th>Type</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                <tbody>
                  <tr style={{background:"rgba(34,197,94,0.05)"}}><td colSpan={7} className="px-3 py-2"><span className="text-[11px] font-bold uppercase tracking-wider text-green-400">Income Accounts (4xxx)</span></td></tr>
                  {trialBal.filter(a=>a.code.startsWith("4")).map(a=>(
                    <tr key={a.code}>
                      <td><span className="font-mono text-xs" style={{color:"var(--primary)"}}>{a.code}</span></td>
                      <td><span className="text-sm" style={{color:"var(--text-primary)"}}>{a.name}</span></td>
                      <td><span className="badge badge-blue text-[10px]">{a.category}</span></td>
                      <td><span className="text-[10px]" style={{color:"var(--text-muted)"}}>Income</span></td>
                      <td><span className="text-sm" style={{color:"var(--text-muted)"}}>{a.debit>0?format(a.debit):"—"}</span></td>
                      <td><span className="text-sm font-semibold text-green-400">{a.credit>0?format(a.credit):"—"}</span></td>
                      <td><span className="text-sm font-bold" style={{color:a.balance>=0?"#22c55e":"#ef4444"}}>{format(Math.abs(a.balance))}</span></td>
                    </tr>
                  ))}
                  <tr style={{background:"rgba(239,68,68,0.05)"}}><td colSpan={7} className="px-3 py-2"><span className="text-[11px] font-bold uppercase tracking-wider text-red-400">Expense Accounts (5xxx)</span></td></tr>
                  {trialBal.filter(a=>a.code.startsWith("5")).map(a=>(
                    <tr key={a.code}>
                      <td><span className="font-mono text-xs" style={{color:"var(--primary)"}}>{a.code}</span></td>
                      <td><span className="text-sm" style={{color:"var(--text-primary)"}}>{a.name}</span></td>
                      <td><span className="badge badge-blue text-[10px]">{a.category}</span></td>
                      <td><span className="text-[10px]" style={{color:"var(--text-muted)"}}>Expense</span></td>
                      <td><span className="text-sm font-semibold text-red-400">{a.debit>0?format(a.debit):"—"}</span></td>
                      <td><span className="text-sm" style={{color:"var(--text-muted)"}}>{a.credit>0?format(a.credit):"—"}</span></td>
                      <td><span className="text-sm font-bold" style={{color:a.balance>=0?"#ef4444":"#22c55e"}}>{format(Math.abs(a.balance))}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{borderTop:"2px solid var(--border)",background:"var(--bg-hover)"}}>
                    <td colSpan={4} className="p-3"><span className="text-xs font-bold uppercase">Totals</span></td>
                    <td className="p-3"><span className="text-sm font-bold text-red-400">{format(trialBal.reduce((s,a)=>s+a.debit,0))}</span></td>
                    <td className="p-3"><span className="text-sm font-bold text-green-400">{format(trialBal.reduce((s,a)=>s+a.credit,0))}</span></td>
                    <td className="p-3"><span className={`text-sm font-bold ${allInc-allExp>=0?"text-green-400":"text-red-400"}`}>{format(Math.abs(allInc-allExp))}</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ DEBTORS AGING ══ */}
      {activeTab==="debtors" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{l:"Current (0-30 days)",k:"0-30",c:"#22c55e"},{l:"31-60 days",k:"31-60",c:"#f97316"},{l:"61-90 days",k:"61-90",c:"#eab308"},{l:"90+ days",k:"90+",c:"#ef4444"}].map(b=>(
              <div key={b.k} className="kpi-card">
                <div className="w-3 h-3 rounded-full mb-2" style={{background:b.c}}/>
                <p className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:b.c}}>{format(debtors.bkts[b.k])}</p>
                <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{b.l}</p>
              </div>
            ))}
          </div>
          <div className="deji-card p-4 flex items-center justify-between" style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)"}}>
            <div><p className="text-sm font-bold" style={{color:"var(--text-primary)"}}>Total Outstanding Receivables</p><p className="text-xs" style={{color:"var(--text-muted)"}}>{debtors.list.length} unpaid invoices</p></div>
            <p className="text-2xl font-bold text-red-400" style={{fontFamily:"Playfair Display,serif"}}>{format(debtors.total)}</p>
          </div>
          <div className="deji-card overflow-hidden">
            <div className="p-4" style={{borderBottom:"1px solid var(--border)"}}><h3 className="text-sm font-bold" style={{color:"var(--text-primary)"}}>Outstanding by Customer</h3></div>
            {debtors.list.length===0?(
              <div className="p-12 text-center"><CheckCircle size={32} className="mx-auto mb-3 text-green-400"/><p className="text-green-400 font-semibold">All invoices paid. No outstanding debtors.</p></div>
            ):(
              <div className="overflow-x-auto">
                <table className="deji-table w-full">
                  <thead><tr><th>Customer</th><th>Invoice</th><th>Amount</th><th>Due Date</th><th>Aging</th></tr></thead>
                  <tbody>
                    {debtors.list.sort((a,b)=>new Date(a.date)-new Date(b.date)).map((d,i)=>{
                      const c=d.bkt==="0-30"?"#22c55e":d.bkt==="31-60"?"#f97316":d.bkt==="61-90"?"#eab308":"#ef4444";
                      return(
                        <tr key={i}>
                          <td><span className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>{d.name}</span></td>
                          <td><span className="font-mono text-xs" style={{color:"var(--primary)"}}>{d.inv}</span></td>
                          <td><span className="text-sm font-bold text-red-400">{format(d.amt)}</span></td>
                          <td><span className="text-xs" style={{color:"var(--text-muted)"}}>{fmtDate(d.date)||"—"}</span></td>
                          <td><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:c+"22",color:c}}>{d.bkt} days</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAX SUMMARY ══ */}
      {activeTab==="tax" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {l:"VAT Payable (7.5%)",  v:format(implVAT),  c:"#f97316", sub:"Based on income in period",    icon:"🏛"},
              {l:"WHT Deducted", v:format(totalWHT), c:"#6366f1", sub:`${filtered.filter(e=>e.category==="Tax"&&e.description?.toLowerCase().includes("wht")).length} WHT entries`, icon:"📋"},
              {l:"Gross Income",         v:format(totalInc), c:"#22c55e", sub:"Before tax deductions",        icon:"📈"},
              {l:"Taxable Income",       v:format(Math.max(0,net)), c:"#eab308", sub:"Net after allowable expenses", icon:"⚖️"},
              {l:"Est. CIT (30%)",       v:format(Math.max(0,net)*0.30), c:"#ef4444", sub:"Corporate Income Tax estimate", icon:"🏦"},
              {l:"Education Tax (2.5%)", v:format(Math.max(0,net)*0.025), c:"#8b5cf6", sub:"Est-Tax — 2.5% of taxable profit", icon:"🎓"},
            ].map(k=>(
              <div key={k.l} className="kpi-card">
                <div className="text-2xl mb-1">{k.icon}</div>
                <p className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:k.c}}>{k.v}</p>
                <p className="text-xs font-semibold" style={{color:"var(--text-muted)"}}>{k.l}</p>
                <p className="text-[10px]" style={{color:"var(--text-dim)"}}>{k.sub}</p>
              </div>
            ))}
          </div>
          <div className="deji-card p-5 space-y-3">
            <h3 className="text-base font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>WHT Rate Reference (Nigeria)</h3>
            <p className="text-xs" style={{color:"var(--text-muted)"}}>Withholding Tax to deduct from supplier payments before remitting to FIRS.</p>
            <div className="overflow-x-auto">
              <table className="deji-table w-full">
                <thead><tr><th>Transaction Type</th><th>WHT Rate</th><th>Action</th></tr></thead>
                <tbody>
                  {Object.entries(WHT_RATES).map(([type,rate])=>(
                    <tr key={type}>
                      <td><span className="text-sm" style={{color:"var(--text-primary)"}}>{type}</span></td>
                      <td><span className="text-sm font-bold" style={{color:"var(--primary)"}}>{rate}%</span></td>
                      <td>
                        <button onClick={()=>{setForm(p=>({...p,type:"EXPENSE",description:`WHT ${rate}% on ${type.toLowerCase()}`,category:"Tax",accountCode:"5012",includeWHT:false,whtRate:rate}));setShowModal(true);}}
                          className="text-xs px-2 py-1 rounded-lg" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}>
                          + Record WHT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={exportFIRS} className="btn-primary flex items-center gap-2 w-full justify-center"><Download size={14}/> Download FIRS Tax Filing CSV</button>
          </div>
        </div>
      )}

      {/* ══ CASH FLOW ══ */}
      {activeTab==="cashflow" && (
        <div className="space-y-4">
          <div className="deji-card overflow-hidden">
            <div className="p-4" style={{borderBottom:"1px solid var(--border)"}}><h3 className="text-base font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>Monthly Cash Flow</h3></div>
            {(() => {
              const months={};
              safe.forEach(e=>{
                const d=new Date(entryDate(e));
                const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
                if (!months[k]) months[k]={inc:0,exp:0,label:d.toLocaleString("en-NG",{month:"short",year:"numeric"})};
                if (e.type?.toUpperCase()==="INCOME")  months[k].inc+=safeNum(e.amount);
                else                                   months[k].exp+=safeNum(e.amount);
              });
              const sorted=Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0]));
              let running=0;
              return sorted.length===0?<div className="p-8 text-center" style={{color:"var(--text-muted)"}}>No data yet</div>:(
                <div className="overflow-x-auto">
                  <table className="deji-table w-full">
                    <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net Cash</th><th>Running Balance</th></tr></thead>
                    <tbody>
                      {sorted.map(([k,m])=>{
                        const net2=m.inc-m.exp; running+=net2;
                        return(
                          <tr key={k}>
                            <td><span className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>{m.label}</span></td>
                            <td><span className="text-sm text-green-400">+{format(m.inc)}</span></td>
                            <td><span className="text-sm text-red-400">-{format(m.exp)}</span></td>
                            <td><span className={`text-sm font-bold ${net2>=0?"text-green-400":"text-red-400"}`}>{net2>=0?"+":""}{format(net2)}</span></td>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${running>=0?"text-green-400":"text-red-400"}`}>{format(running)}</span>
                                {running<0&&<AlertTriangle size={12} className="text-red-400"/>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
          {/* Payment method breakdown */}
          <div className="deji-card p-4">
            <h3 className="text-sm font-bold mb-3" style={{color:"var(--text-primary)"}}>Cash Inflow by Payment Method</h3>
            {(() => {
              const mm={};
              safe.filter(e=>e.type?.toUpperCase()==="INCOME").forEach(e=>{const m=e.paymentMethod||e.method||"Unknown";mm[m]=(mm[m]||0)+safeNum(e.amount);});
              const tot=Object.values(mm).reduce((s,v)=>s+v,0);
              return tot===0?<p className="text-sm" style={{color:"var(--text-muted)"}}>No income entries with payment methods yet.</p>:
                Object.entries(mm).sort((a,b)=>b[1]-a[1]).map(([m,amt])=>(
                  <div key={m} className="flex items-center gap-3 mb-2">
                    <span className="text-xs w-28 flex-shrink-0" style={{color:"var(--text-muted)"}}>{m}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:"var(--bg-hover)"}}>
                      <div className="h-full rounded-full bg-green-400" style={{width:`${(amt/tot)*100}%`}}/>
                    </div>
                    <span className="text-xs font-semibold w-24 text-right" style={{color:"var(--text-primary)"}}>{format(amt)}</span>
                    <span className="text-[10px] w-10 text-right" style={{color:"var(--text-muted)"}}>{((amt/tot)*100).toFixed(1)}%</span>
                  </div>
                ));
            })()}
          </div>
        </div>
      )}

      {/* ══ ADD ENTRY MODAL ══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="deji-card p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>Add Ledger Entry</h2>
              <button onClick={()=>setShowModal(false)} style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <form onSubmit={saveEntry} className="space-y-4">

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                {["INCOME","EXPENSE"].map(t=>(
                  <button key={t} type="button" onClick={()=>setForm(p=>({...p,type:t,accountCode:t==="INCOME"?"4099":"5099"}))}
                    className="py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{background:form.type===t?(t==="INCOME"?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)"):"var(--bg-hover)",color:form.type===t?(t==="INCOME"?"#22c55e":"#ef4444"):"var(--text-muted)",border:`1px solid ${form.type===t?(t==="INCOME"?"rgba(34,197,94,0.4)":"rgba(239,68,68,0.4)"):"var(--border)"}`}}>
                    {t==="INCOME"?"↑ Income":"↓ Expense"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="deji-label">Amount (₦) *</label><input type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} className="deji-input" required/></div>
                <div><label className="deji-label">Date *</label><input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} className="deji-input" required/></div>
                <div className="col-span-2"><label className="deji-label">Description *</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="deji-input" placeholder="e.g. Sales to Ayo, Generator diesel" required/></div>
                <div>
                  <label className="deji-label">Account (CoA)</label>
                  <select value={form.accountCode} onChange={e=>{const a=ALL_ACCOUNTS.find(ac=>ac.code===e.target.value);setForm(p=>({...p,accountCode:e.target.value,category:a?.category||p.category}));}} className="deji-input">
                    <optgroup label="Income (4xxx)">{COA.INCOME.map(a=><option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}</optgroup>
                    <optgroup label="Expense (5xxx)">{COA.EXPENSE.map(a=><option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}</optgroup>
                  </select>
                </div>
                <div><label className="deji-label">Category</label>
                  <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="deji-input">
                    {CATEGORIES.filter(c=>c!=="all").map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="deji-label">Payment Method</label>
                  <select value={form.paymentMethod} onChange={e=>setForm(p=>({...p,paymentMethod:e.target.value}))} className="deji-input">
                    {PAY_METHODS.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className="deji-label">Reference</label><input value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} className="deji-input" placeholder="INV-000003, RCP-001"/></div>
                <div><label className="deji-label">Currency</label>
                  <select value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))} className="deji-input">
                    {["NGN","USD","GBP","EUR","GHS","KES"].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {form.currency!=="NGN"&&(
                  <div><label className="deji-label">FX Rate (₦ per {form.currency})</label><input type="number" value={form.fxRate} onChange={e=>setForm(p=>({...p,fxRate:e.target.value}))} className="deji-input" placeholder="e.g. 1600"/></div>
                )}
                <div className="col-span-2"><label className="deji-label">Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="deji-input resize-none" rows={2}/></div>
              </div>

              {/* Tax compliance */}
              <div style={{borderTop:"1px solid var(--border)",paddingTop:"1rem"}}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:"var(--text-muted)"}}>🏛 Tax Compliance (Optional)</p>
                <div className="space-y-2">
                  {form.type==="INCOME"&&(
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:"var(--bg-hover)"}}>
                      <input type="checkbox" id="vat" checked={form.includeVAT} onChange={e=>setForm(p=>({...p,includeVAT:e.target.checked}))} className="accent-green-500 w-4 h-4"/>
                      <label htmlFor="vat" className="flex-1 text-sm cursor-pointer" style={{color:"var(--text-primary)"}}>
                        Auto-create VAT entry (7.5% = <strong>{form.amount?format(parseFloat(form.amount||0)*0.075):"₦0"}</strong>)
                      </label>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{background:"var(--bg-hover)"}}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="wht" checked={form.includeWHT} onChange={e=>setForm(p=>({...p,includeWHT:e.target.checked}))} className="accent-orange-500 w-4 h-4"/>
                      <label htmlFor="wht" className="text-sm cursor-pointer" style={{color:"var(--text-primary)"}}>Withholding Tax (WHT)</label>
                    </div>
                    {form.includeWHT&&(
                      <div className="flex items-center gap-2">
                        <select value={form.whtRate} onChange={e=>setForm(p=>({...p,whtRate:Number(e.target.value)}))} className="deji-input text-xs w-20">
                          {[5,10,15].map(r=><option key={r} value={r}>{r}%</option>)}
                        </select>
                        <span className="text-xs text-orange-400">= {form.amount?format(parseFloat(form.amount||0)*(form.whtRate/100)):"₦0"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?"Saving...":form.type==="INCOME"?"Add Income Entry":"Add Expense Entry"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}