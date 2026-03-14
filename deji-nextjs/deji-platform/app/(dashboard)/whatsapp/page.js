"use client";
import { useState, useEffect, useRef } from "react";
import {
  Send, Search, Plus, X, Check, CheckCheck, Phone,
  Users, MessageSquare, Settings, Loader2, RefreshCw,
  Zap, AlertCircle, ChevronRight,
} from "lucide-react";
import api from "@/lib/api";

function safeArray(val) {
  if (Array.isArray(val))           return val;
  if (Array.isArray(val?.data))     return val.data;
  if (Array.isArray(val?.contacts)) return val.contacts;
  if (Array.isArray(val?.conversations)) return val.conversations;
  if (Array.isArray(val?.results))  return val.results;
  return [];
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000)    return "just now";
  if (d < 3600000)  return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return new Date(iso).toLocaleDateString("en-GB", { day:"numeric", month:"short" });
}

const DEFAULT_TEMPLATES = [
  { id:"t1", name:"Order Confirmation", category:"TRANSACTIONAL", status:"approved",
    body:"Hi {{1}}, your order has been confirmed! 🎉 Order ref: {{2}}. We'll notify you when it ships." },
  { id:"t2", name:"Payment Reminder",   category:"REMINDER",      status:"approved",
    body:"Hi {{1}}, friendly reminder that your invoice {{2}} of ₦{{3}} is due on {{4}}." },
  { id:"t3", name:"Follow Up",          category:"MARKETING",     status:"pending",
    body:"Hi {{1}}, just checking in! Have you had a chance to look at the products we discussed?" },
  { id:"t4", name:"Welcome Message",    category:"ONBOARDING",    status:"approved",
    body:"Welcome to {{1}}! 🎊 We're excited to have you. Reply anytime to chat with our team." },
  { id:"t5", name:"Delivery Update",    category:"TRANSACTIONAL", status:"approved",
    body:"Hi {{1}}, great news! Your order {{2}} is on its way 🚚 Expected delivery: {{3}}." },
];

const TABS = [
  { key:"chats",     icon:MessageSquare, label:"Chats"     },
  { key:"broadcast", icon:Users,         label:"Broadcast" },
  { key:"templates", icon:Zap,           label:"Templates" },
  { key:"settings",  icon:Settings,      label:"Settings"  },
];

export default function WhatsAppPage() {
  const [tab,        setTab]        = useState("chats");
  const [contacts,   setContacts]   = useState([]);
  const [chats,      setChats]      = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [message,    setMessage]    = useState("");
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [isLive,     setIsLive]     = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [newSearch,  setNewSearch]  = useState("");
  const [bcMsg,      setBcMsg]      = useState("");
  const [bcTpl,      setBcTpl]      = useState("");
  const [bcSent,     setBcSent]     = useState(false);
  const [settings,   setSettings]   = useState({ token:"", phoneId:"", verifyToken:"" });
  const [cfgSaving,  setCfgSaving]  = useState(false);
  const [cfgSaved,   setCfgSaved]   = useState(false);
  const endRef = useRef(null);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [activeChat?.messages?.length]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Load CRM contacts
      const cr = await api.get("/crm/contacts?limit=200").catch(() => null);
      if (cr) setContacts(safeArray(cr.data));

      // Load saved settings to know if configured
      const sr = await api.get("/whatsapp/settings").catch(() => null);
      if (sr?.data?.phoneId && sr?.data?.token) {
        setSettings({
          token:       sr.data.token       || "",
          phoneId:     sr.data.phoneId     || "",
          verifyToken: sr.data.verifyToken || "",
        });
        setIsLive(true);

        // Load real conversations only if configured
        const wr = await api.get("/whatsapp/conversations?limit=50").catch(() => null);
        if (wr) setChats(safeArray(wr.data));
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeChat || sending) return;
    const text = message.trim();
    const msg  = { id: Date.now().toString(), text, from:"me", time: new Date().toISOString(), status:"sent" };

    setChats(p => p.map(c => c.id === activeChat.id
      ? { ...c, messages:[...c.messages, msg], lastMsg:text, lastTime:msg.time } : c));
    setActiveChat(p => ({ ...p, messages:[...p.messages, msg] }));
    setMessage("");
    setSending(true);

    try {
      await api.post("/whatsapp/send", { to: activeChat.phone, message: text });
      setChats(p => p.map(c => c.id === activeChat.id
        ? { ...c, messages: c.messages.map(m => m.id === msg.id ? {...m, status:"delivered"} : m) } : c));
      setActiveChat(p => ({ ...p, messages: p.messages.map(m => m.id === msg.id ? {...m, status:"delivered"} : m) }));
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to send message. Check your WhatsApp API credentials.");
    } finally {
      setSending(false);
    }
  };

  const sendBroadcast = async () => {
    if (!bcMsg.trim() && !bcTpl) return;
    setSending(true);
    try {
      await api.post("/whatsapp/broadcast", {
        message:    bcMsg,
        templateId: bcTpl,
        recipients: contacts.map(c => c.phone).filter(Boolean),
      });
      setBcSent(true);
      setBcMsg(""); setBcTpl("");
      setTimeout(() => setBcSent(false), 4000);
    } catch (e) {
      alert(e?.response?.data?.message || "Broadcast failed. Check your WhatsApp API credentials in Settings.");
    } finally {
      setSending(false);
    }
  };

  const saveSettings = async () => {
    setCfgSaving(true);
    try {
      await api.post("/whatsapp/settings", settings);
      setIsLive(true);
      setCfgSaved(true);
      setTimeout(() => setCfgSaved(false), 2500);
      // Reload conversations now that we have credentials
      const wr = await api.get("/whatsapp/conversations?limit=50").catch(() => null);
      if (wr) setChats(safeArray(wr.data));
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to save settings.");
    } finally {
      setCfgSaving(false);
    }
  };

  const openContactChat = (c) => {
    const name = `${c.firstName||""} ${c.lastName||""}`.trim() || c.email;
    const exists = chats.find(ch => ch.id === c.id || ch.phone === c.phone);
    if (exists) {
      setActiveChat(exists);
    } else {
      const newChat = {
        id: c.id, name, phone: c.phone || "",
        unread: 0, lastMsg: "", lastTime: new Date().toISOString(), messages: [],
      };
      setChats(p => [newChat, ...p]);
      setActiveChat(newChat);
    }
    setShowNew(false);
    setTab("chats");
  };

  const totalUnread     = chats.reduce((s, c) => s + (c.unread || 0), 0);
  const filteredChats   = chats.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
  const filteredContacts = contacts.filter(c => c.phone).filter(c => {
    const name = `${c.firstName||""} ${c.lastName||""}`.trim();
    return name.toLowerCase().includes(newSearch.toLowerCase()) || c.phone?.includes(newSearch);
  });

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/whatsapp/webhook`
    : "https://yourapp.com/api/whatsapp/webhook";

  return (
    <div className="flex flex-col animate-fade-up" style={{ height:"calc(100vh - 128px)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="page-title">WhatsApp</h1>
          <p className="page-subtitle">
            {!isLive
              ? "Configure your WhatsApp Business API in Settings to get started"
              : `${chats.length} conversations · ${totalUnread} unread`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5"
            style={{
              background: isLive ? "var(--primary-dim)" : "rgba(234,179,8,0.1)",
              color:      isLive ? "var(--primary)"     : "#eab308",
              border:     `1px solid ${isLive ? "var(--primary)" : "rgba(234,179,8,0.3)"}`,
            }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: isLive ? "var(--primary)" : "#eab308" }}/>
            {isLive ? "Connected" : "Not configured"}
          </span>
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={13}/> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-shrink-0 overflow-x-auto pb-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap flex items-center gap-2"
              style={{
                background:  tab === t.key ? "var(--primary)" : "transparent",
                color:       tab === t.key ? "#fff" : "var(--text-muted)",
                borderColor: tab === t.key ? "var(--primary)" : "var(--border)",
              }}>
              <Icon size={13}/>
              {t.label}
              {t.key === "chats" && totalUnread > 0 && (
                <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background:"#ef4444", color:"#fff" }}>{totalUnread}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══ CHATS ══ */}
      {tab === "chats" && (
        !isLive ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="deji-card p-10 text-center max-w-md">
              <div className="text-5xl mb-4">💬</div>
              <h2 className="font-bold text-lg mb-2"
                style={{ fontFamily:"Syne,sans-serif", color:"var(--text-primary)" }}>
                Connect WhatsApp to start messaging
              </h2>
              <p className="text-sm mb-5" style={{ color:"var(--text-muted)" }}>
                Add your WhatsApp Business API credentials in Settings to send and receive messages directly from Deji.
              </p>
              <button onClick={() => setTab("settings")} className="btn-primary">
                Go to Settings →
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-72 flex-shrink-0 flex flex-col deji-card overflow-hidden">
              <div className="p-3 flex-shrink-0" style={{ borderBottom:"1px solid var(--border)" }}>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--text-muted)" }}/>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search conversations..." className="deji-input pl-9 text-sm py-2"/>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-sm" style={{ color:"var(--text-muted)" }}>Loading...</div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-3xl mb-2">💬</div>
                    <p className="text-sm" style={{ color:"var(--text-muted)" }}>No conversations yet</p>
                  </div>
                ) : filteredChats.map(chat => (
                  <div key={chat.id}
                    onClick={() => {
                      setActiveChat(chat);
                      setChats(p => p.map(c => c.id === chat.id ? {...c, unread:0} : c));
                    }}
                    className="flex items-center gap-3 p-3 cursor-pointer transition-all"
                    style={{
                      background:   activeChat?.id === chat.id ? "var(--primary-dim)" : "transparent",
                      borderBottom: "1px solid var(--border)",
                    }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background:"linear-gradient(135deg,#25D366,#128C7E)" }}>
                      {chat.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold truncate" style={{ color:"var(--text-primary)" }}>{chat.name}</p>
                        <span className="text-[10px] flex-shrink-0 ml-1" style={{ color:"var(--text-muted)" }}>
                          {timeAgo(chat.lastTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs truncate" style={{ color:"var(--text-muted)" }}>
                          {chat.lastMsg || "No messages yet"}
                        </p>
                        {chat.unread > 0 && (
                          <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                            style={{ background:"#25D366", color:"#fff" }}>{chat.unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 flex-shrink-0" style={{ borderTop:"1px solid var(--border)" }}>
                <button onClick={() => setShowNew(true)}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                  <Plus size={14}/> New Conversation
                </button>
              </div>
            </div>

            {/* Chat window */}
            <div className="flex-1 flex flex-col deji-card overflow-hidden min-w-0">
              {!activeChat ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl mb-3">💬</div>
                    <p className="font-bold mb-1" style={{ color:"var(--text-primary)" }}>Select a conversation</p>
                    <p className="text-sm" style={{ color:"var(--text-muted)" }}>
                      Choose from the left or start a new conversation
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 flex-shrink-0"
                    style={{ borderBottom:"1px solid var(--border)", background:"var(--bg-hover)" }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background:"linear-gradient(135deg,#25D366,#128C7E)" }}>
                      {activeChat.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>{activeChat.name}</p>
                      <p className="text-xs flex items-center gap-1" style={{ color:"var(--text-muted)" }}>
                        <Phone size={9}/> {activeChat.phone || "No phone"}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2"
                    style={{ background:"var(--bg-base)" }}>
                    {(activeChat.messages || []).length === 0 ? (
                      <div className="text-center py-8 text-sm" style={{ color:"var(--text-muted)" }}>
                        No messages yet — say hi! 👋
                      </div>
                    ) : (activeChat.messages || []).map(msg => (
                      <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-xs lg:max-w-sm px-3.5 py-2.5"
                          style={{
                            background:   msg.from === "me" ? "#25D366" : "var(--bg-card)",
                            color:        msg.from === "me" ? "#fff" : "var(--text-primary)",
                            borderRadius: msg.from === "me" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            border:       msg.from === "me" ? "none" : "1px solid var(--border)",
                          }}>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <div className={`flex items-center gap-1 mt-0.5 ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                            <span className="text-[10px] opacity-60">{timeAgo(msg.time)}</span>
                            {msg.from === "me" && (
                              msg.status === "read"
                                ? <CheckCheck size={11} className="opacity-80" style={{ color:"#a3e635" }}/>
                                : <CheckCheck size={11} className="opacity-60"/>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={endRef}/>
                  </div>

                  <div className="flex items-center gap-2 p-3 flex-shrink-0"
                    style={{ borderTop:"1px solid var(--border)", background:"var(--bg-surface)" }}>
                    <input value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Type a message..."
                      className="flex-1 deji-input text-sm py-2"/>
                    <button onClick={sendMessage} disabled={!message.trim() || sending}
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: message.trim() ? "#25D366" : "var(--bg-hover)",
                        color:      message.trim() ? "#fff"    : "var(--text-muted)",
                      }}>
                      {sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      )}

      {/* ══ BROADCAST ══ */}
      {tab === "broadcast" && (
        <div className="space-y-4 max-w-2xl overflow-y-auto flex-1">
          {!isLive && (
            <div className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background:"rgba(234,179,8,0.08)", border:"1px solid rgba(234,179,8,0.25)" }}>
              <AlertCircle size={16} style={{ color:"#eab308", marginTop:1, flexShrink:0 }}/>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color:"#eab308" }}>API not configured</p>
                <p className="text-xs" style={{ color:"#eab308" }}>
                  Go to the Settings tab and connect your WhatsApp Business API before sending broadcasts.
                </p>
              </div>
            </div>
          )}

          <div className="deji-card p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-1"
                style={{ fontFamily:"Syne,sans-serif", color:"var(--text-primary)" }}>
                Broadcast Message
              </h3>
              <p className="text-sm" style={{ color:"var(--text-muted)" }}>
                Send to all contacts with phone numbers simultaneously.
              </p>
            </div>

            <div>
              <label className="deji-label">Use Approved Template</label>
              <select value={bcTpl} onChange={e => setBcTpl(e.target.value)} className="deji-input">
                <option value="">Write a custom message</option>
                {DEFAULT_TEMPLATES.filter(t => t.status === "approved").map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {bcTpl && (
              <div className="p-3 rounded-xl" style={{ background:"var(--bg-hover)" }}>
                <p className="text-xs font-bold mb-1.5" style={{ color:"var(--text-muted)" }}>TEMPLATE PREVIEW</p>
                <p className="text-sm leading-relaxed" style={{ color:"var(--text-primary)", fontStyle:"italic" }}>
                  "{DEFAULT_TEMPLATES.find(t => t.id === bcTpl)?.body}"
                </p>
              </div>
            )}

            {!bcTpl && (
              <div>
                <label className="deji-label">Message *</label>
                <textarea value={bcMsg} onChange={e => setBcMsg(e.target.value)}
                  className="deji-input resize-none" rows={4}
                  placeholder="Write your broadcast message here..."/>
                <p className="text-[10px] mt-1" style={{ color:"var(--text-muted)" }}>
                  {bcMsg.length}/1024 characters
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ background:"var(--bg-hover)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>Recipients</p>
                <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                  {contacts.filter(c => c.phone).length} contacts with phone numbers
                </p>
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-lg"
                style={{ background:"var(--primary-dim)", color:"var(--primary)" }}>
                {contacts.filter(c => c.phone).length}
              </span>
            </div>

            {bcSent && (
              <div className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background:"var(--primary-dim)", border:"1px solid var(--primary)" }}>
                <Check size={14} style={{ color:"var(--primary)" }}/>
                <p className="text-sm font-semibold" style={{ color:"var(--primary)" }}>Broadcast sent!</p>
              </div>
            )}

            <button onClick={sendBroadcast} disabled={sending || (!bcMsg.trim() && !bcTpl) || !isLive}
              className="btn-primary flex items-center gap-2"
              style={{ opacity: (!isLive || (!bcMsg.trim() && !bcTpl)) ? 0.4 : 1 }}>
              {sending ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
              {sending ? "Sending..." : "Send Broadcast"}
            </button>
          </div>
        </div>
      )}

      {/* ══ TEMPLATES ══ */}
      {tab === "templates" && (
        <div className="space-y-3 max-w-2xl overflow-y-auto flex-1">
          <p className="text-sm" style={{ color:"var(--text-muted)" }}>
            Pre-approved message templates for common business scenarios.
          </p>
          {DEFAULT_TEMPLATES.map(t => (
            <div key={t.id} className="deji-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm" style={{ color:"var(--text-primary)" }}>{t.name}</p>
                  <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color:"var(--text-muted)" }}>
                    {t.category}
                  </span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                  t.status === "approved" ? "badge-green" : "badge-orange"
                }`}>{t.status}</span>
              </div>
              <p className="text-sm p-3 rounded-xl leading-relaxed"
                style={{ background:"var(--bg-hover)", color:"var(--text-muted)", fontStyle:"italic" }}>
                "{t.body}"
              </p>
              <button onClick={() => { setTab("broadcast"); setBcTpl(t.id); setBcMsg(""); }}
                className="text-xs flex items-center gap-1.5 font-semibold"
                style={{ color:"var(--primary)" }}>
                <Send size={11}/> Use in Broadcast <ChevronRight size={11}/>
              </button>
            </div>
          ))}
          <div className="p-3 rounded-xl" style={{ background:"var(--primary-dim)", border:"1px solid var(--primary)" }}>
            <p className="text-xs" style={{ color:"var(--primary)" }}>
              💡 To add custom templates, connect your WhatsApp Business API in Settings, then submit templates via Meta Business Manager for approval.
            </p>
          </div>
        </div>
      )}

      {/* ══ SETTINGS ══ */}
      {tab === "settings" && (
        <div className="space-y-4 max-w-xl overflow-y-auto flex-1">
          <div className="deji-card p-6 space-y-5">
            <div>
              <h3 className="font-bold mb-1"
                style={{ fontFamily:"Syne,sans-serif", color:"var(--text-primary)" }}>
                WhatsApp Business API
              </h3>
              <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                Connect your Meta-verified WhatsApp Business number to send and receive real messages.
              </p>
            </div>

            <div className="p-4 rounded-2xl space-y-2" style={{ background:"var(--bg-hover)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:"var(--text-muted)" }}>Setup Guide</p>
              {[
                "Go to developers.facebook.com → Create App → Business type",
                "Add WhatsApp product → Get your Phone Number ID",
                "Generate a Permanent Access Token (not the temporary one)",
                "Paste your Webhook URL below in Meta Developer Console",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background:"var(--primary-dim)", color:"var(--primary)" }}>{i+1}</span>
                  <p className="text-xs" style={{ color:"var(--text-muted)" }}>{step}</p>
                </div>
              ))}
            </div>

            <div>
              <label className="deji-label">Permanent Access Token *</label>
              <input type="password" value={settings.token}
                onChange={e => setSettings(p => ({...p, token:e.target.value}))}
                className="deji-input font-mono" placeholder="EAAxxxxxxxxxxxxxxxxxx"/>
            </div>

            <div>
              <label className="deji-label">Phone Number ID *</label>
              <input value={settings.phoneId}
                onChange={e => setSettings(p => ({...p, phoneId:e.target.value}))}
                className="deji-input font-mono" placeholder="1234567890123456"/>
            </div>

            <div>
              <label className="deji-label">Webhook Verify Token</label>
              <input value={settings.verifyToken}
                onChange={e => setSettings(p => ({...p, verifyToken:e.target.value}))}
                className="deji-input font-mono" placeholder="my-secret-verify-token"/>
            </div>

            <div className="p-3 rounded-xl" style={{ background:"var(--bg-hover)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color:"var(--text-muted)" }}>
                Your Webhook URL
              </p>
              <p className="text-xs font-mono break-all" style={{ color:"var(--primary)" }}>{webhookUrl}</p>
              <p className="text-[10px] mt-1" style={{ color:"var(--text-muted)" }}>
                Paste this in Meta Developer Console → WhatsApp → Configuration → Webhook URL
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={saveSettings}
                disabled={cfgSaving || !settings.token || !settings.phoneId}
                className="btn-primary flex items-center gap-2"
                style={{ opacity: (!settings.token || !settings.phoneId) ? 0.4 : 1 }}>
                {cfgSaving ? <Loader2 size={14} className="animate-spin"/>
                  : cfgSaved ? <Check size={14}/>
                  : <Settings size={14}/>}
                {cfgSaving ? "Saving..." : cfgSaved ? "Saved!" : "Save & Connect"}
              </button>
              {isLive && (
                <span className="text-sm flex items-center gap-1.5" style={{ color:"var(--primary)" }}>
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
                  Connected
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowNew(false)}>
          <div className="deji-card p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color:"var(--text-primary)" }}>New Conversation</h3>
              <button onClick={() => setShowNew(false)} style={{ color:"var(--text-muted)" }}><X size={16}/></button>
            </div>
            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--text-muted)" }}/>
              <input value={newSearch} onChange={e => setNewSearch(e.target.value)}
                placeholder="Search contacts..." className="deji-input pl-9 text-sm"/>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredContacts.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color:"var(--text-muted)" }}>
                  {contacts.filter(c => c.phone).length === 0
                    ? "No contacts with phone numbers. Add phone numbers in your CRM first."
                    : "No contacts match your search."}
                </p>
              ) : filteredContacts.slice(0, 20).map(c => {
                const name = `${c.firstName||""} ${c.lastName||""}`.trim() || c.email;
                return (
                  <div key={c.id} onClick={() => openContactChat(c)}
                    className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                    style={{ background:"var(--bg-hover)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background:"linear-gradient(135deg,#25D366,#128C7E)" }}>
                      {name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{name}</p>
                      <p className="text-xs" style={{ color:"var(--text-muted)" }}>{c.phone}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}