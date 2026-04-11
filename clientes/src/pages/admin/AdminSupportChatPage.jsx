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

export function AdminSupportChatPage() {
  const { user } = useAuth();
  const adminId = Number(user?.id);
  const [threads, setThreads] = useState([]);
  const [selectedPid, setSelectedPid] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const refreshThreads = useCallback(async () => {
    setLoadingThreads(true);
    setError("");
    try {
      const data = await supportChatService.adminThreads();
      const list = Array.isArray(data) ? data : [];
      setThreads(list);
    } catch (e) {
      setError(e?.message || "Failed to load threads");
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const loadThread = useCallback(async (passengerUserId) => {
    if (!passengerUserId) {
      setMessages([]);
      return;
    }
    setLoadingMsgs(true);
    setError("");
    try {
      const data = await supportChatService.adminThreadMessages(passengerUserId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load messages");
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    if (selectedPid) loadThread(selectedPid);
  }, [selectedPid, loadThread]);

  useEffect(() => {
    const onRt = (e) => {
      if (e.detail?.type !== REALTIME_SUPPORT_THREAD_MESSAGE) return;
      const p = e.detail.payload;
      if (!p) return;
      refreshThreads();
      if (Number(p.passenger_user_id) === Number(selectedPid)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === p.id)) return prev;
          return [...prev, p];
        });
      }
    };
    window.addEventListener(REALTIME_DISPATCH_EVENT, onRt);
    return () => window.removeEventListener(REALTIME_DISPATCH_EVENT, onRt);
  }, [selectedPid, refreshThreads]);

  function sendReply() {
    const t = text.trim();
    const pid = selectedPid;
    if (!t || !pid || sending) return;
    const socket = getBoundRealtimeSocket();
    if (!socket?.connected) {
      setError("Live connection not ready.");
      return;
    }
    setSending(true);
    setError("");
    socket.emit("support:reply", { passengerUserId: pid, text: t }, (res) => {
      setSending(false);
      if (res?.ok && res?.message) {
        setText("");
        setMessages((prev) => {
          const m = res.message;
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
        refreshThreads();
      } else {
        setError(res?.message || "Could not send");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl lg:text-2xl">
          Support chat
        </h2>
        <p className="text-sm text-slate-600 dark:text-primary-400/80">
          Live conversations with passengers. New passenger lines appear in real time.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <Card title="Passengers" className="!p-0 overflow-hidden">
          {loadingThreads ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : threads.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
              No threads yet. When a passenger sends a message from Support chat, their thread
              appears here.
            </p>
          ) : (
            <ul className="max-h-[min(60vh,520px)] divide-y divide-primary-900/10 overflow-y-auto dark:divide-primary-900/40">
              {threads.map((row) => {
                const pid = Number(row.passenger_user_id);
                const active = Number(selectedPid) === pid;
                return (
                  <li key={pid}>
                    <button
                      type="button"
                      onClick={() => setSelectedPid(pid)}
                      className={`w-full px-3 py-3 text-left text-sm transition-colors ${
                        active
                          ? "bg-emerald-100/90 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-50"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <div className="font-medium text-slate-900 dark:text-white">
                        {row.passenger_name || `User #${pid}`}
                      </div>
                      <div className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                        {row.last_body || "—"}
                      </div>
                      <div className="mt-0.5 text-[0.65rem] text-slate-500">
                        {formatDate(row.last_at)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={selectedPid ? `Thread · passenger #${selectedPid}` : "Select a thread"} className="!p-0 overflow-hidden">
          {!selectedPid ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
              Choose a passenger on the left to read and reply.
            </p>
          ) : loadingMsgs ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="max-h-[min(45vh,400px)] space-y-3 overflow-y-auto p-4">
                {messages.map((m) => {
                  const mine = Number(m.from_user_id) === adminId;
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
                        {mine ? "You" : "Passenger"} · {formatDate(m.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 border-t border-primary-900/15 p-3 dark:border-primary-900/40 sm:flex-row sm:items-end">
                <textarea
                  className="min-h-[4rem] w-full rounded-lg border border-primary-900/20 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-primary-900/50 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Reply to this passenger…"
                  value={text}
                  maxLength={2000}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                />
                <Button
                  type="button"
                  className="shrink-0"
                  disabled={sending || !text.trim()}
                  onClick={sendReply}
                >
                  {sending ? "Sending…" : "Send reply"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
