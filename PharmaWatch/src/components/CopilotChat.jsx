import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { getAllSignals } from "../data/mockData";

// Initialize Gemini Client
// In a real production app, you'd want to call a backend endpoint to hide the key.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// System instruction using our mock data
const buildSystemInstruction = () => {
  const signals = getAllSignals();
  const context = signals.map(s => `- ${s.drugBrand} (${s.drugGeneric}): ${s.symptom} (Confidence: ${s.tier}, Reporters: ${s.uniqueReporters})`).join("\n");
  
  return `You are PharmaWatch Copilot, an AI assistant for a drug safety platform.
Your job is to answer users' questions about drug side effects and symptoms.

Here is the internal data PharmaWatch has detected from analyzing patient reports on Reddit:
${context}

When a user asks about a drug and a symptom:
1. Check if the symptom matches our internal data above. If it does, mention that PharmaWatch has detected this as a safety signal.
2. Use the Google Search tool to check if there are other real-world reports, news, or medical articles discussing this side effect.
3. Be empathetic but clearly state you are an AI and not a doctor.
4. Keep your responses concise, well-spaced, and easy to read. Avoid complex markdown, just use plain text and simple bullet points.
`;
};

export default function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "model", parts: [{ text: "Hi! I'm the PharmaWatch Copilot. Ask me about a drug and any symptoms you're feeling, and I'll check our data and Google to see if others have reported the same thing." }] }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", parts: [{ text: input.trim() }] };
    // Keep only last 10 messages to avoid context overflow and rate limits
    const chatHistory = [...messages.slice(-9), userMessage];
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: chatHistory,
        config: {
          systemInstruction: buildSystemInstruction(),
          tools: [{ googleSearch: {} }],
        }
      });
      
      const text = response.text || "I'm sorry, I couldn't generate a response.";
      setMessages(prev => [...prev, { role: "model", parts: [{ text }] }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { role: "model", parts: [{ text: "Sorry, I encountered an error checking the data. Please try again later." }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-base-100 border border-base-300 shadow-[0_20px_50px_rgb(0,0,0,0.2)] rounded-3xl w-[350px] md:w-[400px] h-[550px] flex flex-col overflow-hidden mb-4 animate-fade-in">
          {/* Header */}
          <div className="bg-primary text-primary-content p-4 font-bold flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚕</span> 
              <div>
                <div className="leading-tight">PharmaWatch Copilot</div>
                <div className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Powered by Gemini 2.5</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="btn btn-ghost btn-xs btn-circle hover:bg-primary-focus">✕</button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-base-200/30">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}>
                <div className={`chat-bubble text-sm whitespace-pre-wrap ${msg.role === "user" ? "chat-bubble-primary text-white font-medium" : "bg-base-100 border border-base-300 text-base-content/90 shadow-sm"}`}>
                  {msg.parts[0].text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat chat-start animate-pulse">
                <div className="chat-bubble bg-base-100 border border-base-300 shadow-sm flex items-center gap-2 px-4 py-3">
                  <span className="loading loading-dots loading-xs text-primary"></span>
                  <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">Searching Data & Web</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-base-100 border-t border-base-300/80">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <input 
                type="text" 
                className="input input-md input-bordered flex-1 rounded-full bg-base-200/50 focus:bg-base-100 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium" 
                placeholder="Ask about a symptom..." 
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="btn btn-md btn-primary btn-circle"
                disabled={!input.trim() || isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="btn btn-primary btn-circle w-14 h-14 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-float hover:scale-110 transition-transform duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        </button>
      )}
    </div>
  );
}
