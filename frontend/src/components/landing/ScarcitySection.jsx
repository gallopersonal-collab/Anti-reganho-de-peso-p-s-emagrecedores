import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, ArrowRight, Users } from 'lucide-react';

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
      className={`py-16 md:py-24 bg-gradient-to-br from-red-600 to-red-700 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Alert Icon */}
        <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {data.title}
        </h2>

        {/* Spots Counter */}
        <div className="inline-flex items-center gap-4 bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-4 mb-6">
          <Users className="w-8 h-8 text-white" />
          <div className="text-left">
            <p className="text-4xl font-bold text-white">{data.spots}</p>
            <p className="text-white/80 text-sm">vagas disponíveis</p>
          </div>
        </div>

        <p className="text-xl text-white/90 mb-4">
          {data.subtitle}
        </p>

        <p className="text-white/80 mb-8">
          {data.description}
        </p>

        {/* Urgency indicators */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
            <Clock className="w-4 h-4 text-white" />
            <span className="text-white text-sm">Turma única</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span className="text-white text-sm">Sem previsão de nova turma</span>
          </div>
        </div>

        {/* CTA */}
        <Button
          onClick={() => {
            console.log('[ScarcitySection] CTA clicked - scrolling to plans');
            document.getElementById('oferta')?.scrollIntoView({ behavior: 'smooth' });
          }}
          size="lg"
          className="bg-white hover:bg-white/90 text-red-600 font-bold px-12 py-7 text-lg rounded-xl shadow-lg transition-all hover:scale-105"
        >
          <span className="mr-2">👉</span>
          {cta}
          <ArrowRight className="ml-2 w-5 h-5 bounce-arrow" />
        </Button>
      </div>
    </section>
  );
};
