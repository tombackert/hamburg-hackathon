'use client';

import React, { useState } from 'react';
import { MapPin, PlaneTakeoff, Crown, Sparkles, Loader2, Calendar } from 'lucide-react';

export default function Home() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [flightClass, setFlightClass] = useState('economy');
  const [status, setStatus] = useState('none');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    const payload = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      date,
      flight_class: flightClass,
      status
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setResult(data.suggestion);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching your routing.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-dark-900 text-white flex flex-col justify-center items-center p-4">

      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-secondary-500/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="z-10 w-full max-w-2xl mx-auto flex flex-col gap-8 py-12">

        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-100 text-xs font-semibold tracking-widest uppercase mb-2 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-secondary-500 animate-pulse" />
            Hackathon Edition
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-primary-50 to-primary-100 bg-clip-text text-transparent drop-shadow-2xl">
            Project Lota
          </h1>
          <p className="text-lg text-gray-400 font-light max-w-lg mx-auto leading-relaxed">
            Forget finding the fastest route. Let our agent maximize your time in <span className="text-primary-400 font-medium">premium luxury lounges</span> instead.
          </p>
        </header>

        {/* Input Form Area */}
        <section className="glass-panel p-8 shadow-2xl shadow-primary-900/40 border border-white/10 relative overflow-hidden group">

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 relative">
                <label htmlFor="origin" className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                  <PlaneTakeoff className="w-4 h-4 text-primary-500" />
                  Origin (IATA)
                </label>
                <input
                  id="origin"
                  type="text"
                  placeholder="e.g. BER"
                  maxLength={3}
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="bg-dark-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all uppercase"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 relative">
                <label htmlFor="destination" className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  Destination (IATA)
                </label>
                <input
                  id="destination"
                  type="text"
                  placeholder="e.g. JFK"
                  maxLength={3}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="bg-dark-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all uppercase"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 relative md:col-span-2">
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

              <div className="flex flex-col gap-2 relative">
                <label htmlFor="class" className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                  <PlaneTakeoff className="w-4 h-4 text-primary-500" />
                  Flight Class
                </label>
                <select
                  id="class"
                  value={flightClass}
                  onChange={(e) => setFlightClass(e.target.value)}
                  className="bg-dark-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 appearance-none transition-all cursor-pointer"
                >
                  <option value="economy">Economy</option>
                  <option value="premium">Premium Economy</option>
                  <option value="business">Business</option>
                  <option value="first">First Class</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 relative">
                <label htmlFor="status" className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-secondary-500" />
                  Frequent Flyer Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="bg-dark-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 appearance-none transition-all cursor-pointer"
                >
                  <option value="none">None</option>
                  <option value="ft">Frequent Traveller</option>
                  <option value="sen">Senator</option>
                  <option value="hon">HON Circle</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(22,163,74,0.3)] transform transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed text-lg flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Itinerary...
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

        {/* Results Area */}
        {error && (
          <div className="glass-panel border-red-500/30 bg-red-500/10 p-6 text-red-200 animate-fade-in-up">
            <p className="font-semibold">Error:</p>
            <p className="mt-1 opacity-80">{error}</p>
          </div>
        )}

        {result && (
          <div className="glass-panel border-primary-500/30 bg-primary-900/20 p-8 animate-fade-in-up relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-400 to-secondary-500"></div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-primary-100">
              <Crown className="w-5 h-5 text-secondary-500" />
              Your Optimal Journey
            </h2>
            <div className="prose prose-invert prose-p:leading-relaxed max-w-none prose-strong:text-primary-300 text-gray-300 whitespace-pre-wrap">
              {result}
            </div>
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
