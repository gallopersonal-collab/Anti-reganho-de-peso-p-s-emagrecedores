import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';

export const HeroSection = ({ data, checkoutLink }) => {
  useEffect(() => {
    console.log('[HeroSection] Component mounted');
  }, []);

  return (
    <section className="relative min-h-screen flex items-center bg-[#012578] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1CAF35] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1CAF35] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#1CAF35]/30 border border-[#1CAF35]/50 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-[#FFFFFF] rounded-full animate-pulse" />
              <span className="text-[#FFFFFF] text-sm font-medium">Curso Exclusivo para Personal Trainers, Profissionais de Educação Física e Nutricionistas</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold text-[#FFFFFF] leading-tight mb-6">
              {data.headline}
            </h1>

            <p className="text-lg md:text-xl text-[#FFFFFF]/80 mb-8 leading-relaxed">
              {data.subheadline}
            </p>

            <Button
              onClick={() => {
                console.log('[HeroSection] CTA clicked - scrolling to plans');
                document.getElementById('oferta')?.scrollIntoView({ behavior: 'smooth' });
              }}
              size="lg"
              className="bg-[#1CAF35] hover:bg-[#1CAF35]/90 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg shadow-[#1CAF35]/30 transition-all hover:scale-105 pulse-cta"
            >
              <span className="mr-2">👉</span>
              {data.cta}
              <ArrowRight className="ml-2 w-5 h-5 bounce-arrow" />
            </Button>

            {/* Course Dates */}
            <div className="mt-8 bg-[#1CAF35]/30 border border-[#1CAF35]/50 rounded-xl p-4 inline-block">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-[#FFFFFF]">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-xs text-[#FFFFFF]/70">Datas do Curso</p>
                    <p className="font-bold">{data.courseDates}</p>
                  </div>
                </div>
                <div className="hidden sm:block w-px h-10 bg-[#FFFFFF]/30" />
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🕐</span>
                  <div>
                    <p className="text-xs text-[#FFFFFF]/70">Horário</p>
                    <p className="font-bold text-sm">{data.courseSchedule}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-4">
              {['Certificado', 'Suporte'].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[#FFFFFF]/70 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#1CAF35]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Author Photo and Mockup */}
          <div className="relative hidden lg:block">
            <div className="relative">
              {/* Author Photo */}
              <div className="mb-6">
                <img
                  src="https://customer-assets.emergentagent.com/job_keep-results/artifacts/g3178qy9_IMAGEM%20GALLO%205.jpeg"
                  alt="Professor José Carlos Gallo"
                  className="w-80 h-80 object-cover rounded-3xl shadow-2xl mx-auto border-4 border-white/20"
                />
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-[#1CAF35] text-white px-6 py-2 rounded-full shadow-lg">
                  <span className="text-sm font-bold">Prof. José Carlos Gallo</span>
                </div>
              </div>

              {/* Main mockup card */}
              <div className="bg-white rounded-3xl shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500 mt-8">
                <div className="bg-gradient-to-br from-[#012578] to-[#1CAF35] rounded-2xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-2">Método Anti-Reganho</h3>
                  <p className="text-sm opacity-80">Curso Completo</p>
                  <div className="mt-4 space-y-2">
                    {['Fase 1: Durante Medicação', 'Fase 2: Desmame', 'Fase 3: Pós-Medicação'].map((phase, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        {phase}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">A partir de</p>
                    <p className="text-2xl font-bold text-[#012578]">R$ 897</p>
                  </div>
                  <div className="bg-[#FFFFFF] px-3 py-1 rounded-full">
                    <span className="text-[#012578] text-xs font-semibold">ACESSO COMPLETO</span>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-[#1CAF35] text-white px-4 py-2 rounded-full shadow-lg">
                <span className="text-sm font-bold">20 VAGAS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
