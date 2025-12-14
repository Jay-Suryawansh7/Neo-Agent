'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoAPI } from '@/lib/neo-api';
import { NeoMode } from '@shared/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: NeoMode;
}

export default function NeoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<NeoMode>(NeoMode.VISITOR);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getModeColor = (mode: NeoMode) => {
    const colors = {
      [NeoMode.VISITOR]: 'bg-slate-600',
      [NeoMode.EXPLORER]: 'bg-blue-600',
      [NeoMode.APPLICANT]: 'bg-purple-600',
      [NeoMode.BUILDER]: 'bg-green-600',
      [NeoMode.OPERATOR]: 'bg-red-600',
    };
    return colors[mode] || colors[NeoMode.VISITOR];
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Stream will capture mode from completion event
      for await (const token of NeoAPI.streamChat(userMessage.content)) {
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          const lastMessage = updated[lastIndex];
          
          if (lastMessage.role === 'assistant') {
            updated[lastIndex] = {
              ...lastMessage,
              content: lastMessage.content + token
            };
          }
          return updated;
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Neo
            </h1>
            <p className="text-sm text-slate-400">CogneoVerse AI Interface</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Mode:</span>
            <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getModeColor(currentMode)}`}>
              {currentMode.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="text-6xl mb-4">🧠</div>
              <h2 className="text-xl font-semibold text-slate-300">
                Welcome to Neo
              </h2>
              <p className="text-slate-400 max-w-md mx-auto">
                I am the official AI interface of CogneoVerse—a memory-driven, planning-capable system designed to guide you through our ecosystem.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto">
                <button
                  onClick={() => setInput("What is CogneoVerse?")}
                  className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-left transition-colors"
                >
                  <p className="font-medium text-slate-200">What is CogneoVerse?</p>
                  <p className="text-sm text-slate-400 mt-1">Learn about our mission</p>
                </button>
                
                <button
                  onClick={() => setInput("Tell me about the departments")}
                  className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-left transition-colors"
                >
                  <p className="font-medium text-slate-200">Explore Departments</p>
                  <p className="text-sm text-slate-400 mt-1">Discover our structure</p>
                </button>

                <button
                  onClick={() => setInput("What projects are you working on?")}
                  className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-left transition-colors"
                >
                  <p className="font-medium text-slate-200">Active Projects</p>
                  <p className="text-sm text-slate-400 mt-1">See what we're building</p>
                </button>

                <button
                  onClick={() => setInput("How can I join?")}
                  className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-left transition-colors"
                >
                  <p className="font-medium text-slate-200">Join CogneoVerse</p>
                  <p className="text-sm text-slate-400 mt-1">Become a contributor</p>
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                <div className="prose prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-typing" />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-typing [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-typing [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 bg-slate-900/50 backdrop-blur p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Neo anything about CogneoVerse..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Neo uses memory and knowledge to provide accurate, contextual responses.
          </p>
        </div>
      </div>
    </div>
  );
}
