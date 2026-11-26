"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; messages: Message[]; updatedAt: number };

const starter: Chat = { id: "welcome", title: "New chat", messages: [], updatedAt: Date.now() };

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([starter]);
  const [activeId, setActiveId] = useState("welcome");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = chats.find((c) => c.id === activeId) ?? chats[0];

  useEffect(() => {
    try {
      const saved = localStorage.getItem("project-gpt-chats");
      if (saved) {
        const parsed = JSON.parse(saved) as Chat[];
        if (Array.isArray(parsed) && parsed.length) {
          setChats(parsed);
          setActiveId(parsed[0].id);
        }
      }
      setDark(localStorage.getItem("project-gpt-theme") !== "light");
    } catch { /* Ignore invalid local browser data. */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("project-gpt-chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem("project-gpt-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, busy]);

  function updateMessages(id: string, messages: Message[]) {
    setChats((old) => old.map((c) => c.id === id ? {
      ...c, messages, title: c.messages.length ? c.title : (messages[0]?.content.slice(0, 32) || "New chat"),
      updatedAt: Date.now()
    } : c));
  }

  function newChat() {
    const chat = { ...starter, id: crypto.randomUUID(), updatedAt: Date.now() };
    setChats((old) => [chat, ...old]);
    setActiveId(chat.id);
    setPrompt("");
    inputRef.current?.focus();
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = prompt.trim();
    if (!text || busy) return;

    let chat = active;
    if (!chat) {
      chat = { ...starter, id: crypto.randomUUID() };
      setChats([chat]);
      setActiveId(chat.id);
    }
    const nextMessages: Message[] = [...chat.messages, { role: "user", content: text }];
    updateMessages(chat.id, [...nextMessages, { role: "assistant", content: "" }]);
    setPrompt("");
    setBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }
      if (!response.body) throw new Error("Your browser could not read the response stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        updateMessages(chat.id, [...nextMessages, { role: "assistant", content: answer }]);
      }
      if (!answer) updateMessages(chat.id, [...nextMessages, { role: "assistant", content: "I didn't receive any text. Please try again." }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      updateMessages(chat.id, [...nextMessages, { role: "assistant", content: `**Error:** ${message}` }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function deleteChat(id: string) {
    const remaining = chats.filter((c) => c.id !== id);
    const next = remaining.length ? remaining : [{ ...starter, id: crypto.randomUUID() }];
    setChats(next);
    if (activeId === id) setActiveId(next[0].id);
  }

  return (
    <main className={dark ? "app dark" : "app light"}>
      <aside className={`sidebar ${sidebarOpen ? "" : "closed"}`}>
        <div className="brand"><div className="brand-mark">✳</div><span>Project GPT</span></div>
        <button className="new-chat" onClick={newChat}>＋ <span>New chat</span></button>
        <div className="history-label">YOUR CHATS</div>
        <div className="history">
          {chats.map((chat) => (
            <div className={`history-row ${chat.id === activeId ? "selected" : ""}`} key={chat.id}>
              <button className="history-item" onClick={() => setActiveId(chat.id)} title={chat.title}>
                <span className="history-icon">▤</span><span>{chat.title}</span>
              </button>
              <button className="delete-chat" onClick={() => deleteChat(chat.id)} aria-label="Delete chat">×</button>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <button className="side-action" onClick={() => setDark(!dark)}>{dark ? "☀" : "☾"} <span>Switch to {dark ? "light" : "dark"} mode</span></button>
          <div className="profile"><div className="avatar">G</div><div><strong>Guest</strong><small>Personal workspace</small></div></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button className="icon-button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">☰</button>
          <div className="model-label">Project GPT <span>▾</span></div>
          <div className="topbar-right"><span className="status-dot" /> AI assistant</div>
        </header>

        <div className="conversation">
          {active?.messages.length ? (
            <div className="messages">
              {active.messages.map((message, index) => (
                <article className={`message ${message.role}`} key={index}>
                  <div className="message-avatar">{message.role === "user" ? "Y" : "✳"}</div>
                  <div className="message-content">
                    <div className="message-name">{message.role === "user" ? "You" : "Project GPT"}</div>
                    {message.content ? (
                      <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>
                    ) : <div className="typing"><i/><i/><i/></div>}
                    {message.role === "assistant" && message.content && (
                      <button className="copy-button" onClick={() => navigator.clipboard.writeText(message.content)}>▢ Copy</button>
                    )}
                  </div>
                </article>
              ))}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="welcome">
              <div className="welcome-symbol">✳</div>
              <h1>Where should we start?</h1>
              <p>Your ideas, questions and rabbit holes are welcome.</p>
              <div className="suggestions">
                {["Explain something complicated simply", "Help me write or improve some code", "Give me ideas for a project", "Help me study for a test"].map((s) => (
                  <button key={s} onClick={() => setPrompt(s)}>{s}<span>↗</span></button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="composer-wrap">
          <form className="composer" onSubmit={sendMessage}>
            <textarea ref={inputRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Message Project GPT..." rows={1} maxLength={12000} />
            <div className="composer-footer">
              <span className="hint">↵ Send · Shift + ↵ New line</span>
              <button className="send-button" type="submit" disabled={!prompt.trim() || busy} aria-label="Send message">{busy ? "…" : "↑"}</button>
            </div>
          </form>
          <p className="disclaimer">Project GPT can make mistakes. Check important information.</p>
        </div>
      </section>
    </main>
  );
}
