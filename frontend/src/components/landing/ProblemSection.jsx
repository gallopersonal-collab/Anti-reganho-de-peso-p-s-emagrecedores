import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export const ProblemSection = ({ data }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[ProblemSection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[ProblemSection] Section visible');
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 rounded-full px-4 py-2 mb-6">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Atenção</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1D3557] mb-6">
            {data.title}
          </h2>
        </div>

        <div className="bg-[#F1FAEE] rounded-3xl p-8 md:p-12 relative overflow-hidden">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#457B9D]/10 rounded-full blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Image */}
            <div className="w-full md:w-1/3 flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1541534401786-2077eed87a74?w=400&q=80"
                alt="Mulher preocupada com peso"
                className="w-full h-48 md:h-64 object-cover rounded-2xl shadow-lg"
              />
            </div>

            {/* Text */}
            <div className="flex-1">
              <p className="text-lg md:text-xl text-[#1D3557]/80 leading-relaxed">
                {data.text}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
