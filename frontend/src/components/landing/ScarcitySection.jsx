import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, ArrowRight, Users, XCircle, CheckCircle } from 'lucide-react';

export const ScarcitySection = ({ data, checkoutLink, cta }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[ScarcitySection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[ScarcitySection] Section visible');
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`py-16 md:py-24 bg-[#1D3557] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left - Takeaway Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 rounded-full px-4 py-2 mb-6">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Importante</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-[#F1FAEE] mb-4">
              {data.takeawayTitle || data.title}
            </h2>

            <p className="text-[#F1FAEE]/80 mb-6">
              {data.description}
            </p>

            {/* Takeaway Items */}
            {data.takeawayItems && (
              <div className="space-y-3 mb-8">
                {data.takeawayItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[#F1FAEE]/90 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Who IS this for */}
            <div className="bg-[#457B9D]/30 rounded-xl p-4 border border-[#457B9D]/50">
              <p className="text-[#F1FAEE] font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Se você é esse profissional:
              </p>
              <p className="text-[#F1FAEE]/80 text-sm">
                Comprometido, focado em resultados e pronto para se tornar referência no mercado — então sua vaga está garantida.
              </p>
            </div>
          </div>

          {/* Right - Scarcity Box */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-8 text-center shadow-2xl">
            {/* Spots Counter */}
            <div className="w-24 h-24 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-6">
              <div>
                <p className="text-4xl font-bold text-white">{data.spots}</p>
                <p className="text-white/70 text-xs">vagas</p>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">
              {data.subtitle}
            </h3>

            {/* Urgency Note */}
            {data.urgencyNote && (
              <div className="bg-white/20 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-white">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">{data.urgencyNote}</span>
                </div>
              </div>
            )}

            {/* Urgency indicators */}
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Turma única — não haverá reprise</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                <Users className="w-4 h-4" />
                <span>Vagas preenchidas por ordem de inscrição</span>
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={() => {
                console.log('[ScarcitySection] CTA clicked - scrolling to plans');
                document.getElementById('oferta')?.scrollIntoView({ behavior: 'smooth' });
              }}
              size="lg"
              className="w-full bg-white hover:bg-white/90 text-red-600 font-bold py-6 text-lg rounded-xl shadow-lg transition-all hover:scale-105"
            >
              <span className="mr-2">👉</span>
              Garantir Minha Vaga Agora
              <ArrowRight className="ml-2 w-5 h-5 bounce-arrow" />
            </Button>

            <p className="text-white/60 text-xs mt-4">
              Ao clicar, você será direcionado para escolher seu plano
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
