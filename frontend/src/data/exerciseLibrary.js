// Biblioteca de ilustrações SVG + descrições técnicas para os exercícios.
// `iconFor(name)` faz o matching heurístico do nome do exercício.

const svg = (inner) =>
  `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

export const EXLIB = {
  squat: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="17" x2="40" y2="36" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="24" x2="18" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="24" x2="62" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="40,36 26,52 28,68" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="40,36 54,52 52,68" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="22" y1="68" x2="34" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="46" y1="68" x2="58" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Quadríceps, glúteos, isquiotibiais, core",
    desc: "Exercício composto fundamental para força e desenvolvimento dos membros inferiores.",
    tech: "Pés na largura dos ombros, joelhos alinhados com os pés, desça até coxa paralela ou abaixo. Coluna neutra, peito alto.",
    cue: "Empurre o chão para longe. Não deixe os joelhos caírem para dentro.",
  },
  deadlift: {
    svg: svg(`<circle cx="22" cy="14" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="22" y1="21" x2="52" y2="42" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="37" y1="31" x2="40" y2="62" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="45" y1="36" x2="48" y2="62" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="52" y1="42" x2="46" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="52" y1="42" x2="58" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="68" x2="50" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="52" y1="68" x2="62" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Isquiotibiais, glúteos, eretores da espinha, trapézio, core",
    desc: "Levantamento fundamental que trabalha praticamente toda a cadeia posterior.",
    tech: "Barra próxima às canelas, quadril dobrado, costas retas. Empurre o chão ao iniciar — não 'puxe' a barra.",
    cue: "Imagine que está afastando o chão de você. Trave o core antes de sair do chão.",
  },
  bench: {
    svg: svg(`<circle cx="14" cy="38" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="21" y1="38" x2="62" y2="38" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="35" y1="38" x2="30" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="50" y1="38" x2="55" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="20" x2="57" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="62,38 66,54 56,64" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="50" y1="64" x2="60" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Peitoral maior, deltóide anterior, tríceps",
    desc: "Exercício de empurrar clássico para o peitoral.",
    tech: "Arco natural na lombar, escápulas retraídas. Desça a barra até tocar o peito, cotovelos a 45-75°.",
    cue: "Tente 'dobrar' a barra ao redor do peito. Pés firmes no chão.",
  },
  row: {
    svg: svg(`<circle cx="20" cy="14" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="20" y1="21" x2="50" y2="40" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="32" y1="29" x2="36" y2="58" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="42" y1="34" x2="46" y2="55" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="50" y1="40" x2="44" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="50" y1="40" x2="58" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="38" y1="66" x2="48" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="52" y1="66" x2="62" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Latíssimo, rombóides, bíceps, deltóide posterior",
    desc: "Exercício de puxar para desenvolvimento das costas.",
    tech: "Tronco inclinado ~45°, costas retas. Puxe o cotovelo para trás, mantenha escápula retraída no topo.",
    cue: "Tente esmagar uma noz entre as escápulas no ponto final.",
  },
  pulldown: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="17" x2="40" y2="44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="26" x2="22" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="26" x2="58" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="20" x2="62" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="40,44 36,60 32,68" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="40,44 44,60 48,68" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
    muscles: "Latíssimo, bíceps, rombóides, core",
    desc: "Puxar vertical que desenvolve largura das costas.",
    tech: "Pegada um pouco mais larga que os ombros, tronco levemente inclinado. Puxe até a clavícula.",
    cue: "Inicie com as escápulas — deprime o ombro antes de puxar com o braço.",
  },
  press: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="17" x2="40" y2="44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="26" x2="20" y2="34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="26" x2="60" y2="34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="34" x2="20" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="60" y1="34" x2="60" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="10" x2="64" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="44" x2="34" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="44" x2="46" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="28" y1="66" x2="38" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="66" x2="50" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Deltóide, tríceps, trapézio superior, core",
    desc: "Empurrar vertical para ombros e estabilidade do core.",
    tech: "Barra na altura dos ombros, pegada um pouco mais larga. Pressione diretamente para cima.",
    cue: "Contraia o core como se fosse levar um soco. Tranque os glúteos.",
  },
  lunge: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="17" x2="40" y2="38" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="25" x2="24" y2="34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="25" x2="56" y2="34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="38" x2="28" y2="54" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="28" y1="54" x2="24" y2="70" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="38" x2="54" y2="50" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="54" y1="50" x2="60" y2="70" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="18" y1="70" x2="30" y2="70" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="54" y1="70" x2="64" y2="70" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Quadríceps, glúteos, isquios, estabilizadores do tornozelo",
    desc: "Unilateral para equilíbrio, força e simetria entre membros.",
    tech: "Passada ampla, joelho da frente alinhado com o segundo dedo. Joelho de trás próximo ao chão.",
    cue: "Desça verticalmente, não afunde para frente. Pressione o calcanhar da frente para voltar.",
  },
  hipthrust: {
    svg: svg(`<circle cx="14" cy="46" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="21" y1="46" x2="44" y2="46" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><polyline points="44,46 54,30 66,36" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="22" y1="52" x2="22" y2="68" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="52" x2="28" y2="68" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="68" x2="72" y2="68" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
    muscles: "Glúteo máximo, isquiotibiais, core",
    desc: "Um dos exercícios mais eficazes para ativação e hipertrofia do glúteo.",
    tech: "Escápulas apoiadas no banco, barra sobre o quadril. Empurre o quadril para cima até extensão completa.",
    cue: "Contraia o glúteo no topo. Não hiperestenda a lombar.",
  },
  plank: {
    svg: svg(`<circle cx="14" cy="36" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="21" y1="36" x2="65" y2="36" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="24" y1="36" x2="24" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="32" y1="36" x2="32" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="54" x2="38" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="65,36 68,54" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="60" y1="54" x2="74" y2="54" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
    muscles: "Core completo, glúteos, deltóides",
    desc: "Isométrico de estabilidade do core — base para todos os movimentos atléticos.",
    tech: "Antebraços no chão, corpo reto da cabeça ao calcanhar. Quadril neutro.",
    cue: "Contraia glúteos e core simultaneamente.",
  },
  crunch: {
    svg: svg(`<circle cx="42" cy="36" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><path d="M 42 43 Q 36 55 24 58" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="24" y1="58" x2="16" y2="52" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="58" x2="26" y2="52" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 42 43 Q 48 52 52 60" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="52,60 62,50 68,56" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="10" y1="60" x2="74" y2="60" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
    muscles: "Reto abdominal, oblíquos, flexores do quadril",
    desc: "Flexão do tronco para trabalho do core anterior.",
    tech: "Pés apoiados, lombar em contato com o chão. Suba fazendo curling da coluna.",
    cue: "Aproxime costelas do quadril, não o queixo dos joelhos.",
  },
  pushup: {
    svg: svg(`<circle cx="14" cy="28" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="21" y1="30" x2="60" y2="40" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="24" y1="30" x2="24" y2="46" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="34" y1="33" x2="34" y2="50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="46" x2="38" y2="46" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="60,40 64,56" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="58" y1="56" x2="70" y2="56" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
    muscles: "Peitoral, deltóide anterior, tríceps, core",
    desc: "Exercício de empurrar com peso corporal. Versátil e adaptável.",
    tech: "Corpo reto, mãos um pouco mais largas que os ombros. Desça o peito próximo ao chão.",
    cue: "Mantenha o corpo como uma prancha. Não deixe o quadril cair.",
  },
  run: {
    svg: svg(`<circle cx="38" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><path d="M 38 17 Q 42 28 40 38" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="40" y1="25" x2="20" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="25" x2="56" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 40 38 Q 32 48 28 62" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M 40 38 Q 52 46 56 58" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="22" y1="62" x2="34" y2="62" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="50" y1="58" x2="62" y2="58" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Quadríceps, isquios, glúteos, panturrilha, core",
    desc: "Aeróbico fundamental para condicionamento cardiovascular.",
    tech: "Postura ereta, leve inclinação. Passada sob o centro de gravidade. Cadência 170-180 ppm.",
    cue: "Aterrisse com o meio do pé, não com o calcanhar.",
  },
  curl: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="17" x2="40" y2="44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="28" x2="26" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 58 38 Q 64 26 56 16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="40" y1="28" x2="58" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="44" x2="34" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="44" x2="46" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="28" y1="66" x2="38" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="66" x2="50" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Bíceps braquial, braquial, braquiorradial",
    desc: "Isolamento para desenvolvimento do bíceps.",
    tech: "Cotovelos fixos ao lado do tronco. Supine o pulso no topo. Desça controlado.",
    cue: "Não balance o tronco para ganhar impulso.",
  },
  lateral: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="17" x2="40" y2="44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="26" x2="12" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="26" x2="68" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="24" x2="14" y2="28" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="66" y1="24" x2="70" y2="28" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="44" x2="34" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="44" x2="46" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="28" y1="66" x2="38" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="66" x2="50" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Deltóide medial, supraspinal, trapézio",
    desc: "Isolamento para o ombro lateral — cria a 'largura' visual.",
    tech: "Leve flexão de cotovelo fixada. Eleve os braços até altura dos ombros. Controle a descida.",
    cue: "Imagine despejar água de dois baldes enquanto eleva. Sem impulso.",
  },
  triceps: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="17" x2="40" y2="44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="22" x2="56" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="56" y1="18" x2="58" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 40 22 L 24 18 L 22 38" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="40" y1="44" x2="34" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="44" x2="46" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="28" y1="66" x2="38" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="66" x2="50" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Tríceps (3 porções), ancôneo",
    desc: "Isolamento do tríceps — essencial para força de empurrar.",
    tech: "Cotovelo fixo. Extenda completamente. Controle a fase excêntrica.",
    cue: "A única articulação que deve se mover é o cotovelo.",
  },
  jump: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="17" x2="40" y2="34" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="22" x2="20" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="22" x2="60" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="34" x2="28" y2="44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="28" y1="44" x2="24" y2="60" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="34" x2="52" y2="44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="52" y1="44" x2="56" y2="60" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="18" y1="60" x2="30" y2="60" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="50" y1="60" x2="62" y2="60" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Quadríceps, glúteos, panturrilha, core",
    desc: "Pliométrico para potência, explosão e condicionamento.",
    tech: "Agache levemente, salte com força. Aterrisse suave, absorvendo o impacto.",
    cue: "Aterrissagem suave protege os joelhos. Softlanding sempre.",
  },
  kettlebell: {
    svg: svg(`<circle cx="22" cy="16" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="22" y1="23" x2="48" y2="42" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="35" y1="32" x2="38" y2="58" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="42" y1="36" x2="46" y2="60" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="48" y1="42" x2="42" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="48" y1="42" x2="56" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="36" y1="68" x2="46" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="50" y1="68" x2="60" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Glúteos, isquios, eretores da espinha, deltóides, core",
    desc: "Balístico de hip hinge para potência posterior e condicionamento.",
    tech: "Quadril dobra para trás. Movimento gerado pela extensão explosiva do quadril, não pelos braços.",
    cue: "O KB deve 'flutuar' no topo. Os braços são extensões do quadril.",
  },
  birddog: {
    svg: svg(`<circle cx="50" cy="20" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="50" y1="27" x2="24" y2="38" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="24" y1="38" x2="14" y2="28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="38" x2="26" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="34" y1="38" x2="36" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="54" x2="40" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="50" y1="34" x2="66" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="50" y1="27" x2="50" y2="40" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="44" y1="40" x2="44" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
    muscles: "Eretores, glúteo, deltóide oposto, core",
    desc: "Estabilidade e controle motor — ideal para lombar e prevenção.",
    tech: "Quatro apoios, coluna neutra. Estenda braço + perna opostos. Quadril nivelado.",
    cue: "Imagine um copo d'água sobre as costas — não pode derramar.",
  },
  stretch: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><path d="M 40 17 Q 50 28 44 44" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="44" y1="26" x2="26" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="44" y1="26" x2="62" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="44" y1="44" x2="36" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="44" y1="44" x2="56" y2="56" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="56" y1="56" x2="54" y2="70" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="30" y1="66" x2="42" y2="66" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="48" y1="70" x2="60" y2="70" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Variável conforme o movimento",
    desc: "Mobilidade e flexibilidade para manutenção da amplitude articular.",
    tech: "Mantenha 20-30s para ganho de flexibilidade. Respire profundamente.",
    cue: "Dor é diferente de desconforto. Vá até a tensão, nunca além da dor.",
  },
  legpress: {
    svg: svg(`<circle cx="14" cy="30" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="21" y1="32" x2="46" y2="38" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="46" y1="38" x2="60" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="46" y1="38" x2="64" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="56" y1="24" x2="68" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="40" x2="14" y2="60" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="22" y1="40" x2="22" y2="60" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="60" x2="28" y2="60" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
    muscles: "Quadríceps, glúteos, isquios",
    desc: "Push de membros inferiores na máquina. Permite carga maior com menos stress lombar.",
    tech: "Pés na largura dos ombros. Não trave o joelho. Desça até 90° controlado.",
    cue: "Não deixe os joelhos caírem para dentro.",
  },
  glute: {
    svg: svg(`<circle cx="48" cy="22" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="48" y1="29" x2="22" y2="40" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="22" y1="40" x2="14" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="40" x2="24" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="36" y1="40" x2="34" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="54" x2="40" y2="54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="48" y1="34" x2="62" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="48" y1="29" x2="48" y2="44" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
    muscles: "Glúteo máximo, glúteo médio, piriforme",
    desc: "Isolamento do glúteo para ativação e hipertrofia.",
    tech: "Quatro apoios, joelho a 90°. Eleve a perna com foco na contração do glúteo.",
    cue: "Contraia o glúteo no topo por 1s. Sem rotação do quadril.",
  },
  bike: {
    svg: svg(`<circle cx="36" cy="12" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><path d="M 36 19 Q 38 30 42 36" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="40" y1="28" x2="22" y2="34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="28" x2="56" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 42 36 Q 36 46 28 50" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M 42 36 Q 50 44 56 52" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="42" cy="58" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="42" cy="58" r="3" fill="currentColor" fill-opacity="0.3"/>`),
    muscles: "Quadríceps, glúteos, panturrilha, cardiovascular",
    desc: "Aeróbico de baixo impacto. Ideal para populações com restrições articulares.",
    tech: "Banco na altura correta. Mantenha cadência constante. Postura ereta.",
    cue: "Cadência de 70-90 RPM é ideal para condicionamento.",
  },
  burpee: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="17" x2="40" y2="34" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="22" x2="20" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="22" x2="60" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="34" x2="28" y2="44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="28" y1="44" x2="24" y2="60" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="34" x2="52" y2="44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="52" y1="44" x2="56" y2="60" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="18" y1="60" x2="30" y2="60" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="50" y1="60" x2="62" y2="60" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Full body + cardiovascular",
    desc: "Funcional de alta intensidade que combina força e condicionamento.",
    tech: "Agachar — mãos no chão — saltar pernas para trás — flexão — pular para cima.",
    cue: "Controle gera longevidade — velocidade sem técnica gera lesão.",
  },
  mountainclimber: {
    svg: svg(`<circle cx="16" cy="28" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="23" y1="30" x2="62" y2="38" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="26" y1="30" x2="26" y2="46" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="34" y1="33" x2="34" y2="50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="46" x2="40" y2="46" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 62 38 Q 58 50 52 52" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="62" y1="38" x2="56" y2="62" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Core, deltóides, quadríceps, glúteos, cardiovascular",
    desc: "Dinâmico de core em posição de prancha com alta demanda cardio.",
    tech: "Prancha alta, alterne joelhos em direção ao peito. Quadris nivelados.",
    cue: "Mais rápido = mais cardio. Mais lento = mais core.",
  },
  calf: {
    svg: svg(`<circle cx="40" cy="10" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="17" x2="40" y2="44" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="26" x2="26" y2="34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="26" x2="54" y2="34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="44" x2="36" y2="60" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="44" x2="44" y2="60" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Gastrocnêmio, sóleo, tibial posterior",
    desc: "Isolamento para panturrilha — importante para atletismo e tornozelo.",
    tech: "Amplitude completa: desce até tensão, sobe até a ponta máxima.",
    cue: "A fase excêntrica é tão importante quanto a subida.",
  },
  legext: {
    svg: svg(`<circle cx="20" cy="26" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="20" y1="33" x2="46" y2="40" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="30" y1="36" x2="26" y2="52" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="38" y1="38" x2="34" y2="52" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 46 40 Q 46 52 48 62" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M 48 62 Q 58 62 66 54" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
    muscles: "Quadríceps (4 porções)",
    desc: "Isolamento do quadríceps. Útil para reforço pós-lesão de joelho.",
    tech: "Extensão completa sem hiperestender. Costas apoiadas no banco.",
    cue: "Fase excêntrica de 3s maximiza o ganho.",
  },
  superman: {
    svg: svg(`<circle cx="40" cy="28" r="7" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8"/><line x1="40" y1="35" x2="40" y2="54" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="40" x2="20" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="40" x2="60" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="54" x2="32" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="54" x2="48" y2="68" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
    muscles: "Eretores da espinha, glúteos, isquios, trapézio",
    desc: "Extensão em decúbito ventral para fortalecimento da cadeia posterior.",
    tech: "Deitado de bruços, eleve braços e pernas. Pescoço neutro.",
    cue: "Foco na contração lombar e glútea no topo.",
  },
};

const normalize = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function iconFor(name) {
  const n = normalize(name);
  if (/agacham|squat|goblet|sumo/.test(n)) return EXLIB.squat;
  if (/deadlift|levantamento terra|stiff/.test(n)) return EXLIB.deadlift;
  if (/supino|bench/.test(n)) return EXLIB.bench;
  if (/remada/.test(n)) return EXLIB.row;
  if (/puxada|pulldown|pull-up|muscle-up/.test(n)) return EXLIB.pulldown;
  if (/desenvolvimento|shoulder press/.test(n)) return EXLIB.press;
  if (/afundo|lunge|passada|avanco/.test(n)) return EXLIB.lunge;
  if (/hip thrust|elevacao pelvica|ponte glut/.test(n)) return EXLIB.hipthrust;
  if (/prancha|plank/.test(n)) return EXLIB.plank;
  if (/abdominal|crunch|v-sit|bicicleta ab/.test(n)) return EXLIB.crunch;
  if (/flexao|push-up|pushup/.test(n)) return EXLIB.pushup;
  if (/corrida|esteira|caminhada|sprint|run/.test(n)) return EXLIB.run;
  if (/rosca|curl/.test(n)) return EXLIB.curl;
  if (/elevacao lateral|lateral raise/.test(n)) return EXLIB.lateral;
  if (/triceps|tricep/.test(n)) return EXLIB.triceps;
  if (/salto|jump|box|pliom/.test(n)) return EXLIB.jump;
  if (/kettlebell|swing kb/.test(n)) return EXLIB.kettlebell;
  if (/bird dog|dead bug/.test(n)) return EXLIB.birddog;
  if (/superman|lombar/.test(n)) return EXLIB.superman;
  if (/alonga|mobilidade|stretch|hip 90|world greatest/.test(n)) return EXLIB.stretch;
  if (/leg press/.test(n)) return EXLIB.legpress;
  if (/gluteo|glut/.test(n)) return EXLIB.glute;
  if (/bicicleta ergom|bike|cycling|ergom/.test(n)) return EXLIB.bike;
  if (/burpee/.test(n)) return EXLIB.burpee;
  if (/mountain climber/.test(n)) return EXLIB.mountainclimber;
  if (/panturrilha|calf/.test(n)) return EXLIB.calf;
  if (/extensora|leg extension/.test(n)) return EXLIB.legext;
  return null;
}
