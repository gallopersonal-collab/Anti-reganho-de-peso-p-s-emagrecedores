import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export const OfferSection = ({ data }) => {
  return (
    <section id="oferta" className="py-20 md:py-28 bg-slate-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Oferta Especial</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Comece Sua Transformação Hoje
            </h2>

            <p className="text-lg text-slate-400 mb-8">
              Acesso completo ao programa que vai te ajudar a manter o peso conquistado, mesmo sem medicação.
            </p>

            {/* Mockup */}
            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 shadow-2xl max-w-sm">
                <div className="bg-white rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg" />
                    <div className="space-y-1">
                      <div className="h-2 bg-slate-200 rounded w-24" />
                      <div className="h-2 bg-slate-100 rounded w-16" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-16 bg-emerald-50 rounded-lg" />
                    <div className="h-2 bg-slate-200 rounded w-3/4" />
                    <div className="h-2 bg-slate-100 rounded w-full" />
                  </div>
                </div>
                <p className="text-white text-center mt-4 font-semibold">Programa 4 Semanas Pós-Ozempic</p>
              </div>
            </div>
          </div>

          {/* Right - Pricing Card */}
          <div>
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-center">
                <p className="text-emerald-100 font-medium mb-2">{data.title}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl md:text-5xl font-bold text-white">{data.price}</span>
                </div>
                <p className="text-emerald-200 text-sm mt-2">à vista</p>
              </div>

              {/* Includes */}
              <div className="p-6 md:p-8">
                <p className="font-semibold text-slate-900 mb-4">O que está incluído:</p>
                <div className="space-y-3 mb-8">
                  {data.includes.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="space-y-3">
                  <Button
                    onClick={() => window.open(data.kiwifyLink, '_blank')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-6 text-lg rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
                  >
                    {data.ctaPrimary}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => window.open(data.kiwifyLink, '_blank')}
                    variant="outline"
                    className="w-full border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold py-6 text-lg rounded-xl transition-all"
                  >
                    {data.ctaSecondary}
                  </Button>
                </div>

                {/* Guarantee Badge */}
                <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Garantia de 7 dias ou seu dinheiro de volta</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
