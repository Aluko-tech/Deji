"use client";
import { useState, useEffect, useRef } from "react";
import { CurrencyProvider } from "@/lib/currencyContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Users, Package, DollarSign,
  FileText, Globe, BarChart2, MessageSquare, Settings, Bell,
  Search, LogOut, User, Menu, X, Wifi, WifiOff, UserPlus,
  ClipboardList, Warehouse, Sun, Moon, CheckCheck, AlertTriangle,
  TrendingUp, ShoppingBag, UserCheck, ChevronRight,
} from "lucide-react";
import api from "@/lib/api";

const NAV = [
  { href:"/dashboard",       icon:LayoutDashboard, label:"Dashboard", group:"Main" },
  { href:"/pos",             icon:ShoppingCart,    label:"POS",        group:"Main", badge:"LIVE" },
  { href:"/crm/pipeline",    icon:UserPlus,        label:"Pipeline",   group:"CRM" },
  { href:"/crm/leads",       icon:Users,           label:"Leads",      group:"CRM" },
  { href:"/crm/contacts",    icon:User,            label:"Contacts",   group:"CRM" },
  { href:"/erp/inventory",   icon:Package,         label:"Inventory",  group:"ERP" },
  { href:"/erp/finance",     icon:DollarSign,      label:"Finance",    group:"ERP" },
  { href:"/erp/ledger",      icon:ClipboardList,   label:"Ledger",     group:"ERP" },
  { href:"/erp/warehousing", icon:Warehouse,        label:"Warehousing", group:"ERP" },
  { href:"/forms",           icon:FileText,        label:"Forms",      group:"Tools" },
  { href:"/website/builder", icon:Globe,           label:"Website",    group:"Tools" },
  { href:"/analytics",       icon:BarChart2,       label:"Analytics",  group:"Tools" },
  { href:"/whatsapp",        icon:MessageSquare,   label:"WhatsApp",   group:"Tools" },
];

// ── Notification type config ──────────────────────────────────────────────────
const NOTIF_CONFIG = {
  LOW_STOCK_ALERT:  { icon: AlertTriangle, color: "#f97316", bg: "rgba(249,115,22,0.1)",  label: "Low Stock"    },
  NEW_LEAD:         { icon: TrendingUp,    color: "#22c55e", bg: "rgba(34,197,94,0.1)",   label: "New Lead"     },
  NEW_ORDER:        { icon: ShoppingBag,   color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  label: "New Order"    },
  INVITE_ACCEPTED:  { icon: UserCheck,     color: "#a855f7", bg: "rgba(168,85,247,0.1)",  label: "Staff Joined" },
  PAYMENT_RECEIVED: { icon: DollarSign,    color: "#22c55e", bg: "rgba(34,197,94,0.1)",   label: "Payment"      },
};

function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000)    return "just now";
  if (d < 3600000)  return Math.floor(d / 60000) + "m ago";
  if (d < 86400000) return Math.floor(d / 3600000) + "h ago";
  return Math.floor(d / 86400000) + "d ago";
}


// ── Notification Dropdown ─────────────────────────────────────────────────────
function NotificationDropdown({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const res  = await api.get("/notifications/logs?take=20");
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setNotifications(data.map(n => ({ ...n, read: false })));
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })));
  const markRead    = (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const unread      = notifications.filter(n => !n.read).length;
  const filtered    = filter === "unread" ? notifications.filter(n => !n.read) : notifications;

  return (
    <div className="absolute right-0 top-12 w-96 rounded-2xl shadow-2xl z-50 overflow-hidden"
      style={{ background:"var(--bg-surface)", border:"1px solid var(--border)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:"1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>Notifications</p>
          {unread > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background:"var(--primary-dim)", color:"var(--primary)" }}>{unread} new</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold" style={{ color:"var(--primary)" }}>
              <CheckCheck size={12}/> Mark all read
            </button>
          )}
          <button onClick={onClose} style={{ color:"var(--text-muted)" }}><X size={14}/></button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 px-4 py-2" style={{ borderBottom:"1px solid var(--border)" }}>
        {["all","unread"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
            style={{ background: filter===f ? "var(--primary-dim)" : "transparent", color: filter===f ? "var(--primary)" : "var(--text-muted)" }}>
            {f}{f==="unread" && unread > 0 ? ` (${unread})` : ""}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight:"360px" }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color:"var(--text-muted)" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm" style={{ color:"var(--text-muted)" }}>{filter==="unread" ? "All caught up!" : "No notifications yet"}</p>
          </div>
        ) : filtered.map(n => {
          const cfg  = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.NEW_ORDER;
          const Icon = cfg.icon;
          return (
            <div key={n.id} onClick={() => markRead(n.id)}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all"
              style={{ background: n.read ? "transparent" : "rgba(34,197,94,0.03)", borderBottom:"1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background:cfg.bg }}>
                <Icon size={14} style={{ color:cfg.color }}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold" style={{ color:cfg.color }}>{cfg.label}</p>
                  <span className="text-[10px] flex-shrink-0" style={{ color:"var(--text-muted)" }}>{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color:"var(--text-muted)" }}>{n.content}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background:"var(--primary)" }}/>}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5" style={{ borderTop:"1px solid var(--border)" }}>
        <Link href="/settings?tab=notifications" onClick={onClose}
          className="flex items-center justify-center gap-1 text-xs font-semibold w-full"
          style={{ color:"var(--text-muted)" }}>
          Notification settings <ChevronRight size={12}/>
        </Link>
      </div>
    </div>
  );
}

// ── Profile Dropdown ──────────────────────────────────────────────────────────
function ProfileDropdown({ user, dark, toggleTheme, logout, onClose }) {
  const initials = user
    ? ((user.firstName?.[0]||"") + (user.lastName?.[0]||"")).toUpperCase() || user.email?.[0]?.toUpperCase()
    : "U";
  const fullName = user?.firstName ? `${user.firstName} ${user.lastName||""}`.trim() : user?.email || "User";

  const itemStyle = { color:"var(--text-muted)", background:"transparent" };
  const hoverOn   = e => e.currentTarget.style.background = "var(--bg-hover)";
  const hoverOff  = e => e.currentTarget.style.background = "transparent";

  return (
    <div className="absolute right-0 top-12 w-72 rounded-2xl shadow-2xl z-50 overflow-hidden"
      style={{ background:"var(--bg-surface)", border:"1px solid var(--border)" }}>

      {/* User info */}
      <div className="p-4" style={{ borderBottom:"1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", fontFamily:"Syne,sans-serif" }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate" style={{ color:"var(--text-primary)" }}>{fullName}</p>
            <p className="text-xs truncate" style={{ color:"var(--text-muted)" }}>{user?.email}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize mt-1 inline-block"
              style={{ background:"var(--primary-dim)", color:"var(--primary)" }}>
              {user?.role || "admin"}
            </span>
          </div>
        </div>
        {user?.tenantName && (
          <div className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background:"var(--bg-hover)" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:"var(--primary)" }}/>
            <p className="text-xs font-semibold truncate" style={{ color:"var(--text-muted)" }}>{user.tenantName}</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="p-2">
        <Link href="/settings?tab=profile" onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={itemStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          <User size={15}/> My Profile
        </Link>
        <Link href="/settings" onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={itemStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          <Settings size={15}/> Settings
        </Link>
        <Link href="/settings/staff" onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={itemStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          <Users size={15}/> Manage Staff
        </Link>
        <button onClick={toggleTheme}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
          style={itemStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          <div className="flex items-center gap-3">
            {dark ? <Sun size={15}/> : <Moon size={15}/>}
            {dark ? "Light Mode" : "Dark Mode"}
          </div>
          <div className="w-9 h-5 rounded-full relative flex-shrink-0"
            style={{ background: dark ? "var(--border)" : "var(--primary)" }}>
            <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
              style={{ left: dark ? "2px" : "calc(100% - 18px)" }}/>
          </div>
        </button>
      </div>

      {/* Logout */}
      <div className="p-2" style={{ borderTop:"1px solid var(--border)" }}>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left text-red-400"
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <LogOut size={15}/> Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
function DejiLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#22c55e"/>
      <path d="M10 10 L10 30 L20 30 C27 30 32 25 32 20 C32 15 27 10 20 10 Z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/>
      <circle cx="20" cy="20" r="3.5" fill="white" opacity="0.9"/>
      <path d="M25 15 L29 11 M29 11 L29 15 M29 11 L25 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen]               = useState(false);
  const [online, setOnline]           = useState(true);
  const [user, setUser]               = useState(null);
  const [dark, setDark]               = useState(true);
  const [showNotifs, setShowNotifs]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) try { setUser(JSON.parse(s)); } catch {}
    setOnline(navigator.onLine);
    const isDark = localStorage.getItem("theme") !== "light";
    setDark(isDark);
    document.documentElement.classList.toggle("light", !isDark);
    window.addEventListener("online",  () => setOnline(true));
    window.addEventListener("offline", () => setOnline(false));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("light", !next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const active = (href) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-screen overflow-hidden" style={{background:"var(--bg-base)"}}>
      {!online && (
        <div className="offline-banner flex items-center justify-center gap-2">
          <WifiOff size={14}/> Offline — changes sync on reconnect
        </div>
      )}

      {open && <div className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm" onClick={() => setOpen(false)}/>}

      {/* ── SIDEBAR — unchanged ── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{background:"var(--bg-surface)", borderRight:"1px solid var(--border)"}}>

        <div className="flex items-center justify-between p-4" style={{borderBottom:"1px solid var(--border)"}}>
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <DejiLogo/>
            <div>
              <p className="font-bold text-lg leading-none" style={{fontFamily:"Syne,sans-serif", color:"var(--text-primary)"}}>
                Deji<span style={{color:"var(--primary)"}}>.</span>
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{color:"var(--text-muted)"}}>Business OS</p>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden" style={{color:"var(--text-muted)"}}><X size={18}/></button>
        </div>

        <div className="px-4 py-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{background:"var(--bg-hover)"}}>
            <div className={`w-1.5 h-1.5 rounded-full ${online ? "animate-pulse" : ""}`} style={{background: online ? "var(--primary)" : "#f87171"}}/>
            <span className="text-xs font-medium" style={{color:"var(--text-muted)"}}>{online ? "All systems live" : "Offline mode"}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {["Main","CRM","ERP","Tools"].map(group => (
            <div key={group}>
              <p className="text-[9px] font-bold uppercase tracking-widest px-3 mb-2" style={{color:"var(--text-muted)", opacity:.5}}>{group}</p>
              {NAV.filter(i => i.group === group).map(item => {
                const Icon = item.icon;
                const isActive = active(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-0.5"
                    style={{
                      background: isActive ? "var(--primary-dim)" : "transparent",
                      color: isActive ? "var(--primary)" : "var(--text-muted)",
                    }}>
                    <Icon size={16}/>
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{background:"var(--primary-dim)", color:"var(--primary)"}}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && !item.badge && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{background:"var(--primary)"}}/>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 space-y-0.5" style={{borderTop:"1px solid var(--border)"}}>
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
            style={{color:"var(--text-muted)"}}>
            {dark ? <Sun size={16}/> : <Moon size={16}/>}
            {dark ? "Light Mode" : "Dark Mode"}
            <div className="ml-auto w-10 h-5 rounded-full relative transition-all duration-300"
              style={{background: dark ? "var(--border)" : "var(--primary)"}}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                style={{left: dark ? "2px" : "calc(100% - 18px)"}}/>
            </div>
          </button>
          <Link href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: active("/settings") ? "var(--primary)" : "var(--text-muted)", background: active("/settings") ? "var(--primary-dim)" : "transparent" }}>
            <Settings size={16}/> Settings
          </Link>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left hover:text-red-400"
            style={{color:"var(--text-muted)"}}>
            <LogOut size={16}/> Logout
          </button>
        </div>

        {user && (
          <div className="p-3" style={{borderTop:"1px solid var(--border)"}}>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:"var(--bg-hover)"}}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{background:"var(--primary)", fontFamily:"Syne,sans-serif"}}>
                {(user.firstName || user.email)?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{color:"var(--text-primary)"}}>
                  {user.firstName ? `${user.firstName} ${user.lastName||""}`.trim() : user.email}
                </p>
                <p className="text-[10px] capitalize" style={{color:"var(--text-muted)"}}>{user.role || "Admin"}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center px-4 gap-4 flex-shrink-0 z-20"
          style={{background:"var(--bg-surface)", borderBottom:"1px solid var(--border)"}}>
          <button onClick={() => setOpen(true)}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center"
            style={{background:"var(--bg-hover)", color:"var(--text-muted)"}}>
            <Menu size={18}/>
          </button>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
              <input placeholder="Search anything..." onKeyDown={(e)=>{if(e.key==="Enter"){const q=e.target.value.trim();if(q){window.location.href=`/crm/leads?search=${encodeURIComponent(q)}`;}}}}
                className="w-full rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none transition-all"
                style={{background:"var(--bg-hover)", border:"1px solid var(--border)", color:"var(--text-primary)"}}/>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{background:"var(--bg-hover)", border:"1px solid var(--border)", color:"var(--text-muted)"}}>
              {dark ? <Sun size={15}/> : <Moon size={15}/>}
            </button>

            {/* ── Notification Bell ── */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifs(p => !p); setShowProfile(false); }}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: showNotifs ? "var(--primary-dim)" : "var(--bg-hover)",
                  border: "1px solid var(--border)",
                  color: showNotifs ? "var(--primary)" : "var(--text-muted)",
                }}>
                <Bell size={15}/>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] text-white flex items-center justify-center font-bold"
                    style={{background:"var(--primary)"}}>
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && <NotificationDropdown onClose={() => setShowNotifs(false)}/>}
            </div>

            {/* Online status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{background: online ? "var(--primary-dim)" : "rgba(239,68,68,0.1)", color: online ? "var(--primary)" : "#f87171"}}>
              {online ? <Wifi size={12}/> : <WifiOff size={12}/>}
              <span className="hidden sm:inline">{online ? "Live" : "Offline"}</span>
            </div>

            {/* ── Profile Avatar ── */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setShowProfile(p => !p); setShowNotifs(false); }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm cursor-pointer transition-all"
                style={{
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                  fontFamily: "Syne,sans-serif",
                  outline: showProfile ? "2px solid var(--primary)" : "none",
                  outlineOffset: "2px",
                }}>
                {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
              </button>
              {showProfile && (
                <ProfileDropdown
                  user={user} dark={dark}
                  toggleTheme={toggleTheme} logout={logout}
                  onClose={() => setShowProfile(false)}
                />
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6"><CurrencyProvider>{children}</CurrencyProvider></main>
      </div>

      {/* Floating hamburger */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center lg:hidden animate-glow"
          style={{background:"var(--primary)", color:"#fff"}}>
          <Menu size={20}/>
        </button>
      )}

      {/* Mobile bottom nav — unchanged */}
      <nav className="fixed bottom-0 left-0 right-0 flex lg:hidden z-30"
        style={{background:"var(--bg-surface)", borderTop:"1px solid var(--border)"}}>
        {[
          { href:"/dashboard",     icon:LayoutDashboard, label:"Home" },
          { href:"/pos",           icon:ShoppingCart,    label:"POS" },
          { href:"/crm/pipeline",  icon:Users,           label:"CRM" },
          { href:"/erp/inventory", icon:Package,         label:"Stock" },
          { href:"/settings",      icon:Settings,        label:"More" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-medium"
              style={{color: active(item.href) ? "var(--primary)" : "var(--text-muted)"}}>
              <Icon size={19}/>{item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}