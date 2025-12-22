import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Gift, ClipboardCheck, MessageCircle } from 'lucide-react';

const iconMap = {
  ClipboardCheck,
  MessageCircle
};

export const BonusSection = ({ data }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[BonusSection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[BonusSection] Section visible');
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 rounded-full px-4 py-2 mb-6">
            <Gift className="w-4 h-4" />
            <span className="text-sm font-medium">Bônus Exclusivos</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#012578] mb-4">
            {data.title}
          </h2>
        </div>

        {/* Bonus Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {data.bonuses.map((bonus, index) => {
            const IconComponent = iconMap[bonus.icon];
            return (
              <Card
                key={index}
                className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-lg hover-lift"
              >
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                      {IconComponent && (
                        <IconComponent className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🎁</span>
                        <h3 className="text-xl font-bold text-[#012578]">
                          {bonus.title}
                        </h3>
                      </div>
                      <p className="text-[#012578]/70 leading-relaxed">
                        {bonus.description}
                      </p>
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
