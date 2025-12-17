import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, Sparkles, Users } from 'lucide-react';

export const FutureSection = ({ data }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[FutureSection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[FutureSection] Section visible');
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
          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#457B9D]/30 text-[#F1FAEE] rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Futuro Presumido</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#F1FAEE] mb-6">
              {data.title}
            </h2>
            <p className="text-lg text-[#F1FAEE]/80 leading-relaxed">
              {data.description}
            </p>
          </div>

          {/* Highlights */}
          <div className="grid gap-4">
            {data.highlights.map((highlight, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all duration-300"
              >
                <p className="text-3xl md:text-4xl font-bold text-[#F1FAEE] mb-1">
                  {highlight.value}
                </p>
                <p className="text-[#F1FAEE]/70">{highlight.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Chart Visual */}
        <div className="mt-12 bg-[#457B9D]/20 rounded-3xl p-8">
          <div className="flex items-end justify-center gap-4 h-32">
            {[20, 35, 50, 70, 100].map((height, index) => (
              <div
                key={index}
                className="w-12 md:w-16 bg-gradient-to-t from-[#457B9D] to-[#F1FAEE] rounded-t-lg transition-all duration-500"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <TrendingUp className="w-5 h-5 text-[#F1FAEE]" />
            <p className="text-[#F1FAEE] font-medium">Crescimento do seu negócio</p>
          </div>
        </div>
      </div>
    </section>
  );
};
