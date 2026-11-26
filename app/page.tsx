"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SearchResult = {
  title: string;
  snippet: string;
  url: string;
};

const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const HISTORY_KEY = "project-gpt-chat-v1";
const MAX_CONTEXT_MESSAGES = 12;

export default function Home() {
  const engine = useRef<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileNotice, setFileNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      localStorage.removeItem(HISTORY_KEY);
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (historyLoaded) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages, historyLoaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startLocalAI() {
    if (modelLoading || modelReady) return;
    setModelLoading(true);
    setError("");
    setModelProgress("Checking browser support…");

    try {
      if (!("gpu" in navigator)) {
        throw new Error(
          "WebGPU is unavailable in this browser. Try an up-to-date Chrome or Edge browser with hardware acceleration enabled."
        );
      }

      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const createdEngine = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report: { text?: string }) => {
          setModelProgress(report.text || "Downloading and preparing the model…");
        },
      });

      engine.current = createdEngine;
      setModelReady(true);
      setModelProgress("Local AI is ready.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start the local AI.";
      setError(message);
    } finally {
      setModelLoading(false);
    }
  }

  async function sendMessage(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || !engine.current || busy) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: prompt },
    ];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setError("");

    try {
      const context = nextMessages.slice(-MAX_CONTEXT_MESSAGES);
      const stream = await engine.current.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are Project GPT, a friendly and careful study tutor. Help the student learn. Explain reasoning clearly, show maths working step by step, and distinguish facts from guesses. If a question depends on current information, say that a web search may be needed. Do not invent citations or claim to have browsed the web.",
          },
          ...context,
        ],
        temperature: 0.65,
        max_tokens: 900,
        stream: true,
      });

      let answer = "";
      for await (const chunk of stream) {
        answer += chunk.choices?.[0]?.delta?.content ?? "";
        setMessages([...nextMessages, { role: "assistant", content: answer }]);
      }
      if (!answer) {
        setMessages([
          ...nextMessages,
          { role: "assistant", content: "I couldn't generate a response. Try again." },
        ]);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown model error.";
      setMessages([
        ...nextMessages,
        { role: "assistant", content: `The local model encountered an error: ${message}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function readImage(file: File) {
    setFileBusy(true);
    setFileNotice("Reading text from your image…");
    setError("");

    try {
      const Tesseract = await import("tesseract.js");
      const worker = await Tesseract.createWorker("eng");
      const result = await worker.recognize(file);
      await worker.terminate();

      const extracted = result.data.text.trim();
      if (!extracted) {
        throw new Error("No readable printed text was detected. Handwriting and diagrams may not extract accurately.");
      }

      setInput((current) =>
        `${current}${current ? "\n\n" : ""}Please help me understand this homework. Explain the steps and show the working:\n\n${extracted}`
      );
      setFileNotice("Text extracted. Check the message box, then press Send.");
    } catch (e) {
      setFileNotice("");
      setError(e instanceof Error ? e.message : "Image reading failed.");
    } finally {
      setFileBusy(false);
    }
  }

  async function readTextFile(file: File) {
    setFileBusy(true);
    setError("");
    try {
      const text = await file.text();
      if (!text.trim()) throw new Error("That file appears to be empty.");
      setInput((current) =>
        `${current}${current ? "\n\n" : ""}Please help me with this document:\n\n${text.slice(0, 50000)}`
      );
      setFileNotice(
        text.length > 50000
          ? "First 50,000 characters added. The file is larger than this version's text-import limit."
          : "Document text added. Check the message box, then press Send."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setFileBusy(false);
    }
  }

  async function handleFile(file?: File) {
    if (!file) return;
    setFileNotice("");
    if (file.size > 15 * 1024 * 1024) {
      setError("For this first version, choose a file smaller than 15 MB.");
      return;
    }

    if (file.type.startsWith("image/")) {
      await readImage(file);
    } else if (
      file.type === "text/plain" ||
      file.name.toLowerCase().endsWith(".txt") ||
      file.name.toLowerCase().endsWith(".md") ||
      file.name.toLowerCase().endsWith(".csv")
    ) {
      await readTextFile(file);
    } else {
      setError("This version supports images and TXT, MD or CSV files. PDF and Word support can be added next.");
    }
  }

  async function searchWeb() {
    const query = searchQuery.trim();
    if (!query) return;
    setSearching(true);
    setSearchResults([]);
    setError("");

    try {
      const endpoint =
        "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
        encodeURIComponent(query) +
        "&format=json&origin=*&srlimit=6";
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Search service returned an error.");
      const data = await response.json();

      const results: SearchResult[] = (data.query?.search ?? []).map((item: any) => ({
        title: item.title,
        snippet: String(item.snippet ?? "").replace(/<[^>]*>/g, ""),
        url:
          "https://en.wikipedia.org/wiki/" +
          encodeURIComponent(String(item.title).replace(/ /g, "_")),
      }));
      setSearchResults(results);
      if (!results.length) setFileNotice("No Wikipedia results found. Try different keywords.");
    } catch {
      setError("Website search failed. Check your internet connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  function clearChat() {
    if (!window.confirm("Clear this conversation from this browser?")) return;
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">✦ Project GPT</a>
        <button className="new-chat" onClick={clearChat}>＋ New conversation</button>

        <div className="sidebar-section">
          <span className="eyebrow">LOCAL AI</span>
          <span className={modelReady ? "device-state ready" : "device-state"}>
            {modelReady ? "● Running on this device" : "○ Not loaded"}
          </span>
        </div>
        <div className="sidebar-section">
          <span className="eyebrow">PRIVACY</span>
          <span className="muted">Chat messages are processed in your browser. Search queries go to Wikipedia when you use the finder.</span>
        </div>
        <div className="sidebar-footer">Project GPT · Free Edition</div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div>
            <strong>Project GPT</strong>
            <span className="model-caption">Local study assistant</span>
          </div>
          <span className={modelReady ? "pill online" : "pill"}>
            {modelReady ? "AI ready" : "AI not loaded"}
          </span>
        </header>

        <div className="page-content">
          {!modelReady && (
            <section className="welcome">
              <div className="sparkle">✦</div>
              <h1>Your homework, understood.</h1>
              <p>Run an AI model on your own laptop instead of paying for an AI API.</p>
              <button className="primary-button" onClick={startLocalAI} disabled={modelLoading}>
                {modelLoading ? "Preparing local AI…" : "Start local AI"}
              </button>
              {modelProgress && <p className="progress-text">{modelProgress}</p>}
              <p className="fine-print">
                First launch downloads the model. It may be a large download and can take several minutes.
                Keep this tab open while it loads.
              </p>
              <p className="fine-print">Requires a supported browser and WebGPU. Performance depends on the visitor&apos;s device.</p>
            </section>
          )}

          {modelReady && (
            <>
              <section className="chat-area">
                {messages.length === 0 && (
                  <div className="empty-state">
                    <h1>What are we studying?</h1>
                    <p>Ask a question, upload a homework photo, or import a text document.</p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <article className={`message ${message.role}`} key={index}>
                    <div className="message-label">{message.role === "user" ? "You" : "Project GPT"}</div>
                    <div className="message-body">
                      {message.content || (busy && index === messages.length - 1 ? "Thinking…" : "")}
                    </div>
                  </article>
                ))}
                <div ref={bottomRef} />
              </section>

              <section className="composer">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Ask Project GPT anything…"
                  rows={3}
                  aria-label="Message"
                />
                <div className="composer-bottom">
                  <label className="upload-button">
                    ＋ Add homework
                    <input
                      type="file"
                      accept="image/*,.txt,.md,.csv,text/plain,text/markdown,text/csv"
                      hidden
                      disabled={fileBusy || busy}
                      onChange={(event) => {
                        void handleFile(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button className="primary-button send-button" onClick={() => void sendMessage()} disabled={busy || !input.trim()}>
                    {busy ? "Thinking…" : "Send ↑"}
                  </button>
                </div>
              </section>
              {fileNotice && <p className="notice">{fileNotice}</p>}
            </>
          )}

          {error && <p className="error-box">{error}</p>}

          <section className="research-panel">
            <div>
              <h2>⌕ Smart website finder</h2>
              <p>Search Wikipedia for background information and reference pages.</p>
            </div>
            <div className="search-row">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void searchWeb();
                }}
                placeholder="Search a topic…"
                aria-label="Search topic"
              />
              <button onClick={() => void searchWeb()} disabled={searching}>
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
            {searchResults.map((result) => (
              <a className="search-result" href={result.url} target="_blank" rel="noreferrer" key={result.url}>
                <strong>{result.title}</strong>
                <span>{result.snippet}</span>
                <small>Open Wikipedia ↗</small>
              </a>
            ))}
          </section>

          <footer className="page-footer">
            Local AI can make mistakes. Check important homework answers against your class materials.
          </footer>
        </div>
      </section>
    </main>
  );
}
