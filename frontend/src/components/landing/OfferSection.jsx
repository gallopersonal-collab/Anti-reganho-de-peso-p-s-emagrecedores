import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Check, ArrowRight, Crown, AlertTriangle } from 'lucide-react';

export const OfferSection = ({ data, checkoutLink }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[OfferSection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[OfferSection] Section visible');
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
      id="oferta"
      className={`py-16 md:py-24 bg-[#FFFFFF] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#012578] text-white rounded-full px-4 py-2 mb-6">
            <Crown className="w-4 h-4" />
            <span className="text-sm font-medium">Oferta Especial</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#012578] mb-4">
            {data.title}
          </h2>
          <p className="text-[#012578] text-lg md:text-xl font-medium max-w-2xl mx-auto">
            ⚠️ Inscrições encerram em <strong>15/01/2026 às 23:59</strong> — Após essa data, não será possível participar desta turma
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {data.plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden border-2 ${
                plan.highlighted
                  ? 'border-[#1CAF35] shadow-2xl scale-105 z-10'
                  : 'border-transparent shadow-lg'
              } hover-lift`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 left-0 right-0 bg-[#1CAF35] text-white text-center py-2 text-sm font-semibold">
                  MAIS COMPLETO
                </div>
              )}
              <CardHeader className={`text-center ${plan.highlighted ? 'pt-12' : 'pt-6'} pb-4`}>
                <h3 className="text-xl font-bold text-[#012578]">{plan.name}</h3>
                <p className="text-sm text-[#012578]/60">{plan.description}</p>
                <p className="text-4xl font-bold text-[#012578] mt-4">{plan.price}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#1CAF35] flex-shrink-0 mt-0.5" />
                      <span className="text-[#012578]/80 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => {
                    console.log('[OfferSection] Plan selected:', plan.name);
                    const link = plan.checkoutLink || checkoutLink;
                    window.open(link, '_blank');
                  }}
                  className={`w-full ${
                    plan.highlighted
                      ? 'bg-[#1CAF35] hover:bg-[#1CAF35]/90'
                      : 'bg-[#012578] hover:bg-[#012578]/90'
                  } text-white font-semibold py-6 rounded-xl transition-all hover:scale-105`}
                >
                  Escolher Plano
                </Button>
              </CardContent>

            </Card>
          ))}
        </div>

        {/* Main CTA */}
        <div className="text-center">
          <Button
            onClick={() => {
              console.log('[OfferSection] Main CTA clicked');
              window.location.href = checkoutLink;
            }}
            size="lg"
            className="bg-[#1CAF35] hover:bg-[#1CAF35]/90 text-white font-bold px-12 py-7 text-lg rounded-xl shadow-lg shadow-[#1CAF35]/30 transition-all hover:scale-105 pulse-cta"
          >
            <span className="mr-2">👉</span>
            {data.cta}
            <ArrowRight className="ml-2 w-5 h-5 bounce-arrow" />
          </Button>
        </div>
      </div>
    </section>
  );
};
