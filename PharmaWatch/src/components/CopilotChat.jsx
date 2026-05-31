import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { getAllSignals } from "../data/mockData";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const buildSystemInstruction = () => {
  const signals = getAllSignals();
  const context = signals
    .map(
      (s) =>
        `- ${s.drugBrand} (${s.drugGeneric}): ${s.symptom} (${s.tier}, ${s.uniqueReporters} reporters)`
    )
    .join("\n");

  return `You are a research assistant for PharmaWatch, a drug safety signal platform.
Answer questions about side effects using the detected signals below when relevant.
Keep responses concise and plain. Use simple bullet points when helpful.

Detected signals:
${context}
`;
};

export default function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "model",
      parts: [
        {
          text: "Ask about a drug and symptom. I'll check our signal index and public sources when available.",
        },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", parts: [{ text: input.trim() }] };
    const chatHistory = [...messages.slice(-9), userMessage];

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: chatHistory,
        config: {
          systemInstruction: buildSystemInstruction(),
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "No response generated.";
      setMessages((prev) => [...prev, { role: "model", parts: [{ text }] }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          parts: [{ text: "Could not reach the assistant. Try again in a moment." }],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-base-100 border border-base-300 shadow-lg rounded-2xl w-[340px] md:w-[380px] h-[480px] flex flex-col overflow-hidden mb-3">
          <div className="border-b border-base-300 px-4 py-3 flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold text-base-content">Research assistant</div>
              <div className="text-[11px] text-base-content/50">Drug & symptom questions</div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn btn-ghost btn-xs btn-square"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-base-200/30">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm max-w-[90%] ${
                  msg.role === "user" ? "ml-auto" : ""
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-xl whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-content"
                      : "bg-base-100 border border-base-300 text-base-content/90"
                  }`}
                >
                  {msg.parts[0].text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-xs text-base-content/50 flex items-center gap-2">
                <span className="loading loading-spinner loading-xs" />
                Searching…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-base-300">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                className="input input-bordered input-sm flex-1 rounded-lg"
                placeholder="e.g. Ozempic and hair loss"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!input.trim() || isLoading}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn btn-primary btn-sm rounded-xl shadow-md"
        >
          Ask a question
        </button>
      )}
    </div>
  );
}
