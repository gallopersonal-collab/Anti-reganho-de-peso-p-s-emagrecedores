import React, { useEffect, useRef, useState } from 'react';
import { Check, Tag, TrendingDown } from 'lucide-react';

export const AnchorSection = ({ data }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[AnchorSection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[AnchorSection] Section visible');
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
      className={`py-16 md:py-24 bg-[#012578] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#1CAF35]/30 text-[#FFFFFF] rounded-full px-4 py-2 mb-6">
            <Tag className="w-4 h-4" />
            <span className="text-sm font-medium">Investimento</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#FFFFFF] mb-4">
            {data.title}
          </h2>
          <p className="text-lg text-[#FFFFFF]/80 max-w-2xl mx-auto">
            {data.description}
          </p>
        </div>

        {/* Anchor Price Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-2xl mx-auto">
          {/* Original Value Header */}
          <div className="bg-gradient-to-r from-[#1CAF35] to-[#012578] p-6 text-center">
            <p className="text-[#FFFFFF]/80 text-sm mb-1">{data.originalLabel}</p>
            <div className="relative inline-block">
              <p className="text-5xl md:text-6xl font-bold text-white">
                {data.originalValue}
              </p>
              {/* Strikethrough line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-red-500 transform -rotate-6"></div>
            </div>
          </div>

          {/* What's Included */}
          <div className="p-8">
            <p className="font-semibold text-[#012578] mb-4 text-center">
              O que está incluído neste valor:
            </p>
            <div className="space-y-3 mb-6">
              {data.includes.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#1CAF35]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-[#1CAF35]" />
                  </div>
                  <span className="text-[#012578]/80">{item}</span>
                </div>
              ))}
            </div>

            {/* Savings Badge */}
            <div className="bg-green-100 border-2 border-green-500 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <TrendingDown className="w-6 h-6" />
                <span className="text-xl font-bold">{data.savings}</span>
              </div>
              <p className="text-green-600 text-sm mt-1">
                Apenas nesta turma especial de lançamento
              </p>
            </div>
          </div>

          {/* Arrow Down */}
          <div className="bg-[#FFFFFF] py-4 text-center">
            <div className="inline-flex flex-col items-center">
              <p className="text-[#012578] font-semibold mb-2">Veja os valores especiais abaixo</p>
              <div className="w-10 h-10 bg-[#1CAF35] rounded-full flex items-center justify-center animate-bounce">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
