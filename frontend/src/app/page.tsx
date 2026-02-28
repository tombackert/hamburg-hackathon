'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  PlaneTakeoff,
  Crown,
  Sparkles,
  Loader2,
  Calendar,
  ArrowLeft,
  Send,
  User,
  Bot,
  Map as MapIcon,
  Info
} from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const LOADING_STEPS = [
  'Looking up flight...',
  'Finding lounges...',
  'Optimizing your experience...',
];

export default function Home() {
  // Navigation State
  const [view, setView] = useState<'home' | 'results'>('home');

  // Form State
  const [searchMode, setSearchMode] = useState<'route' | 'flight'>('flight');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [date, setDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [flightClass, setFlightClass] = useState('economy');
  const [status, setStatus] = useState('none');

  // Resolved from API
  const [resolvedOrigin, setResolvedOrigin] = useState('');
  const [resolvedDestination, setResolvedDestination] = useState('');

  // App Logic State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Chat/Results State
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (view === 'results') {
      scrollToBottom();
    }
  }, [messages, view]);

  // Cycle loading steps while isLoading is true
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    setLoadingStep(0);
    const id1 = setTimeout(() => setLoadingStep(1), 1000);
    const id2 = setTimeout(() => setLoadingStep(2), 2000);
    return () => {
      clearTimeout(id1);
      clearTimeout(id2);
    };
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      origin: searchMode === 'route' ? origin.trim().toUpperCase() : undefined,
      destination: searchMode === 'route' ? destination.trim().toUpperCase() : undefined,
      flight_number: searchMode === 'flight' ? flightNumber.trim().toUpperCase() : undefined,
      date,
      flight_class: flightClass,
      status,
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `Server returned ${response.status}`);
      }

      setResolvedOrigin(data.resolved_route?.origin || origin || '');
      setResolvedDestination(data.resolved_route?.destination || destination || '');
      setMessages([{ role: 'assistant', content: data.suggestion }]);
      setView('results');
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching your routing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: Message = { role: 'user', content: chatInput };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      setMessages([...updatedMessages, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setError('Failed to send message.');
    } finally {
      setIsChatLoading(false);
    }
  };

  if (view === 'results') {
    return (
      <div className="flex flex-col h-screen bg-dark-900 text-white overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-dark-800/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('home')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-100 bg-clip-text text-transparent">
                LoungeConcierge
              </h1>
              <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                {flightNumber.replace(' ', '').toUpperCase()}
                {resolvedOrigin && resolvedDestination
                  ? ` · ${resolvedOrigin} → ${resolvedDestination}`
                  : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-400 hidden sm:block">
              <span className="font-semibold text-primary-500">Premium</span> Planning Active
            </div>
          </div>
        </header>

        {/* Main Content Areas */}
        <main className="flex flex-1 overflow-hidden">

          {/* Left Panel: Chat */}
          <section className="w-full md:w-[400px] border-r border-white/10 flex flex-col bg-dark-800/30">
            <div className="p-4 border-b border-white/5 bg-dark-800/20">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-gray-300">
                <Sparkles className="w-4 h-4 text-secondary-500" />
                Concierge Chat
              </h2>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user'
                    ? 'bg-primary-600/20 border border-primary-500/20 text-white'
                    : 'bg-dark-800 border border-white/10 text-gray-200'
                    }`}>
                    <div className="flex items-center gap-2 mb-2 opacity-50 text-[10px] font-bold uppercase tracking-wider">
                      {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      {msg.role === 'user' ? 'You' : 'Lota AI'}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed prose prose-invert prose-sm">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-dark-800 border border-white/10 rounded-2xl p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-dark-800/50 border-t border-white/10">
              <form onSubmit={handleChatSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Ask for more details or changes..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
            </div>
          </section>

          {/* Right Panel: Trip Details & Map */}
          <section className="flex-1 overflow-y-auto p-8 space-y-8 bg-dark-900 relative thin-scrollbar">
            {/* Background decorative blur */}
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary-600/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-4xl mx-auto space-y-8 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Your Journey Details</h2>
                  <p className="text-gray-400 mt-1">Optimized for maximum lounge comfort.</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold">
                    Lufthansa Certified
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="glass-panel p-6 border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary-600/20 rounded-lg">
                      <PlaneTakeoff className="w-5 h-5 text-primary-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Route Overview</h3>
                  </div>
                  <div className="flex items-center justify-between py-4 border-y border-white/5">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{resolvedOrigin || '---'}</div>
                      <div className="text-[10px] text-gray-500 uppercase">Departure</div>
                    </div>
                    <div className="flex-1 flex flex-col items-center px-8 relative">
                      <div className="w-full h-[2px] bg-gradient-to-r from-primary-500 to-secondary-500 opacity-30" />
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-dark-900 border border-white/20 p-1 rounded-full">
                        <MapPin className="w-3 h-3 text-secondary-500" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{resolvedDestination || '---'}</div>
                      <div className="text-[10px] text-gray-500 uppercase">Arrival</div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-6 border-white/10 bg-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-secondary-500/20 rounded-lg">
                      <Crown className="w-5 h-5 text-secondary-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Recommended Lounges</h3>
                  </div>
                  <div className="text-gray-300 text-sm leading-relaxed">
                    Check the chat panel on the left for the full breakdown of your personalized lounge recommendations and flight connections.
                  </div>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative h-[300px] w-full bg-dark-800 rounded-2xl border border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                  <MapIcon className="w-12 h-12 text-gray-600 mb-4 animate-pulse" />
                  <h4 className="text-lg font-semibold text-gray-400">Interactive Route Map</h4>
                  <p className="text-sm text-gray-600 mt-1">Coming Soon: Visual flight tracking &amp; lounge locations</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Home View (Form)
  return (
    <div className="min-h-screen relative overflow-hidden bg-dark-900 text-white flex flex-col justify-center items-center p-4 transition-all duration-500">

      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-secondary-500/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="z-10 w-full max-w-2xl mx-auto flex flex-col gap-8 py-12 animate-fade-in-up">

        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-primary-50 to-primary-100 bg-clip-text text-transparent drop-shadow-2xl">
            LoungeConcierge
          </h1>
          <p className="text-lg text-gray-400 font-light max-w-lg mx-auto leading-relaxed">
            Forget finding the fastest route. Let our agent maximize your time in{' '}
            <span className="text-primary-400 font-medium">premium luxury lounges</span> instead.
          </p>
        </header>

        {/* Input Form Area */}
        <section className="glass-panel p-8 shadow-2xl shadow-primary-900/40 border border-white/10 relative overflow-hidden group">

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">

            {/* Mode Toggle */}
            <div className="flex bg-dark-800/80 p-1 rounded-xl border border-white/5 mb-2">
              <button
                type="button"
                onClick={() => setSearchMode('route')}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${searchMode === 'route' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Search by Route
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('flight')}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${searchMode === 'flight' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Search by Flight #
              </button>
            </div>

            {searchMode === 'route' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="origin" className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                    <PlaneTakeoff className="w-4 h-4 text-primary-500" />
                    Origin
                  </label>
                  <input
                    id="origin"
                    type="text"
                    placeholder="e.g. BER"
                    maxLength={3}
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                    className="w-full bg-dark-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-base font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all uppercase text-center"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="destination" className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    Destination
                  </label>
                  <input
                    id="destination"
                    type="text"
                    placeholder="e.g. JFK"
                    maxLength={3}
                    value={destination}
                    onChange={(e) => setDestination(e.target.value.toUpperCase())}
                    className="w-full bg-dark-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-base font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all uppercase text-center"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label htmlFor="flightNumber" className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                  <PlaneTakeoff className="w-4 h-4 text-primary-500" />
                  Flight Number
                </label>
                <input
                  id="flightNumber"
                  type="text"
                  placeholder="e.g. LH 400"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                  className="w-full bg-dark-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-base font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all tracking-widest uppercase text-center"
                  required
                  autoFocus
                />
              </div>
            )}

            {/* Date picker */}
            <div className="flex flex-col gap-2">
              <label htmlFor="date" className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-500" />
                Travel Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-dark-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all [color-scheme:dark]"
                required
              />
            </div>

            {/* Optional preferences row */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-gray-500 ml-1 uppercase tracking-widest">
                Optional Preferences
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="class" className="text-xs text-gray-500 ml-1 flex items-center gap-1.5">
                    <PlaneTakeoff className="w-3 h-3 text-gray-600" />
                    Class
                  </label>
                  <select
                    id="class"
                    value={flightClass}
                    onChange={(e) => setFlightClass(e.target.value)}
                    className="bg-dark-800/40 border border-gray-700/30 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500/40 appearance-none transition-all cursor-pointer"
                  >
                    <option value="economy">Economy</option>
                    <option value="premium">Premium Economy</option>
                    <option value="business">Business</option>
                    <option value="first">First Class</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="status" className="text-xs text-gray-500 ml-1 flex items-center gap-1.5">
                    <Crown className="w-3 h-3 text-gray-600" />
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-dark-800/40 border border-gray-700/30 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500/40 appearance-none transition-all cursor-pointer"
                  >
                    <option value="none">None</option>
                    <option value="ft">Frequent Traveller</option>
                    <option value="sen">Senator</option>
                    <option value="hon">HON Circle</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(22,163,74,0.3)] transform transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed text-lg flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {LOADING_STEPS[loadingStep]}
                </>
              ) : (
                <>
                  Find Lounge-Optimized Routes
                  <Sparkles className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </section>

        {/* Error Notification */}
        {error && (
          <div className="glass-panel border-red-500/30 bg-red-500/10 p-6 text-red-200 animate-fade-in-up flex items-center gap-3">
            <Info className="w-5 h-5 text-red-500" />
            <p className="text-sm">{error}</p>
          </div>
        )}

      </main>

      {/* Decorative Elements */}
      <div className="hidden md:block absolute bottom-8 text-xs text-gray-500/50 font-mono tracking-widest text-center w-full select-none">
        POWERED BY GEMINI VERTEX AI &bull; LUFTHANSA OPEN API
      </div>
    </div>
  );
}
