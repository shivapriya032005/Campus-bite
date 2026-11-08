import { useState } from 'react';
import { Sparkles, Send, Bot, User, HelpCircle, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SUGGESTIONS = [
  'Summarize my last 5 orders',
  'How much have I spent so far?',
  'Which orders are still pending or in progress?',
  'What dishes have I ordered most frequently?',
];

export default function InsightsPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your AI Order Assistant. I can help you analyze your CampusBite order history, breakdown your spending, or summarize past dishes. Ask me anything about your orders!',
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
              'OpenAI API is currently not configured on the server. Please ask the administrator to configure OPENAI_API_KEY in the environment file.',
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
              'Sorry, I encountered an issue retrieving insights right now. Please try again later.',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-[#C5A46D]" />
          <h1 className="text-3xl font-bold text-white tracking-tight">AI Order Insights</h1>
        </div>
        <p className="text-gray-400 mt-1">
          Query your historical orders, spending analytics, and dining habits with AI
        </p>
      </div>

      {unconfigured && (
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-yellow-400 block mb-1">AI Service Configuration Note</strong>
              <p className="text-gray-300">
                To activate AI insights with live OpenAI completions, add your{' '}
                <code className="text-[#C5A46D] bg-gray-900 px-1.5 py-0.5 rounded">OPENAI_API_KEY</code>{' '}
                to the root <code className="text-[#C5A46D] bg-gray-900 px-1.5 py-0.5 rounded">.env</code>{' '}
                file.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Chat Messages Card */}
      <Card noPadding className="h-[520px] flex flex-col justify-between">
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  m.role === 'user'
                    ? 'bg-[#C5A46D] text-gray-900'
                    : m.isError
                    ? 'bg-red-900/60 text-red-300'
                    : 'bg-gray-700 text-[#C5A46D]'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#C5A46D] text-gray-900 font-medium'
                    : m.isError
                    ? 'bg-red-950/40 border border-red-800 text-red-200'
                    : 'bg-gray-800 border border-gray-700 text-gray-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 text-[#C5A46D] flex items-center justify-center">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Analyzing your order history...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input & Suggestions Area */}
        <div className="p-4 bg-gray-850 border-t border-gray-700/50 space-y-3">
          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={loading}
                onClick={() => handleSend(s)}
                className="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2.5 py-1 rounded-full border border-gray-700 transition-colors"
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
              placeholder="Ask a question about your orders or spending..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A46D]"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!input.trim() || loading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
