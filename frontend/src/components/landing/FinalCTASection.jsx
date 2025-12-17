import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Clock, Award } from 'lucide-react';

export const FinalCTASection = ({ cta, checkoutLink }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[FinalCTASection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[FinalCTASection] Section visible');
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#F1FAEE] mb-6">
          Pronto para Transformar Sua Carreira?
        </h2>
        
        <p className="text-lg text-[#F1FAEE]/80 mb-8 max-w-2xl mx-auto">
          Junte-se aos profissionais que estão se destacando no mercado com o Método Anti-Reganho de Peso.
        </p>

        {/* Main CTA Button */}
        <Button
          onClick={() => {
            console.log('[FinalCTASection] CTA clicked');
            window.location.href = checkoutLink;
          }}
          size="lg"
          className="bg-[#457B9D] hover:bg-[#457B9D]/90 text-white font-bold px-12 py-8 text-xl rounded-xl shadow-lg shadow-[#457B9D]/30 transition-all hover:scale-105 pulse-cta"
        >
          <span className="mr-2 text-2xl">👉</span>
          {cta}
          <ArrowRight className="ml-3 w-6 h-6 bounce-arrow" />
        </Button>

        {/* Trust indicators */}
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          {[
            { icon: Shield, text: 'Acesso Completo' },
            { icon: Clock, text: 'Suporte Dedicado' },
            { icon: Award, text: 'Certificado Incluso' }
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-[#F1FAEE]/70">
              <item.icon className="w-5 h-5 text-[#457B9D]" />
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
