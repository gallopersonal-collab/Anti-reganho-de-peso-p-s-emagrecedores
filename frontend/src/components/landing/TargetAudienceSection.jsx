import React from 'react';
import { Check, Users } from 'lucide-react';

export const TargetAudienceSection = ({ items }) => {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Image */}
          <div className="relative order-2 lg:order-1">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.pexels.com/photos/8172947/pexels-photo-8172947.jpeg?w=800&q=80"
                alt="Pessoas treinando"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 to-transparent" />
            </div>

            {/* Floating Card */}
            <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl p-6 max-w-[200px]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">30-60</p>
                  <p className="text-xs text-slate-500">anos</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">Homens e mulheres</p>
            </div>

            {/* Decorative */}
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-emerald-100 rounded-full blur-2xl" />
          </div>

          {/* Right - Content */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-2 mb-6">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Público-Alvo</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Para Quem é Esse Programa?
            </h2>

            <p className="text-lg text-slate-600 mb-10">
              Se você se identifica com algum desses pontos, este programa foi feito para você.
            </p>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors duration-300 group"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-slate-700 text-lg font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
