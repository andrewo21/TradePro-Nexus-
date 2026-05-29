"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MessageCircle, Send, ArrowLeft, Loader2, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

interface Thread { id: string; other_id: string; other_type: string; last_message_at: string; }
interface Message { id: string; sender_user_id: string; content: string; read_at: string | null; created_at: string; }

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isGC, setIsGC] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Pre-fill from query params (from feed DM button)
  const toId = searchParams.get("to");
  const toType = searchParams.get("type");
  const toName = searchParams.get("name") ?? "Contact";

  useEffect(() => {
    getSupabase()?.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsGC(data.user?.user_metadata?.role === "gc");
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/messages").then(r => r.json()).then(d => {
      setThreads(d.threads ?? []);
      setLoading(false);
      // If redirected with a recipient, start/open that thread
      if (toId) {
        const existing = d.threads?.find((t: Thread) => t.other_id === toId);
        if (existing) loadThread(existing.id);
      }
    });
  }, [user, toId]);

  async function loadThread(threadId: string) {
    setActiveThread(threadId);
    const res = await fetch(`/api/messages/${threadId}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function sendNew() {
    if (!toId || !reply.trim()) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ other_id: toId, other_type: toType ?? "profile", content: reply }),
    });
    const data = await res.json();
    if (data.thread_id) {
      setReply("");
      await loadThread(data.thread_id);
      // Refresh threads list
      fetch("/api/messages").then(r => r.json()).then(d => setThreads(d.threads ?? []));
    }
    setSending(false);
  }

  async function sendReply() {
    if (!activeThread || !reply.trim()) return;
    setSending(true);
    await fetch(`/api/messages/${activeThread}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply }),
    });
    setReply("");
    await loadThread(activeThread);
    setSending(false);
  }

  if (!user) return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100"><Navbar /><div className="max-w-lg mx-auto px-4 pt-24 text-center"><p className="text-slate-400 mb-4">Sign in to access messages.</p><Link href="/login" className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors">Sign In</Link></div></div>
  );

  if (!isGC) return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100"><Navbar /><div className="max-w-lg mx-auto px-4 pt-24 text-center">
      <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
      <h1 className="text-xl font-black text-white mb-2">GC Feature</h1>
      <p className="text-slate-400 mb-4">Direct messaging is available to GC subscribers.</p>
      <Link href="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors">View GC Plans</Link>
    </div></div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100"><Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-8">
        <h1 className="text-xl font-black text-white mb-6 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-blue-400" /> Messages</h1>

        <div className="grid md:grid-cols-3 gap-4 h-[60vh]">
          {/* Thread list */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
            {/* New message target (from feed redirect) */}
            {toId && !activeThread && (
              <div className="p-3 bg-blue-950/40 border-b border-blue-800/40">
                <p className="text-xs text-blue-400 font-semibold">New message to {toName}</p>
              </div>
            )}
            {loading ? <div className="p-4 text-slate-500 text-sm">Loading…</div> :
              threads.length === 0 ? <div className="p-4 text-slate-500 text-sm">No conversations yet.</div> :
                threads.map(t => (
                  <button key={t.id} onClick={() => loadThread(t.id)} className={`w-full text-left px-4 py-3 border-b border-slate-700/40 hover:bg-slate-700/40 transition-colors ${activeThread === t.id ? "bg-slate-700/40" : ""}`}>
                    <p className="text-sm font-semibold text-white truncate">{t.other_type === "company" ? "Company" : "Trade Pro"}</p>
                    <p className="text-xs text-slate-500">{new Date(t.last_message_at).toLocaleDateString()}</p>
                  </button>
                ))
            }
          </div>

          {/* Message pane */}
          <div className="md:col-span-2 flex flex-col bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
            {activeThread ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender_user_id === user?.id ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${m.sender_user_id === user?.id ? "bg-blue-700 text-white" : "bg-slate-700 text-slate-100"}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="border-t border-slate-700/50 p-3 flex gap-2">
                  <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }} placeholder="Type a message…" className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </>
            ) : toId ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-700/50">
                  <p className="text-sm font-semibold text-white">New conversation with {toName}</p>
                </div>
                <div className="flex-1" />
                <div className="border-t border-slate-700/50 p-3 flex gap-2">
                  <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendNew(); } }} placeholder="Type your first message…" className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" autoFocus />
                  <button onClick={sendNew} disabled={sending || !reply.trim()} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Select a conversation</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return <Suspense fallback={null}><MessagesContent /></Suspense>;
}
