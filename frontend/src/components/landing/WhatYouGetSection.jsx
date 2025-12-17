import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Calendar,
  Layers,
  Camera,
  Apple,
  CheckSquare,
  CalendarCheck,
  BookOpen,
  RefreshCw,
  Download,
  Mail,
  Package,
  Smartphone
} from 'lucide-react';

const iconMap = {
  Calendar,
  Layers,
  Camera,
  Apple,
  CheckSquare,
  CalendarCheck,
  BookOpen,
  RefreshCw,
  Download,
  Mail,
};

export const WhatYouGetSection = ({ items }) => {
  return (
    <section className="py-20 md:py-28 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 rounded-full px-4 py-2 mb-6">
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">Conteúdo Completo</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              O Que Você Recebe
            </h2>

            <p className="text-lg text-slate-400 mb-10">
              Tudo que você precisa para manter seu peso de forma sustentável, organizado e acessível.
            </p>

            {/* Items Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {items.map((item, index) => {
                const IconComponent = iconMap[item.icon];
                return (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300 hover:bg-slate-800"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      {IconComponent && <IconComponent className="w-5 h-5 text-emerald-400" />}
                    </div>
                    <span className="text-slate-200 font-medium text-sm">{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right - Mockup */}
          <div className="relative">
            {/* E-book Mockup */}
            <div className="relative z-10">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-2xl p-6 shadow-inner">
                  <div className="space-y-4">
                    <div className="h-3 bg-slate-200 rounded-full w-3/4" />
                    <div className="h-3 bg-slate-100 rounded-full w-full" />
                    <div className="h-3 bg-slate-100 rounded-full w-5/6" />
                    <div className="h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl mt-4" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-16 bg-slate-100 rounded-lg" />
                      <div className="h-16 bg-slate-100 rounded-lg" />
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full w-2/3" />
                    <div className="h-3 bg-slate-100 rounded-full w-full" />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-white font-bold text-lg">Programa 4 Semanas</p>
                  <p className="text-emerald-200 text-sm">Pós-Ozempic</p>
                </div>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="absolute -bottom-8 -right-4 z-20">
              <div className="bg-slate-800 rounded-3xl p-2 shadow-2xl transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-2xl w-32 h-56 overflow-hidden">
                  <div className="bg-emerald-600 h-12 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="h-2 bg-slate-200 rounded-full w-full" />
                    <div className="h-2 bg-slate-100 rounded-full w-3/4" />
                    <div className="h-12 bg-emerald-100 rounded-lg mt-2" />
                    <div className="h-2 bg-slate-200 rounded-full w-1/2" />
                    <div className="h-2 bg-slate-100 rounded-full w-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
};
