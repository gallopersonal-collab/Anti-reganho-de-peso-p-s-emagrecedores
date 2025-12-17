import React from 'react';
import { Award, BookOpen, Heart, GraduationCap } from 'lucide-react';

export const AuthorSection = ({ data }) => {
  return (
    <section id="sobre" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Image */}
          <div className="relative">
            <div className="relative">
              {/* Main Image */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={data.image}
                  alt={data.name}
                  className="w-full h-[500px] object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
              </div>

              {/* Experience Badge */}
              <div className="absolute -bottom-6 left-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600">36+</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900">Anos de</p>
                  <p className="text-slate-600">Experiência</p>
                </div>
              </div>

              {/* Decorative */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-emerald-100 rounded-full blur-2xl" />
            </div>
          </div>

          {/* Right - Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-2 mb-6">
              <GraduationCap className="w-4 h-4" />
              <span className="text-sm font-medium">Sobre o Autor</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              {data.name}
            </h2>

            <p className="text-xl text-emerald-600 font-medium mb-6">
              {data.title}
            </p>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              {data.experience}
            </p>

            {/* Credentials */}
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Heart, label: 'Fisiologista do Exercício' },
                { icon: Award, label: 'Personal Trainer' },
                { icon: BookOpen, label: 'Fisioterapeuta' },
                { icon: GraduationCap, label: 'Nutricionista' },
              ].map((credential, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <credential.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="font-medium text-slate-700">{credential.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
