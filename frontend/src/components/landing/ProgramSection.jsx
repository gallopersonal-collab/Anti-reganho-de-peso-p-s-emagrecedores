import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Dumbbell, Zap, Target, Calendar, ArrowRight } from 'lucide-react';

const iconMap = {
  Flame: Flame,
  Dumbbell: Dumbbell,
  Zap: Zap,
  Target: Target,
};

export const ProgramSection = ({ weeks, kiwifyLink }) => {
  return (
    <section id="programa" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-2 mb-6">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Visão Geral</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            O Programa de 4 Semanas
          </h2>
          
          <p className="text-lg text-slate-600">
            Um protocolo completo e progressivo para manter seu peso conquistado, mesmo após parar a medicação.
          </p>
        </div>

        {/* Week Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {weeks.map((week, index) => {
            const IconComponent = iconMap[week.icon];
            return (
              <Card
                key={index}
                className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                {/* Top Gradient Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                
                <CardContent className="p-6 pt-8">
                  {/* Week Number */}
                  <div className="inline-flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1 mb-4">
                    <span className="text-xs font-semibold text-slate-600">SEMANA {week.week}</span>
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    {IconComponent && <IconComponent className="w-7 h-7 text-white" />}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {week.title}
                  </h3>
                  
                  <p className="text-slate-600">
                    {week.description}
                  </p>
                </CardContent>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Card>
            );
          })}
        </div>

        {/* Timeline Visual */}
        <div className="hidden lg:flex items-center justify-center gap-4 mb-12">
          {weeks.map((week, index) => (
            <React.Fragment key={index}>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                  {week.week}
                </div>
              </div>
              {index < weeks.length - 1 && (
                <div className="flex-1 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full max-w-[120px]" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={() => window.open(kiwifyLink, '_blank')}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg transition-all hover:scale-105"
          >
            Ver Treinos da Semana
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};
