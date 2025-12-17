import React from 'react';
import { Mail, Instagram, Youtube, Heart } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 md:py-16 grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">JG</span>
              </div>
              <span className="font-semibold text-lg text-white">Método Gallo</span>
            </div>
            <p className="text-sm leading-relaxed">
              Programa de 4 semanas para manter o peso após Ozempic/Mounjaro. Criado por José Carlos Gallo.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              {[
                { label: 'Programa', href: '#programa' },
                { label: 'Exercícios', href: '#exercicios' },
                { label: 'Depoimentos', href: '#depoimentos' },
                { label: 'Sobre', href: '#sobre' },
              ].map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contato</h4>
            <div className="space-y-3">
              <a
                href="mailto:contato@metodogallo.com.br"
                className="flex items-center gap-2 text-sm hover:text-emerald-400 transition-colors"
              >
                <Mail className="w-4 h-4" />
                contato@metodogallo.com.br
              </a>
            </div>

            {/* Social */}
            <div className="flex items-center gap-4 mt-6">
              <a
                href="#"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-center md:text-left">
            © {currentYear} Método Gallo. Todos os direitos reservados.
          </p>
          <p className="text-sm flex items-center gap-1">
            Feito com <Heart className="w-4 h-4 text-red-500 fill-current" /> por José Carlos Gallo
          </p>
        </div>
      </div>
    </footer>
  );
};
