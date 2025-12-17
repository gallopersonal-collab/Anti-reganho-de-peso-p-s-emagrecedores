import React from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, ArrowRight } from 'lucide-react';

export const ProblemSection = ({ data }) => {
  return (
    <section className="py-20 md:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 rounded-full px-4 py-2 mb-6">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Atenção</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">
              {data.title}
            </h2>

            <div className="space-y-4 mb-8">
              {data.problems.map((problem, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-red-100"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 font-bold text-sm">{index + 1}</span>
                  </div>
                  <p className="text-slate-700 text-lg">{problem}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl mb-6">
              <p className="text-amber-800 font-medium text-lg">{data.disclaimer}</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl">
              <div className="flex items-start gap-3">
                <ArrowRight className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
                <p className="text-emerald-800 text-lg leading-relaxed">{data.solution}</p>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
              <h3 className="text-xl font-semibold text-slate-800 mb-8 text-center">O que acontece ao parar a medicação</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-red-600" />
                    </div>
                    <span className="font-medium text-slate-700">Apetite</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600 font-bold">
                    <span>+65%</span>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-orange-600" />
                    </div>
                    <span className="font-medium text-slate-700">Metabolismo</span>
                  </div>
                  <div className="flex items-center gap-2 text-orange-600 font-bold">
                    <span>-30%</span>
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-red-600" />
                    </div>
                    <span className="font-medium text-slate-700">Risco de Regain</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600 font-bold">
                    <span>Alto</span>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-center text-slate-500 text-sm">Baseado em estudos clínicos sobre descontinuação de GLP-1</p>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-100 rounded-full blur-2xl opacity-60" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-teal-100 rounded-full blur-2xl opacity-60" />
          </div>
        </div>
      </div>
    </section>
  );
};
