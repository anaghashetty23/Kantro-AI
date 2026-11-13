import React, { useState, useRef, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Sparkles, Send, Clock, Plus, ArrowRight, User, Bot, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/csrf';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggestedItems?: {
    id: string;
    name: string;
    price: number;
    prepTime: number;
    category: string;
    reason?: string;
  }[];
  suggestedPickupTime?: string;
}

interface AIAssistantPageProps {
  onGoToCart: () => void;
  onGoToMenu: () => void;
}

const SAMPLE_QUESTIONS = [
  'My break is only 15 minutes. What can I eat?',
  'What can I order if I have only 10 minutes?',
  'Suggest something under ₹50.',
  'Can I order a dosa and coffee together?',
  'I have a class at 1 PM. When can I order?',
  'Show me the complete menu.'
];

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({ onGoToCart, onGoToMenu }) => {
  const { addItem, breakSchedule, setSelectedSlot } = useCart();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your KANTRO AI Assistant. 

I'm connected to the live canteen menu, preparation durations, and kitchen station workloads. Ask me about quick meals for short breaks, food under your budget, or ideal pickup slots!`
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isTyping) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await apiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          })),
          studentBreak: {
            start: breakSchedule.breakStart,
            end: breakSchedule.breakEnd,
            preferred: breakSchedule.preferredPickup
          }
        })
      });

      const data = await response.json();

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: response.ok
          ? data.message || 'Here are some recommendations based on the live menu.'
          : data.error || 'Assistant could not process your request.',
        suggestedItems: response.ok ? data.suggestedItems : undefined,
        suggestedPickupTime: response.ok ? data.suggestedPickupTime : undefined
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'assistant',
          text: 'I could not connect to the scheduling service. You can browse the Full Menu anytime!'
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF5CC] border border-amber-300 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[#292929]">KANTRO AI Assistant</h1>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Break & Timetable Planner
              </span>
            </div>
            <p className="text-xs text-[#777777]">
              Live kitchen menu grounded • Instant Add to Cart
            </p>
          </div>
        </div>

        <button
          onClick={onGoToCart}
          className="text-xs font-bold text-[#292929] hover:text-amber-700 underline"
        >
          View Cart →
        </button>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 bg-white rounded-3xl border border-stone-200 p-4 sm:p-6 overflow-y-auto space-y-4 shadow-2xs">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-[#292929] text-white'
                    : 'bg-[#FFF5CC] text-[#292929] border border-amber-300'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-amber-800" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#292929] text-white rounded-tr-none'
                    : 'bg-[#FAFAF5] text-[#292929] border border-stone-200/90 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Suggested Items Action Cards */}
                {msg.suggestedItems && msg.suggestedItems.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-stone-200 space-y-2">
                    <div className="text-xs font-bold text-[#777777] uppercase tracking-wider">
                      Recommended from Canteen Menu:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.suggestedItems.map(item => (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl p-3 border border-stone-200 shadow-2xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-bold text-xs text-[#292929]">{item.name}</div>
                            <div className="flex items-center gap-2 text-[11px] text-[#777777]">
                              <span className="font-bold text-[#292929]">₹{item.price}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-500" />
                                {item.prepTime}m
                              </span>
                            </div>
                            {item.reason && (
                              <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                                {item.reason}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              addItem({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                prep_time_minutes: item.prepTime,
                                station_id: 'station_south',
                                quantity: 1
                              })
                            }
                            className="p-1.5 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                            title={`Add ${item.name} to Cart`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {msg.suggestedPickupTime && (
                      <div className="mt-2 text-xs text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center justify-between">
                        <span>Suggested Pickup Slot: <strong>{msg.suggestedPickupTime}</strong></span>
                        <button
                          onClick={() => setSelectedSlot(msg.suggestedPickupTime!)}
                          className="font-bold underline text-xs"
                        >
                          Select this slot
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FFF5CC] border border-amber-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-amber-800" />
            </div>
            <div className="bg-[#FAFAF5] border border-stone-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-[#777777] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce delay-100"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce delay-200"></span>
              <span className="ml-1">Calculating prep workload & break slots...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {SAMPLE_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="text-xs bg-white hover:bg-[#FFF5CC] text-[#292929] px-3 py-1.5 rounded-full border border-stone-200 hover:border-amber-300 font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-white rounded-2xl border border-stone-200 p-2 shadow-sm flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask e.g. 'I have 10 minutes between lectures, what can I grab?'..."
          className="flex-1 px-3 py-2 text-sm text-[#292929] placeholder-stone-400 focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="p-2.5 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] rounded-xl font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Send message to AI assistant"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
