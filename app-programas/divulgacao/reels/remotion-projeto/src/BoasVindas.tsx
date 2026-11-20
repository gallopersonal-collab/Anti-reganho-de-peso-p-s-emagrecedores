import React from 'react';
import {
  AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

type Chunk = { start: number; end: number; words: [string, number][] };
export type BVProps = { video: string; videoDur: number; endCard: number; chunks: Chunk[]; vertical: boolean };

const GOLD = '#d2a961', GOLD2 = '#e9c886', CREAM = '#f3ecdd', NAVY = '#0b1220';
const fontCss = `@font-face{font-family:'Bebas';src:url(${staticFile('bebas.woff2')}) format('woff2');}`;
const BG = `radial-gradient(110% 70% at 80% 10%, #1d2c4d 0%, ${NAVY} 60%, #070b14 100%)`;

const Brand: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 * scale }}>
    <div style={{ width: 64 * scale, height: 64 * scale, borderRadius: 16 * scale, display: 'grid', placeItems: 'center', fontFamily: 'Bebas', fontSize: 36 * scale, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, #9c7a3c)` }}>TP</div>
    <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 36 * scale, color: CREAM }}>Trainer Pro <span style={{ color: GOLD }}>Studio</span></div>
  </div>
);

const Captions: React.FC<{ chunks: Chunk[]; size: number }> = ({ chunks, size }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const c = chunks.find((x) => t >= x.start && t < x.end);
  if (!c) return null;
  const k = spring({ frame: Math.round((t - c.start) * fps), fps, config: { damping: 16, mass: 0.5 } });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: size * 0.28, rowGap: 4, fontFamily: 'Inter', fontWeight: 800, fontSize: size, lineHeight: 1.15, textAlign: 'center', opacity: k, transform: `translateY(${(1 - k) * 20}px)`, textShadow: '0 4px 18px rgba(0,0,0,.75)' }}>
      {c.words.map(([w, ws], i) => (
        <span key={i} style={{ color: t >= ws ? (/^(60|Premium,|biblioteca,|diferença\.|Trainer|Pro|Studio!|escolha!)$/.test(w) ? GOLD2 : CREAM) : 'rgba(243,236,221,.38)' }}>{w}</span>
      ))}
    </div>
  );
};

const EndCard: React.FC<{ vertical: boolean }> = ({ vertical }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = (d: number) => spring({ frame: f - d, fps, config: { damping: 13, mass: 0.6 } });
  const s = vertical ? 1 : 0.82;
  return (
    <AbsoluteFill style={{ background: BG, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ opacity: k(0), transform: `scale(${0.8 + 0.2 * k(0)})`, marginBottom: 40 * s }}><Brand scale={1.5 * s} /></div>
      <div style={{ width: 230 * s, height: 230 * s, borderRadius: '50%', overflow: 'hidden', border: `6px solid ${GOLD}`, opacity: k(4), transform: `scale(${0.7 + 0.3 * k(4)})`, marginBottom: 36 * s }}>
        <Img src={staticFile('gallo.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 18%', transform: 'scale(1.9) translateY(14%)' }} />
      </div>
      <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 50 * s, color: CREAM, opacity: k(8), marginBottom: 20 * s }}>Assista agora à</div>
      <div style={{ fontFamily: 'Bebas', fontSize: 130 * s, lineHeight: 0.9, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, ${GOLD})`, padding: `${22 * s}px ${44 * s}px ${8 * s}px`, borderRadius: 24 * s, opacity: k(11), transform: `scale(${0.6 + 0.4 * k(11)})`, whiteSpace: 'nowrap' }}>AULA 1<div style={{ fontSize: 76 * s, lineHeight: 1 }}>PRIMEIRO ACESSO</div></div>
      <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 36 * s, color: 'rgba(243,236,221,.75)', marginTop: 36 * s, opacity: k(16) }}>Prof. José Carlos Gallo · Instituto Gallo Personal</div>
    </AbsoluteFill>
  );
};

export const BoasVindas: React.FC<BVProps> = ({ video, videoDur, chunks, vertical }) => {
  const { fps, width } = useVideoConfig();
  const vFrames = Math.round(videoDur * fps);
  // vertical: recorte central do vídeo 16:9 (área 972x1080 da fonte) ocupando 1080x1200
  const VH = 1200, VW = Math.round(VH * 16 / 9);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <style>{fontCss}</style>
      <Sequence durationInFrames={vFrames} layout="none">
        {vertical ? (
          <>
            <div style={{ position: 'absolute', top: 300, left: 0, width: 1080, height: VH, overflow: 'hidden' }}>
              <OffthreadVideo src={staticFile(video)} style={{ position: 'absolute', height: VH, width: VW, left: -(VW - width) / 2, top: 0 }} />
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${NAVY} 0%, rgba(11,18,32,0) 12%, rgba(11,18,32,0) 80%, ${NAVY} 100%)` }} />
            </div>
            <div style={{ position: 'absolute', top: 120, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}><Brand scale={1.1} /></div>
            <div style={{ position: 'absolute', top: 210, left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ fontFamily: 'Bebas', fontSize: 64, letterSpacing: 2, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, ${GOLD})`, padding: '8px 26px 2px', borderRadius: 12 }}>BOAS-VINDAS</span>
            </div>
            <div style={{ position: 'absolute', top: 1450, left: 70, right: 70 }}><Captions chunks={chunks} size={62} /></div>
          </>
        ) : (
          <>
            <OffthreadVideo src={staticFile(video)} style={{ width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, background: 'linear-gradient(180deg, rgba(11,18,32,0), rgba(11,18,32,.85))' }} />
            <div style={{ position: 'absolute', bottom: 60, left: 220, right: 220 }}><Captions chunks={chunks} size={52} /></div>
            <div style={{ position: 'absolute', top: 40, left: 50, padding: '12px 20px', borderRadius: 18, background: 'rgba(11,18,32,.7)' }}><Brand scale={0.8} /></div>
          </>
        )}
      </Sequence>
      <Sequence from={vFrames} layout="none">
        <EndCard vertical={vertical} />
      </Sequence>
    </AbsoluteFill>
  );
};
