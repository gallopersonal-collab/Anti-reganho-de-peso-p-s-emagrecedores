import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Layers3 } from 'lucide-react';

export const ExercisesSection = ({ exercises }) => {
  return (
    <section id="exercicios" className="py-20 md:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-2 mb-6">
            <Layers3 className="w-4 h-4" />
            <span className="text-sm font-medium">Imagens Técnicas</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Exercícios do Programa
          </h2>
          
          <p className="text-lg text-slate-600">
            Cada exercício com fotos reais e indicação dos músculos trabalhados para execução perfeita.
          </p>
        </div>

        {/* Carousel */}
        <div className="relative px-12">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {exercises.map((exercise, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={exercise.image}
                        alt={exercise.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                      
                      {/* Exercise Name Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-xl font-bold text-white mb-1">{exercise.name}</h3>
                      </div>

                      {/* 3D Badge */}
                      <div className="absolute top-4 right-4">
                        <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                          <Layers3 className="w-3 h-3" />
                          3D
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-4 bg-white">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-slate-600">
                          <span className="font-medium text-slate-800">Músculos: </span>
                          {exercise.muscles}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 bg-white shadow-lg border-slate-200 hover:bg-emerald-50 hover:border-emerald-200" />
            <CarouselNext className="-right-4 bg-white shadow-lg border-slate-200 hover:bg-emerald-50 hover:border-emerald-200" />
          </Carousel>
        </div>

        {/* Exercise List */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-600" />
            Lista Completa de Exercícios
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              'Agachamento', 'Afundo', 'Stiff', 'Remada Curvada',
              'Remada Unilateral', 'Supino no Solo', 'Elevação Pélvica', 'Desenvolvimento',
              'Elevação Lateral', 'Prancha', 'Abdução com Elástico', 'Ponte Unilateral'
            ].map((name, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg text-sm text-slate-700"
              >
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-semibold text-xs">
                  {index + 1}
                </div>
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
