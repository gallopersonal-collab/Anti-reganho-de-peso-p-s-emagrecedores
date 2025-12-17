import React from 'react';
import { Shield, CheckCircle } from 'lucide-react';

export const GuaranteeSection = ({ data }) => {
  return (
    <section className="py-16 md:py-20 bg-emerald-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center">
          {/* Shield Icon */}
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="w-10 h-10 text-emerald-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {data.title}
          </h2>

          {/* Description */}
          <p className="text-lg text-slate-600 mb-4 max-w-2xl mx-auto">
            {data.description}
          </p>

          <p className="text-slate-500 mb-8">
            {data.subtext}
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              'Pagamento Seguro',
              'Acesso Imediato',
              'Suporte Dedicado'
            ].map((badge, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-600">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
