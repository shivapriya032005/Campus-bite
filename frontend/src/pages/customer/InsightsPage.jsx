import { useState } from 'react';
import { Sparkles, Send, Bot, User, AlertCircle, HelpCircle } from 'lucide-react';
import api from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SUGGESTIONS = [
  'Summarize my last 5 orders',
  'How much have I spent on campus meals this week?',
  'Which orders are still pending or in progress?',
  'What dishes have I ordered most frequently?',
];

export default function InsightsPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Greetings! I am CampusBite AI, your personal campus culinary assistant. Ask me anything regarding your historical dining orders, favorite dishes, or cumulative spending.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);

  const handleSend = async (questionText = input) => {
    const q = questionText.trim();
    if (!q || loading) return;

    const newMessages = [...messages, { role: 'user', content: q }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/insights', { question: q });
      setMessages([...newMessages, { role: 'assistant', content: res.data.answer }]);
      setUnconfigured(false);
    } catch (err) {
      if (err.response?.status === 503) {
        setUnconfigured(true);
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            isError: true,
            content:
              err.response?.data?.detail ||
              'OpenAI API is currently not configured on the server. Please ensure OPENAI_API_KEY is configured in the environment file.',
          },
        ]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            isError: true,
            content:
              err.response?.data?.detail ||
              'Sorry, I encountered an issue retrieving your insights right now. Please try again shortly.',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5A46D]/15 border border-[#C5A46D]/30 text-[#C5A46D] text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" /> AI Order Intelligence
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Dining Insights Assistant
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Query your historical dining receipts, meal breakdowns, and spending analytics in natural language.
        </p>
      </div>

      {unconfigured && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm space-y-1">
              <strong className="text-amber-400 block font-semibold">AI Service Notice</strong>
              <p className="text-gray-300">
                To connect live OpenAI completions, add your{' '}
                <code className="text-[#C5A46D] bg-[#111827] px-1.5 py-0.5 rounded border border-gray-800">
                  OPENAI_API_KEY
                </code>{' '}
                in the root <code className="text-[#C5A46D] bg-[#111827] px-1.5 py-0.5 rounded border border-gray-800">.env</code> file.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Chat Conversation Card */}
      <Card noPadding className="h-[540px] flex flex-col justify-between overflow-hidden shadow-2xl shadow-black/40">
        {/* Messages Scroll Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  m.role === 'user'
                    ? 'bg-[#C5A46D] text-gray-950'
                    : m.isError
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : 'bg-[#1A222E] text-[#C5A46D] border border-gray-750'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#C5A46D] text-gray-950 font-medium'
                    : m.isError
                    ? 'bg-red-950/40 border border-red-800 text-red-200'
                    : 'bg-[#141B24] border border-gray-800 text-gray-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1A222E] text-[#C5A46D] flex items-center justify-center border border-gray-750">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-[#141B24] border border-gray-800 rounded-2xl px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Consulting your order history records...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input & Prompt Suggestion Chips */}
        <div className="p-4 bg-[#141B24] border-t border-gray-800 space-y-3">
          {/* Suggestion Chips */}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={loading}
                onClick={() => handleSend(s)}
                className="text-[11px] bg-[#1A222E] hover:bg-[#202631] text-gray-300 hover:text-white px-2.5 py-1 rounded-full border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question about your past orders, spending, or dishes..."
              className="flex-1 bg-[#1A222E] border border-gray-750 focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!input.trim() || loading}
              className="rounded-xl px-4 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
