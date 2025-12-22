import React, { useEffect } from 'react';
import { MessageCircle, Instagram, Youtube } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    console.log('[Footer] Component mounted');
  }, []);

  return (
    <footer className="bg-[#012578] text-[#FFFFFF]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 md:py-16 grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#1CAF35] flex items-center justify-center">
                <span className="text-white font-bold text-lg">AR</span>
              </div>
              <span className="font-semibold text-lg text-[#FFFFFF]">Método Anti-Reganho</span>
            </div>
            <p className="text-sm leading-relaxed">
              Curso de Especialista no Método Anti-Reganho de Peso para Personal Trainer e Profissionais de Educação Física que querem se especializar em acompanhamento de alunos que usam ou usaram medicamentos emagrecedores.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-[#FFFFFF] mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              {[
                { label: 'Como Funciona', href: '#como-funciona' },
                { label: 'Benefícios', href: '#beneficios' },
                { label: 'Oferta', href: '#oferta' },
                { label: 'FAQ', href: '#faq' },
              ].map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm hover:text-[#1CAF35] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-[#FFFFFF] mb-4">Contato</h4>
            <div className="space-y-3">
              <a
                href="https://wa.me/5571992893333"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:text-[#1CAF35] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp 71 99289-3333
              </a>
            </div>

            {/* Social */}
            <div className="flex items-center gap-4 mt-6">
              <a
                href="#"
                className="w-10 h-10 bg-[#1CAF35]/20 rounded-full flex items-center justify-center hover:bg-[#1CAF35] transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-[#1CAF35]/20 rounded-full flex items-center justify-center hover:bg-[#1CAF35] transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1CAF35]/30 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-center md:text-left">
            © {currentYear} José Carlos Gallo - Método Anti-Reganho. Todos os direitos reservados.
          </p>
          <p className="text-sm">
            Desenvolvido por José Carlos Gallo
          </p>
        </div>
      </div>
    </footer>
  );
};
