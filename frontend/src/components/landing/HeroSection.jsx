import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Play } from 'lucide-react';

export const HeroSection = ({ data }) => {
  const scrollToProgram = () => {
    const element = document.getElementById('programa');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={data.heroImage}
          alt="Treino fitness"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-40">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-300 text-sm font-medium">Programa de 4 Semanas</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            {data.title}
          </h1>
          
          <p className="text-2xl sm:text-3xl md:text-4xl font-light text-emerald-400 mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            {data.subtitle}
          </p>

          <p className="text-lg sm:text-xl text-slate-300 mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            {data.description}
          </p>

          <p className="text-base text-slate-400 mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-400">
            {data.author}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
            <Button
              onClick={() => window.open(data.kiwifyLink, '_blank')}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/30"
            >
              {data.ctaPrimary}
            </Button>
            <Button
              onClick={scrollToProgram}
              variant="outline"
              size="lg"
              className="border-2 border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg rounded-xl backdrop-blur-sm transition-all hover:scale-105"
            >
              <Play className="mr-2 h-5 w-5" />
              {data.ctaSecondary}
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap items-center gap-6 text-slate-400 text-sm animate-in fade-in slide-in-from-bottom-6 duration-700 delay-700">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Garantia de 7 dias</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>36+ anos de experiência</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Acesso vitalício</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToProgram}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors animate-bounce"
      >
        <ChevronDown size={32} />
      </button>
    </section>
  );
};
