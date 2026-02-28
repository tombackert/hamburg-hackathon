'use client';

import React, { useState } from 'react';
import { MapPin, PlaneTakeoff, Crown, Sparkles } from 'lucide-react';

export default function Home() {
  const [destination, setDestination] = useState('');
  const [flightClass, setFlightClass] = useState('economy');
  const [status, setStatus] = useState('none');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Planning for:", { destination, flightClass, status });
    // TODO: Connect to FastAPI backend
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-dark-900 text-white flex flex-col justify-center items-center p-4">

      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary-500/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="z-10 w-full max-w-2xl mx-auto flex flex-col gap-8 animate-fade-in-up">

        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full glass-panel text-primary-100 text-sm tracking-wide uppercase mb-2">
            <Sparkles className="w-4 h-4 text-secondary-500" />
            AI-Powered Travel Optimizer
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary-100 to-secondary-500 bg-clip-text text-transparent drop-shadow-lg">
            Project Lota
          </h1>
          <p className="text-lg text-gray-300 font-light max-w-lg mx-auto leading-relaxed">
            Don't just survive layovers. <span className="text-primary-500 font-semibold">Maximize</span> your time in premium lounges. Let our agent build the perfect itinerary.
          </p>
        </header>

        {/* Input Form Area */}
        <section className="glass-panel p-8 shadow-2xl shadow-primary-900/20 transition-all duration-300 hover:shadow-primary-600/30">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            <div className="flex flex-col gap-2 relative">
              <label htmlFor="destination" className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-500" />
                Where to next?
              </label>
              <input
                id="destination"
                type="text"
                placeholder="e.g. New York, JFK"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="bg-dark-800/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 relative">
                <label htmlFor="class" className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                  <PlaneTakeoff className="w-4 h-4 text-primary-500" />
                  Flight Class
                </label>
                <select
                  id="class"
                  value={flightClass}
                  onChange={(e) => setFlightClass(e.target.value)}
                  className="bg-dark-800/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 appearance-none transition-all cursor-pointer"
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
                  className="bg-dark-800/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 appearance-none transition-all cursor-pointer"
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
              className="mt-6 w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(22,163,74,0.3)] transform transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] active:translate-y-0 text-lg flex justify-center items-center gap-2 group"
            >
              Optimize My Journey
              <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
            </button>
          </form>
        </section>

      </main>

      {/* Decorative Elements */}
      <div className="absolute bottom-8 text-xs text-gray-500/50 font-mono tracking-widest text-center w-full select-none">
        POWERED BY GEMINI VERTEX AI &bull; LUFTHANSA OPEN API
      </div>
    </div>
  );
}
