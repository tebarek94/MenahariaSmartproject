import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { supportChatService } from "@/services/supportChat.service.js";
import { getBoundRealtimeSocket } from "@/services/realtimeSocket.js";
import {
  REALTIME_DISPATCH_EVENT,
  REALTIME_SUPPORT_THREAD_MESSAGE,
} from "@/utils/constants.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { formatDate } from "@/utils/format.js";

export function PassengerSupportChatPage() {
  const { user } = useAuth();
  const myId = Number(user?.id);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [socketHint, setSocketHint] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await supportChatService.myMessages();
      const list = Array.isArray(data) ? data : [];
      setMessages(list);
    } catch (e) {
      setError(e?.message || "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onRt = (e) => {
      if (e.detail?.type !== REALTIME_SUPPORT_THREAD_MESSAGE) return;
      const p = e.detail.payload;
      if (!p || Number(p.passenger_user_id) !== myId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === p.id)) return prev;
        return [...prev, p];
      });
    };
    window.addEventListener(REALTIME_DISPATCH_EVENT, onRt);
    return () => window.removeEventListener(REALTIME_DISPATCH_EVENT, onRt);
  }, [myId]);

  useEffect(() => {
    const s = getBoundRealtimeSocket();
    setSocketHint(s?.connected ? "" : "Connecting to live chat…");
    const id = window.setInterval(() => {
      const sk = getBoundRealtimeSocket();
      setSocketHint(sk?.connected ? "" : "Connecting to live chat…");
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  function send() {
    const t = text.trim();
    if (!t || sending) return;
    const socket = getBoundRealtimeSocket();
    if (!socket?.connected) {
      setError("Live connection not ready. Wait a moment or refresh.");
      return;
    }
    setSending(true);
    setError("");
    socket.emit("support:send", { text: t }, (res) => {
      setSending(false);
      if (res?.ok && res?.message) {
        setText("");
        setMessages((prev) => {
          const m = res.message;
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
      } else {
        setError(res?.message || "Could not send");
      }
    });
  }

  if (loading && !messages.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>

        {/* animate the text add animate color change     */}
        <div className="animate-pulse"> 
          <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl"><span className="animate-pulse">Support chat</span></h1>
        </div>
        {socketHint ? (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{socketHint}</p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <Card title="Conversation" className="!p-0 overflow-hidden">
        <div className="max-h-[min(50vh,420px)] space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No messages yet. Say hello below — admins will see your thread instantly.
            </p>
          ) : (
            messages.map((m) => {
              const mine = Number(m.from_user_id) === myId;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm ${
                    mine
                      ? "ml-8 bg-emerald-100 text-emerald-950 dark:bg-emerald-900/35 dark:text-emerald-50"
                      : "mr-8 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <span className="text-[0.65rem] opacity-70">
                    {mine ? "You" : "Admin"} · {formatDate(m.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-primary-900/15 p-3 dark:border-primary-900/40 sm:flex-row sm:items-end">
          <textarea
            className="min-h-[4rem] w-full rounded-lg border border-primary-900/20 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-primary-900/50 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Type your message…"
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button
            type="button"
            className="shrink-0"
            disabled={sending || !text.trim()}
            onClick={send}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
