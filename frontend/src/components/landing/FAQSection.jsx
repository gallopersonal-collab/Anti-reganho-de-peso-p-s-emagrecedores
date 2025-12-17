import React, { useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

export const FAQSection = ({ data }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    console.log('[FAQSection] Component mounted');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          console.log('[FAQSection] Section visible');
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#457B9D]/20 text-[#1D3557] rounded-full px-4 py-2 mb-6">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Dúvidas</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1D3557] mb-4">
            {data.title}
          </h2>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-4">
          {data.questions.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white rounded-2xl shadow-md border-0 overflow-hidden"
            >
              <AccordionTrigger className="px-6 py-4 text-left text-[#1D3557] font-semibold hover:no-underline hover:bg-[#457B9D]/5 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#457B9D]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-4 h-4 text-[#457B9D]" />
                  </div>
                  <span className="text-left">{item.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-[#1D3557]/70 leading-relaxed pl-11">
                  {item.answer}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
