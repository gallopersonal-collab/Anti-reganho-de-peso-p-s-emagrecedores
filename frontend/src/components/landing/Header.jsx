import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export const Header = ({ checkoutLink }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    console.log('[Header] Component mounted');
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    console.log('[Header] Scrolling to section:', id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#012578]/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#1CAF35] flex items-center justify-center">
              <span className="text-white font-bold text-lg">AR</span>
            </div>
            <span className="font-semibold text-lg text-[#FFFFFF] hidden sm:block">
              Método Anti-Reganho
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: 'Como Funciona', id: 'como-funciona' },
              { label: 'Benefícios', id: 'beneficios' },
              { label: 'Oferta', id: 'oferta' },
              { label: 'FAQ', id: 'faq' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-medium text-[#FFFFFF]/80 hover:text-[#FFFFFF] transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => {
                console.log('[Header] CTA clicked - scrolling to plans');
                document.getElementById('oferta')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden sm:flex bg-[#1CAF35] hover:bg-[#1CAF35]/90 text-white font-semibold px-6 transition-transform hover:scale-105"
            >
              Garantir Vaga
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#FFFFFF]"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#012578] rounded-b-2xl shadow-xl pb-6">
            <nav className="flex flex-col gap-2 px-4 pt-4">
              {[
                { label: 'Como Funciona', id: 'como-funciona' },
                { label: 'Benefícios', id: 'beneficios' },
                { label: 'Oferta', id: 'oferta' },
                { label: 'FAQ', id: 'faq' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-left py-3 px-4 text-[#FFFFFF] font-medium rounded-lg hover:bg-[#1CAF35]/20 transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <Button
                onClick={() => {
                  console.log('[Header] Mobile CTA clicked - scrolling to plans');
                  document.getElementById('oferta')?.scrollIntoView({ behavior: 'smooth' });
                  setIsMobileMenuOpen(false);
                }}
                className="mt-4 bg-[#1CAF35] hover:bg-[#1CAF35]/90 text-white font-semibold w-full"
              >
                Garantir Vaga
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
