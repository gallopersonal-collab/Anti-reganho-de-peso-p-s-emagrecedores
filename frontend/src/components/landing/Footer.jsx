import React, { useEffect } from 'react';
import { Mail, Instagram, Youtube } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    console.log('[Footer] Component mounted');
  }, []);

  return (
    <footer className="bg-[#1D3557] text-[#F1FAEE]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 md:py-16 grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#457B9D] flex items-center justify-center">
                <span className="text-white font-bold text-lg">AR</span>
              </div>
              <span className="font-semibold text-lg text-[#F1FAEE]">Método Anti-Reganho</span>
            </div>
            <p className="text-sm leading-relaxed">
              Curso de Especialista no Método Anti-Reganho de Peso para Profissionais de Educação Física que querem se especializar em acompanhamento de alunos que usam ou usaram medicamentos emagrecedores.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-[#F1FAEE] mb-4">Links Rápidos</h4>
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
                    className="text-sm hover:text-[#457B9D] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-[#F1FAEE] mb-4">Contato</h4>
            <div className="space-y-3">
              <a
                href="mailto:contato@metodoreganho.com.br"
                className="flex items-center gap-2 text-sm hover:text-[#457B9D] transition-colors"
              >
                <Mail className="w-4 h-4" />
                contato@metodoreganho.com.br
              </a>
            </div>

            {/* Social */}
            <div className="flex items-center gap-4 mt-6">
              <a
                href="#"
                className="w-10 h-10 bg-[#457B9D]/20 rounded-full flex items-center justify-center hover:bg-[#457B9D] transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-[#457B9D]/20 rounded-full flex items-center justify-center hover:bg-[#457B9D] transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#457B9D]/30 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-center md:text-left">
            © {currentYear} Método Anti-Reganho. Todos os direitos reservados.
          </p>
          <p className="text-sm">
            Desenvolvido por José Carlos Gallo
          </p>
        </div>
      </div>
    </footer>
  );
};
