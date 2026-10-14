import { ConfidenceBadge, IntentBadge } from "@/components/opspilot/badges";
import { SourceList } from "@/components/opspilot/common";
import { askCopilot, type ChatAnswer } from "@/lib/opspilot/mockAi";
import { Bot, Loader2, SendHorizonal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

type Message =
  | { id: string; role: "user"; content: string; ts: number }
  | { id: string; role: "ai"; ts: number } & ChatAnswer;

const SUGGESTIONS = [
  "What is our SLA policy for premium customers?",
  "Show me order ORD-48321 status",
  "Which orders are at risk of SLA breach?",
  "What is the escalation procedure for delayed orders?",
];

function AiAvatar() {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"
      style={{
        boxShadow:
          "inset 2px 2px 4px rgb(0 0 0 / 0.08), inset -2px -2px 5px rgb(255 255 255 / 0.7)",
      }}
    >
      <Sparkles className="size-4" />
    </span>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: question, ts: Date.now() },
    ]);
    setInput("");
    setLoading(true);
    try {
      const answer = await askCopilot(question);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "ai", ts: Date.now(), ...answer },
      ]);
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || "Unable to connect to the copilot. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-4">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="clay-scroll flex-1 overflow-y-auto rounded-[28px] p-4 sm:p-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <span
              className="flex size-16 items-center justify-center rounded-[24px] bg-primary text-primary-foreground"
              style={{
                boxShadow:
                  "10px 12px 24px -10px rgb(74 58 40 / 0.35), inset 2px 2px 5px rgb(255 255 255 / 0.4), inset -3px -4px 8px rgb(0 0 0 / 0.25)",
              }}
            >
              <Bot className="size-7" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold">
                How can I help you today?
              </h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Ask about policies, SOPs, orders or live exceptions — every
                answer is grounded in your documents and operational data, with
                sources attached.
              </p>
            </div>
            <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="clay-sm clay-btn rounded-2xl bg-card px-4 py-3 text-left text-xs leading-5 font-medium transition-transform hover:-translate-y-0.5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex flex-col items-end gap-1">
                  <div className="clay-sm max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm leading-6 text-primary-foreground">
                    {m.content}
                  </div>
                  <span className="px-1 text-[10px] text-muted-foreground">
                    {new Date(m.ts).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-3">
                  <AiAvatar />
                  <div className="clay max-w-[92%] rounded-3xl rounded-tl-lg p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <IntentBadge intent={m.intent} />
                      <ConfidenceBadge confidence={m.confidence} />
                    </div>
                    <div className="text-sm leading-relaxed text-foreground">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="font-display text-lg font-bold mt-3 mb-1.5 text-foreground">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="font-display text-base font-bold mt-3 mb-1.5 text-foreground">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="font-display text-sm font-bold mt-3 mb-1 text-foreground flex items-center gap-1.5">
                              {children}
                            </h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className="font-display text-xs font-bold mt-2 mb-1 text-foreground">
                              {children}
                            </h4>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2.5 last:mb-0 leading-6">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="my-2 ml-4 list-disc space-y-1 text-foreground/90">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="my-2 ml-4 list-decimal space-y-1 text-foreground/90">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-6">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-foreground/90">
                              {children}
                            </em>
                          ),
                          code: ({ className, children, ...props }: any) => {
                            const isBlock = !props.inline && typeof children === "string" && children.includes("\n");
                            if (isBlock) {
                              return (
                                <pre className="my-2 overflow-x-auto rounded-xl bg-card border border-border/50 p-3 font-mono text-xs text-foreground shadow-inner">
                                  <code>{children}</code>
                                </pre>
                              );
                            }
                            return (
                              <code className="rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground border border-border/40">
                                {children}
                              </code>
                            );
                          },
                          hr: () => (
                            <hr className="my-3 border-t border-border/60" />
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="my-2 border-l-2 border-primary/50 pl-3 italic text-muted-foreground">
                              {children}
                            </blockquote>
                          ),
                          table: ({ children }) => (
                            <div className="my-3 overflow-x-auto rounded-xl border border-border/50">
                              <table className="w-full text-left text-xs">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-muted/60">{children}</thead>
                          ),
                          tbody: ({ children }) => (
                            <tbody className="divide-y divide-border/40">{children}</tbody>
                          ),
                          tr: ({ children }) => <tr>{children}</tr>,
                          th: ({ children }) => (
                            <th className="px-3 py-2 font-semibold text-foreground">{children}</th>
                          ),
                          td: ({ children }) => (
                            <td className="px-3 py-2 text-foreground/90">{children}</td>
                          ),
                        }}
                      >
                        {m.answer}
                      </ReactMarkdown>
                    </div>

                    <details className="group mt-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-full bg-secondary/70 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase [&::-webkit-details-marker]:hidden">
                        Sources ({m.sources.length})
                        <span className="transition-transform group-open:rotate-180">
                          ▾
                        </span>
                      </summary>
                      <div className="mt-2">
                        <SourceList sources={m.sources} />
                      </div>
                    </details>
                  </div>
                </div>
              ),
            )}

            {loading && (
              <div className="flex items-start gap-3">
                <AiAvatar />
                <div className="clay flex items-center gap-2 rounded-3xl rounded-tl-lg px-4 py-4">
                  <span className="clay-dot" />
                  <span className="clay-dot" />
                  <span className="clay-dot" />
                  <span className="ml-1 text-xs text-muted-foreground">
                    Retrieving policies and live data…
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="shrink-0">
        <div className="clay-press mx-auto flex max-w-3xl items-center gap-2 rounded-full p-1.5 pl-5">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about an order, policy, or exception…"
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
            aria-label="Message the knowledge copilot"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="clay-btn flex size-10 shrink-0 items-center justify-center bg-primary text-primary-foreground disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizonal className="size-4" />
            )}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted-foreground">
          Every answer cites its sources, and no action is ever taken from chat
          alone — actions go through the approval queue.
        </p>
      </form>
    </div>
  );
}
