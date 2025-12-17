import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, GraduationCap, Award, TrendingUp, Users } from 'lucide-react';

const iconMap = {
  Dumbbell,
  GraduationCap,
  Award,
  TrendingUp
};

export const TargetAudienceSection = ({ data }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[TargetAudienceSection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[TargetAudienceSection] Section visible');
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
      className={`py-16 md:py-24 bg-[#F1FAEE] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#457B9D]/20 text-[#1D3557] rounded-full px-4 py-2 mb-6">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Público-Alvo</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1D3557] mb-4">
            {data.title}
          </h2>
          <p className="text-lg text-[#1D3557]/70 max-w-2xl mx-auto">
            {data.description}
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.items.map((item, index) => {
            const IconComponent = iconMap[item.icon];
            return (
              <Card
                key={index}
                className="bg-white border-0 shadow-lg hover-lift overflow-hidden group"
              >
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-[#457B9D]/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#457B9D] transition-colors duration-300">
                    {IconComponent && (
                      <IconComponent className="w-7 h-7 text-[#457B9D] group-hover:text-white transition-colors duration-300" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-[#1D3557] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[#1D3557]/70 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
