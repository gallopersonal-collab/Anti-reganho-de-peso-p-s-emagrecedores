import React from 'react';
import {
  AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion';

type Scene = {
  t: 'text' | 'flow' | 'app' | 'slide' | 'cta';
  start: number; end: number; words: [string, number][];
  big?: string; pre?: string; post?: string; items?: string[]; img?: string; title?: string; pan?: [number, number];
};
export type R1Props = { video: string; duration: number; scenes: Scene[] };

const GOLD = '#d2a961', GOLD2 = '#e9c886', CREAM = '#f3ecdd', NAVY = '#0b1220';
const fontCss = `@font-face{font-family:'Bebas';src:url(${staticFile('bebas.woff2')}) format('woff2');}`;
const goldBg = `linear-gradient(135deg, ${GOLD2}, ${GOLD})`;

const useK = (delay = 0, damping = 12) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping, mass: 0.6 } });
};

const BigText: React.FC<{ s: Scene }> = ({ s }) => {
  const k = useK();
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, top: 1000, textAlign: 'center', opacity: k, transform: `scale(${0.6 + 0.4 * k})` }}>
      {s.pre ? <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 54, color: CREAM, textShadow: '0 4px 20px rgba(0,0,0,.8)', marginBottom: 6 }}>{s.pre}</div> : null}
      <div style={{ display: 'inline-block', fontFamily: 'Bebas', fontSize: Math.min(230, Math.floor(1700 / Math.max(1, (s.big || '').length))), lineHeight: 0.9, color: NAVY, background: goldBg, padding: '18px 40px 4px', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>{s.big}</div>
      {s.post ? <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 54, color: CREAM, textShadow: '0 4px 20px rgba(0,0,0,.8)', marginTop: 10 }}>{s.post}</div> : null}
    </div>
  );
};

const Flow: React.FC<{ s: Scene; dur: number }> = ({ s, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = s.items || [];
  const step = (dur * 0.75) / items.length;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 930, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18, padding: '0 60px' }}>
      {items.map((it, i) => {
        const k = spring({ frame: f - i * step, fps, config: { damping: 12, mass: 0.5 } });
        return (
          <React.Fragment key={i}>
            <div style={{ fontFamily: 'Bebas', fontSize: 84, lineHeight: 1, color: NAVY, background: goldBg, padding: '14px 28px 4px', borderRadius: 18, opacity: k, transform: `translateY(${(1 - k) * 40}px)`, boxShadow: '0 16px 40px rgba(0,0,0,.5)' }}>{it}</div>
            {i < items.length - 1 ? <div style={{ fontFamily: 'Bebas', fontSize: 84, color: CREAM, opacity: k, alignSelf: 'center', textShadow: '0 4px 20px rgba(0,0,0,.8)' }}>→</div> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Cta: React.FC = () => {
  const k = useK(0, 9);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 960, textAlign: 'center', transform: `scale(${0.6 + 0.4 * k})`, opacity: k }}>
      <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 54, color: CREAM, textShadow: '0 4px 20px rgba(0,0,0,.8)', marginBottom: 12 }}>Comenta</div>
      <div style={{ display: 'inline-block', fontFamily: 'Bebas', fontSize: 170, lineHeight: 0.9, color: NAVY, background: goldBg, padding: '24px 44px 6px', borderRadius: 26, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>APLICATIVO</div>
      <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 46, color: CREAM, textShadow: '0 4px 20px rgba(0,0,0,.8)', marginTop: 16 }}>que eu te mando o link</div>
    </div>
  );
};

const AppScene: React.FC<{ s: Scene; dur: number; video: string; from: number }> = ({ s, dur, video, from }) => {
  const f = useCurrentFrame();
  const k = useK(0, 16);
  const W = 720, VIEW = 1180;
  const isSlide = s.t === 'slide';
  const FULL = Math.round(W * 1992 / 1170);
  const pan = s.pan || [0, 0.2];
  const pos = interpolate(f, [0, dur], pan, { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const scale = interpolate(f, [0, dur], [1, 1.04], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(110% 70% at 80% 10%, #1d2c4d 0%, ${NAVY} 60%, #070b14 100%)` }}>
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, display: 'grid', placeItems: 'center', fontFamily: 'Bebas', fontSize: 32, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, #9c7a3c)` }}>TP</div>
        <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 34, color: CREAM }}>Trainer Pro <span style={{ color: GOLD }}>Studio</span></div>
      </div>
      <div style={{ position: 'absolute', top: 200, left: 40, right: 40, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', fontFamily: 'Bebas', fontSize: (s.title || '').length > 22 ? 64 : 80, lineHeight: 1, color: NAVY, background: goldBg, padding: '12px 28px 2px', borderRadius: 16, opacity: k, transform: `scale(${0.7 + 0.3 * k})` }}>{s.title}</span>
      </div>
      {isSlide ? (
        <div style={{ position: 'absolute', left: 50, right: 50, top: 520, borderRadius: 26, overflow: 'hidden', border: `4px solid ${GOLD}`, boxShadow: '0 40px 90px rgba(0,0,0,.6)', opacity: k, transform: `rotate(${(1 - k) * -5}deg) scale(${(0.85 + 0.15 * k) * scale})` }}>
          <Img src={staticFile(s.img || '')} style={{ width: '100%', display: 'block' }} />
        </div>
      ) : (
        <div style={{ position: 'absolute', left: (1080 - W) / 2 - 14, top: 330, width: W + 28, height: VIEW + 28, borderRadius: 56, background: '#05080f', padding: 14, border: `3px solid rgba(210,169,97,.6)`, boxShadow: '0 40px 90px rgba(0,0,0,.6)', opacity: k, transform: `translateY(${(1 - k) * 80}px) scale(${scale})` }}>
          <div style={{ width: W, height: VIEW, borderRadius: 44, overflow: 'hidden', background: NAVY }}>
            <Img src={staticFile(s.img || '')} style={{ width: W, height: FULL, transform: `translateY(${-pos * Math.max(0, FULL - VIEW)}px)` }} />
          </div>
        </div>
      )}
      {/* avatar em miniatura continua falando */}
      <div style={{ position: 'absolute', right: 40, top: 1220, width: 290, height: 290, borderRadius: '50%', overflow: 'hidden', border: `6px solid ${GOLD}`, boxShadow: '0 20px 50px rgba(0,0,0,.6)' }}>
        <OffthreadVideo src={staticFile(video)} muted startFrom={from} style={{ position: 'absolute', width: 420, height: 747, left: -65, top: -40 }} />
      </div>
    </AbsoluteFill>
  );
};

const Captions: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = s.start + f / fps;
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: 1560, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 16, rowGap: 4, fontFamily: 'Inter', fontWeight: 800, fontSize: 56, lineHeight: 1.15, textShadow: '0 4px 18px rgba(0,0,0,.85)' }}>
      {s.words.map(([w, ws], i) => (
        <span key={i} style={{ color: t >= ws ? CREAM : 'rgba(243,236,221,.4)' }}>{w}</span>
      ))}
    </div>
  );
};

export const Reel1Edit: React.FC<R1Props> = ({ video, scenes }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <style>{fontCss}</style>
      <OffthreadVideo src={staticFile(video)} style={{ width: 1080, height: 1920 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1100, background: 'linear-gradient(180deg, rgba(11,18,32,0) 0%, rgba(11,18,32,.35) 45%, rgba(11,18,32,.85) 100%)' }} />
      {scenes.map((s, i) => {
        const from = Math.round(s.start * fps);
        const dur = Math.max(1, Math.round(s.end * fps) - from);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <AbsoluteFill>
              {s.t === 'text' ? <BigText s={s} /> : s.t === 'flow' ? <Flow s={s} dur={dur} /> : s.t === 'cta' ? <Cta /> : <AppScene s={s} dur={dur} video={video} from={from} />}
              <Captions s={s} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
