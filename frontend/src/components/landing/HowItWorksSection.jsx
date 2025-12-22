import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Pill, Dumbbell, Shield, ArrowRight } from 'lucide-react';

const iconMap = {
  Pill,
  Dumbbell,
  Shield
};

export const HowItWorksSection = ({ data }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[HowItWorksSection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[HowItWorksSection] Section visible');
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
      className={`py-16 md:py-24 bg-white transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#012578]/10 text-[#012578] rounded-full px-4 py-2 mb-6">
            <span className="text-sm font-medium">Metodologia</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#012578] mb-4">
            {data.title}
          </h2>
          <p className="text-lg text-[#012578]/70 max-w-2xl mx-auto">
            {data.description}
          </p>
        </div>

        {/* Phases */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {data.phases.map((phase, index) => {
            const IconComponent = iconMap[phase.icon];
            return (
              <div key={index} className="relative">
                <Card className="bg-[#FFFFFF] border-0 shadow-lg hover-lift h-full">
                  <CardContent className="p-8">
                    {/* Phase number */}
                    <div className="absolute -top-4 left-8">
                      <div className="w-8 h-8 bg-[#1CAF35] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {phase.phase}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="w-16 h-16 bg-[#012578] rounded-2xl flex items-center justify-center mb-6 mt-2">
                      {IconComponent && (
                        <IconComponent className="w-8 h-8 text-[#FFFFFF]" />
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-[#012578] mb-3">
                      {phase.title}
                    </h3>
                    <p className="text-[#012578]/70 leading-relaxed">
                      {phase.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Arrow connector */}
                {index < data.phases.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-8 h-8 text-[#1CAF35]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
