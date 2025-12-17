import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, FileText } from 'lucide-react';

export const UniversalInfoSection = ({ data }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[UniversalInfoSection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[UniversalInfoSection] Section visible');
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Stat Card */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="bg-white rounded-3xl p-8 md:p-12 text-center shadow-2xl">
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-10 h-10 text-red-500" />
                </div>
                <p className="text-6xl md:text-7xl font-bold text-[#1D3557] mb-2">{data.stat}</p>
                <p className="text-[#457B9D] font-medium">{data.statLabel}</p>
              </div>
              
              {/* Study badge */}
              <div className="absolute -bottom-4 -right-4 bg-[#457B9D] text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-semibold">ESTUDO CIENTÍFICO</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#F1FAEE] mb-6">
              {data.title}
            </h2>
            <p className="text-lg text-[#F1FAEE]/80 leading-relaxed">
              {data.text}
            </p>
            
            {/* Visual indicator */}
            <div className="mt-8 bg-[#457B9D]/30 rounded-2xl p-6">
              <p className="text-[#F1FAEE] text-sm font-medium mb-3">Efeito Sanfona</p>
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-${i % 2 === 0 ? '8' : '12'} w-4 bg-[#F1FAEE]/${i % 2 === 0 ? '40' : '70'} rounded`}
                    style={{ height: i % 2 === 0 ? '32px' : '48px' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
