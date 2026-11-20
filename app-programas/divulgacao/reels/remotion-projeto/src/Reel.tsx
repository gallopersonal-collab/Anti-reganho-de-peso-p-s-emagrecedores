import React from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion';

export type Scene = {
  start: number; end: number;
  caption: string;           // legenda (fala)
  title?: string;            // texto de destaque no topo (até 6 palavras)
  img?: string;              // tela em public/
  kind?: 'phone' | 'slide' | 'cta' | 'end' | 'stat' | 'flow' | 'pdf';
  big?: string;              // número grande (cena stat)
  sub?: string;              // linha de apoio (cena stat)
  strike?: boolean;          // risca o número (cena stat)
  items?: string[];          // etapas (cena flow)
  photo?: string;            // foto redonda acima do número (cena stat)
  zoom?: [number, number];   // escala inicial/final
  focusY?: number;           // 0 = topo da tela, 1 = base (para o zoom)
};
export type ReelProps = { audio: string; duration: number; scenes: Scene[] };

const GOLD = '#d2a961', GOLD2 = '#e9c886', CREAM = '#f3ecdd', NAVY = '#0b1220';

const fontCss = `@font-face{font-family:'Bebas';src:url(${staticFile('bebas.woff2')}) format('woff2');}`;

const Phone: React.FC<{ src: string; zoom: [number, number]; focusY: number; dur: number }> = ({ src, zoom, focusY, dur }) => {
  // Tela do app em cartão grande; "zoom" aqui é o deslocamento vertical (0 = topo, 1 = base) do início ao fim da cena
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 18, mass: 0.7 } });
  const W = 960, VIEW = 860, FULL = Math.round(W * 2532 / 1170);
  const a = zoom[0] ?? focusY, b = zoom[1] ?? focusY;
  const pos = interpolate(f, [0, dur], [a, b], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const ty = -pos * (FULL - VIEW);
  return (
    <div style={{ position: 'absolute', left: 60, top: 600, width: W, height: VIEW, borderRadius: 34, overflow: 'hidden', border: `3px solid rgba(210,169,97,.6)`, boxShadow: '0 40px 90px rgba(0,0,0,.6)', opacity: enter, transform: `translateY(${(1 - enter) * 80}px)` }}>
      <Img src={staticFile(src)} style={{ width: W, height: FULL, transform: `translateY(${ty}px)` }} />
    </div>
  );
};

const Slide: React.FC<{ src: string; dur: number }> = ({ src, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 16 } });
  const s = interpolate(f, [0, dur], [1, 1.08], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, top: 700, transform: `rotate(${(1 - enter) * -6}deg) scale(${(0.85 + 0.15 * enter) * s})`, opacity: enter }}>
      <div style={{ borderRadius: 26, overflow: 'hidden', border: `3px solid ${GOLD}`, boxShadow: '0 40px 90px rgba(0,0,0,.6)' }}>
        <Img src={staticFile(src)} style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  );
};


const Stat: React.FC<{ big: string; sub?: string; strike?: boolean; dur: number; photo?: string }> = ({ big, sub, strike, dur, photo }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: f, fps, config: { damping: 11, mass: 0.7 } });
  const line = interpolate(f, [dur * 0.45, dur * 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: photo ? 600 : 720, textAlign: 'center' }}>
      {photo ? <div style={{ width: 300, height: 300, margin: '0 auto 30px', borderRadius: '50%', overflow: 'hidden', border: `6px solid ${GOLD}`, opacity: k, transform: `scale(${0.7 + 0.3 * k})` }}><Img src={staticFile(photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 18%', transform: 'scale(1.9) translateY(14%)' }} /></div> : null}
      <div style={{ position: 'relative', display: 'inline-block', fontFamily: 'Bebas', fontSize: Math.min(photo ? 220 : 300, Math.floor(2050 / Math.max(1, big.length))), whiteSpace: 'nowrap', lineHeight: 0.9, color: GOLD2, transform: `scale(${0.5 + 0.5 * k})`, opacity: k, textShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
        {big}
        {strike ? <div style={{ position: 'absolute', left: -10, top: '46%', height: 18, width: `${line * 105}%`, background: '#e2574c', borderRadius: 9, transform: 'rotate(-6deg)' }} /> : null}
      </div>
      {sub ? <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 52, color: CREAM, marginTop: 24, opacity: k }}>{sub}</div> : null}
    </div>
  );
};

const Flow: React.FC<{ items: string[]; dur: number }> = ({ items, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const step = (dur * 0.8) / items.length;
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top: 650, display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'stretch' }}>
      {items.map((it, i) => {
        const k = spring({ frame: f - i * step, fps, config: { damping: 14 } });
        return (
          <div key={i} style={{ opacity: k, transform: `translateX(${(1 - k) * -120}px)`, display: 'flex', alignItems: 'center', gap: 22, background: 'rgba(21,32,58,.95)', border: '2px solid #2b3a58', borderRadius: 22, padding: '26px 32px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, display: 'grid', placeItems: 'center', fontFamily: 'Bebas', fontSize: 40, color: NAVY, background: GOLD }}>{i + 1}</div>
            <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 56, color: CREAM }}>{it}</div>
          </div>
        );
      })}
    </div>
  );
};

const Pdf: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: f, fps, config: { damping: 14 } });
  const q = spring({ frame: f - dur * 0.45, fps, config: { damping: 9 } });
  return (
    <div style={{ position: 'absolute', left: 120, right: 120, top: 700, opacity: k, transform: `translateY(${(1 - k) * 60}px)` }}>
      <div style={{ marginLeft: 'auto', width: 640, background: '#1f3b2c', borderRadius: '28px 28px 6px 28px', padding: 26, boxShadow: '0 30px 70px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, background: 'rgba(0,0,0,.25)', borderRadius: 18, padding: 22 }}>
          <div style={{ width: 92, height: 112, borderRadius: 10, background: '#e2574c', display: 'grid', placeItems: 'center', fontFamily: 'Inter', fontWeight: 800, fontSize: 30, color: '#fff' }}>PDF</div>
          <div><div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 40, color: '#fff' }}>Treino_Ana_v3.pdf</div><div style={{ fontFamily: 'Inter', fontSize: 30, color: '#b9c9bf' }}>2 páginas · 1,4 MB</div></div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'Inter', fontSize: 28, color: '#b9c9bf', marginTop: 12 }}>23:41 ✓✓</div>
      </div>
      <div style={{ marginTop: 60, textAlign: 'center', transform: `scale(${q})`, opacity: q, fontFamily: 'Bebas', fontSize: 120, color: '#e2574c' }}>NÃO ABERTO</div>
    </div>
  );
};

const Title: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: f, fps, config: { damping: 14, mass: 0.6 } });
  return (
    <div style={{ position: 'absolute', top: 236, left: 60, right: 230, transform: `scale(${0.8 + 0.2 * k})`, transformOrigin: 'left center', opacity: k }}>
      <div style={{ display: 'inline-block', whiteSpace: 'nowrap', fontFamily: 'Bebas', fontSize: Math.min(86, Math.floor(1700 / Math.max(1, text.length))), lineHeight: 0.95, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, ${GOLD})`, padding: '10px 22px 4px', borderRadius: 14, letterSpacing: 1 }}>{text}</div>
    </div>
  );
};

const Caption: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const f = useCurrentFrame();
  const words = text.split(' ');
  const per = Math.max(1, (dur * 0.85) / words.length);
  return (
    <div style={{ position: 'absolute', left: 60, width: 830, top: 380, display: 'flex', flexWrap: 'wrap', columnGap: 14, rowGap: 4, fontFamily: 'Inter', fontWeight: 800, fontSize: text.length > 100 ? 40 : text.length > 70 ? 46 : 54, lineHeight: 1.15 }}>
      {words.map((w, i) => (
        <span key={i} style={{ color: f >= i * per ? CREAM : 'rgba(243,236,221,.32)' }}>{w}</span>
      ))}
    </div>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: f, fps, config: { damping: 10, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: `scale(${0.6 + 0.4 * k})`, textAlign: 'center', marginTop: -160 }}>
        <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 46, color: CREAM, marginBottom: 18 }}>Comenta</div>
        <div style={{ fontFamily: 'Bebas', fontSize: 150, lineHeight: 0.9, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, ${GOLD})`, padding: '22px 40px 8px', borderRadius: 24 }}>APLICATIVO</div>
        <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 40, color: CREAM, marginTop: 24 }}>que eu te mando o link</div>
      </div>
    </AbsoluteFill>
  );
};

const Brand: React.FC = () => (
  <div style={{ position: 'absolute', top: 120, left: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ width: 64, height: 64, borderRadius: 16, display: 'grid', placeItems: 'center', fontFamily: 'Bebas', fontSize: 36, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, #9c7a3c)` }}>TP</div>
    <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 36, color: CREAM }}>Trainer Pro <span style={{ color: GOLD }}>Studio</span></div>
  </div>
);

export const Reel: React.FC<ReelProps> = ({ audio, scenes }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(110% 70% at 80% 10%, #1d2c4d 0%, ${NAVY} 60%, #070b14 100%)` }}>
      <style>{fontCss}</style>
      <Audio src={staticFile(audio)} />
      <Brand />
      {scenes.map((s, i) => {
        const from = Math.round(s.start * fps);
        const dur = Math.max(1, Math.round((s.end - s.start) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <AbsoluteFill>
              {s.kind === 'cta' ? <Cta /> : s.kind === 'stat' ? <Stat big={s.big || ''} sub={s.sub} strike={s.strike} dur={dur} photo={s.photo} /> : s.kind === 'flow' ? <Flow items={s.items || []} dur={dur} /> : s.kind === 'pdf' ? <Pdf dur={dur} /> : s.kind === 'slide' && s.img ? <Slide src={s.img} dur={dur} /> : s.img ? <Phone src={s.img} zoom={s.zoom || [1, 1.06]} focusY={s.focusY ?? 0.3} dur={dur} /> : null}
              {s.title ? <Title text={s.title} /> : null}
              {s.kind !== 'cta' ? <Caption text={s.caption} dur={dur} /> : null}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
