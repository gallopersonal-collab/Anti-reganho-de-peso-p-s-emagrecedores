import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export const Header = ({ kiwifyLink }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
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
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">AR</span>
            </div>
            <span className={`font-semibold text-lg hidden sm:block transition-colors duration-300 ${
              isScrolled ? 'text-slate-800' : 'text-white'
            }`}>
              Método Anti-Reganho
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: 'Programa', id: 'programa' },
              { label: 'Exercícios', id: 'exercicios' },
              { label: 'Depoimentos', id: 'depoimentos' },
              { label: 'Sobre', id: 'sobre' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-medium transition-colors hover:text-emerald-500 ${
                  isScrolled ? 'text-slate-600' : 'text-white/90'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => window.open(kiwifyLink, '_blank')}
              className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 transition-transform hover:scale-105"
            >
              Começar Agora
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                isScrolled ? 'text-slate-800' : 'text-white'
              }`}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white rounded-b-2xl shadow-xl pb-6 animate-in slide-in-from-top duration-200">
            <nav className="flex flex-col gap-2 px-4 pt-4">
              {[
                { label: 'Programa', id: 'programa' },
                { label: 'Exercícios', id: 'exercicios' },
                { label: 'Depoimentos', id: 'depoimentos' },
                { label: 'Sobre', id: 'sobre' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-left py-3 px-4 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <Button
                onClick={() => window.open(kiwifyLink, '_blank')}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full"
              >
                Começar Agora
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
