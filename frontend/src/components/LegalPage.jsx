import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

export default function LegalPage({ title, intro, sections, slug }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 pt-28 pb-16" data-testid={`legal-page-${slug}`}>
        <Link to="/" data-testid="legal-back-home" className="inline-flex items-center gap-1.5 text-sm text-[#a8aeff] hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2" data-testid="legal-title">{title}</h1>
        <p className="text-xs text-zinc-500 mb-8" data-testid="legal-updated">Last updated: {today}</p>
        {intro && <p className="text-zinc-300 leading-relaxed mb-8">{intro}</p>}
        <ol className="space-y-8">
          {sections.map((s, i) => (
            <li key={s.h}>
              <h2 className="text-lg font-bold mb-2"><span className="text-[#7c83ff] mr-2">{i + 1}.</span>{s.h}</h2>
              <div className="text-[15px] text-zinc-300 leading-relaxed space-y-3">{s.body}</div>
            </li>
          ))}
        </ol>
      </main>
      <Footer />
    </div>
  );
}
