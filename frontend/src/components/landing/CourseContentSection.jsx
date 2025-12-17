import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Brain, ClipboardList, Apple, Layers, Users, DollarSign } from 'lucide-react';

const iconMap = {
  Brain,
  ClipboardList,
  Apple,
  Layers,
  Users,
  DollarSign
};

export const CourseContentSection = ({ data }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[CourseContentSection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[CourseContentSection] Section visible');
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
      id="conteudo"
      className={`py-16 md:py-24 bg-white transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#1D3557]/10 text-[#1D3557] rounded-full px-4 py-2 mb-6">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Grade Curricular</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1D3557] mb-4">
            {data.title}
          </h2>
          <p className="text-lg text-[#1D3557]/70 max-w-2xl mx-auto">
            6 módulos completos para você dominar o Método Anti-Reganho de Peso
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.modules.map((module, index) => {
            const IconComponent = iconMap[module.icon];
            return (
              <Card
                key={index}
                className="bg-[#F1FAEE] border-0 shadow-lg hover-lift group overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Module Number */}
                    <div className="flex-shrink-0 w-12 h-12 bg-[#1D3557] rounded-xl flex items-center justify-center text-white font-bold text-lg group-hover:bg-[#457B9D] transition-colors duration-300">
                      {module.number}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {IconComponent && (
                          <IconComponent className="w-5 h-5 text-[#457B9D]" />
                        )}
                        <span className="text-xs font-semibold text-[#457B9D] uppercase">
                          Módulo {module.number}
                        </span>
                      </div>
                      <h3 className="text-[#1D3557] font-semibold leading-snug">
                        {module.title}
                      </h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
