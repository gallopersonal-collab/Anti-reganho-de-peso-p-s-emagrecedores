import React from 'react';
import { TrendingUp, Activity, Leaf, Award, Lightbulb } from 'lucide-react';

const iconMap = {
  TrendingUp,
  Activity,
  Leaf,
  Award,
};

export const WhyItWorksSection = ({ items }) => {
  return (
    <section className="py-20 md:py-28 bg-emerald-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 rounded-full px-4 py-2 mb-6">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-medium">Ciência</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Por Que Funciona?
          </h2>
          
          <p className="text-lg text-emerald-200">
            Baseado em princípios científicos de fisiologia do exercício e controle do apetite.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => {
            const IconComponent = iconMap[item.icon];
            return (
              <div
                key={index}
                className="group bg-emerald-800 border border-emerald-600/50 rounded-2xl p-6 hover:bg-emerald-700 transition-all duration-300 hover:-translate-y-1 shadow-lg"
              >
                <div className="w-14 h-14 bg-emerald-500/30 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/40 transition-colors">
                  {IconComponent && <IconComponent className="w-7 h-7 text-emerald-300" />}
                </div>
                
                <p className="text-white font-medium leading-relaxed text-base">
                  {item.title}
                </p>
              </div>
            );
          })}
        </div>

        {/* Visual Infographic */}
        <div className="mt-16 bg-emerald-800/30 rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-10 h-10 text-emerald-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Treino de Força</h4>
              <p className="text-emerald-200 text-sm">Aumenta massa muscular e metabolismo basal</p>
            </div>

            <div className="hidden md:flex items-center justify-center">
              <div className="flex items-center gap-4">
                <div className="h-px w-16 bg-emerald-500/50" />
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">=</span>
                </div>
                <div className="h-px w-16 bg-emerald-500/50" />
              </div>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <Activity className="w-10 h-10 text-emerald-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Saciedade Natural</h4>
              <p className="text-emerald-200 text-sm">Controle do apetite sem medicação</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
