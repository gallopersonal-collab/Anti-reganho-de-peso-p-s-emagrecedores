import React from 'react';
import {
  AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion';

type Scene = {
  t: 'app' | 'phone' | 'stat' | 'title';
  start: number; end: number;
  img?: string; title?: string; pan?: [number, number]; zoom?: [number, number];
  stats?: [string, string][]; step?: string; sub?: string;
};
export type AulaProps = { video: string; duration: number; endCard: number; kicker: string; heading: string; scenes: Scene[] };

const GOLD = '#d2a961', GOLD2 = '#e9c886', CREAM = '#f3ecdd', NAVY = '#0b1220';
const fontCss = `@font-face{font-family:'Bebas';src:url(${staticFile('bebas.woff2')}) format('woff2');}`;
const goldBg = `linear-gradient(135deg, ${GOLD2}, ${GOLD})`;
const BG = `radial-gradient(110% 80% at 85% 0%, #1d2c4d 0%, ${NAVY} 55%, #070b14 100%)`;

const useK = (delay = 0, damping = 13) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping, mass: 0.6 } });
};

const Brand: React.FC = () => (
  <div style={{ position: 'absolute', top: 40, left: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{ width: 52, height: 52, borderRadius: 13, display: 'grid', placeItems: 'center', fontFamily: 'Bebas', fontSize: 30, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, #9c7a3c)` }}>TP</div>
    <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 30, color: CREAM }}>Trainer Pro <span style={{ color: GOLD }}>Studio</span></div>
  </div>
);

const Avatar: React.FC<{ video: string; from: number }> = ({ video, from }) => (
  <div style={{ position: 'absolute', right: 60, bottom: 60, width: 330, height: 330, borderRadius: '50%', overflow: 'hidden', border: `6px solid ${GOLD}`, boxShadow: '0 24px 60px rgba(0,0,0,.6)', background: '#ddd' }}>
    <OffthreadVideo src={staticFile(video)} muted startFrom={from} style={{ position: 'absolute', width: 960, height: 540, left: -318, top: -40 }} />
  </div>
);

const TitleChip: React.FC<{ s: Scene }> = ({ s }) => {
  const k = useK();
  return (
    <div style={{ position: 'absolute', top: 120, left: 60, display: 'flex', alignItems: 'center', gap: 18, opacity: k, transform: `translateX(${(1 - k) * -40}px)` }}>
      {s.step ? <div style={{ fontFamily: 'Bebas', fontSize: 64, lineHeight: 1, color: NAVY, background: goldBg, padding: '10px 20px 0', borderRadius: 14 }}>{s.step}</div> : null}
      <div style={{ fontFamily: 'Bebas', fontSize: 64, lineHeight: 1, color: CREAM, letterSpacing: 1 }}>{s.title}</div>
    </div>
  );
};

/* Tela do app num "navegador": a imagem desce devagar (pan) e pode aproximar (zoom) */
const AppScene: React.FC<{ s: Scene; dur: number }> = ({ s, dur }) => {
  const f = useCurrentFrame();
  const k = useK(2);
  const pan = s.pan || [0, 0];
  const zoom = s.zoom || [1, 1.03];
  const pos = interpolate(f, [0, dur], pan, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const z = interpolate(f, [0, dur], zoom, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const W = 1420, VIEW = 800;
  return (
    <div style={{ position: 'absolute', left: 60, top: 220, width: W, height: VIEW + 44, borderRadius: 22, overflow: 'hidden', background: '#05080f', border: '2px solid rgba(210,169,97,.55)', boxShadow: '0 40px 100px rgba(0,0,0,.6)', opacity: k, transform: `translateY(${(1 - k) * 60}px)` }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: '#0f1729', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: '50%', background: c }} />)}
        <div style={{ marginLeft: 18, flex: 1, maxWidth: 520, height: 26, borderRadius: 8, background: '#1a2540', color: '#9fb0cf', fontFamily: 'Inter', fontSize: 15, display: 'flex', alignItems: 'center', paddingLeft: 14 }}>treinerstudiopro.netlify.app</div>
      </div>
      <div style={{ width: W, height: VIEW, overflow: 'hidden', position: 'relative' }}>
        <Img src={staticFile(s.img || '')} style={{ position: 'absolute', width: W * z, left: -(W * z - W) / 2, top: 0, transformOrigin: 'top', transform: `translateY(calc(${-pos} * (100% - ${VIEW}px)))` }} />
      </div>
    </div>
  );
};

const PhoneScene: React.FC<{ s: Scene; dur: number }> = ({ s, dur }) => {
  const f = useCurrentFrame();
  const k = useK(2);
  const pos = interpolate(f, [0, dur], s.pan || [0, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const W = 420, VIEW = 760;
  return (
    <>
      <div style={{ position: 'absolute', left: 260, top: 210, width: W + 28, height: VIEW + 28, borderRadius: 60, background: '#05080f', padding: 14, border: '3px solid rgba(210,169,97,.6)', boxShadow: '0 40px 100px rgba(0,0,0,.6)', opacity: k, transform: `translateY(${(1 - k) * 70}px)` }}>
        <div style={{ width: W, height: VIEW, borderRadius: 46, overflow: 'hidden', position: 'relative', background: NAVY }}>
          <Img src={staticFile(s.img || '')} style={{ position: 'absolute', width: W, top: 0, transform: `translateY(calc(${-pos} * (100% - ${VIEW}px)))` }} />
        </div>
      </div>
      {s.sub ? <div style={{ position: 'absolute', left: 820, top: 420, width: 640, fontFamily: 'Inter', fontWeight: 800, fontSize: 52, lineHeight: 1.2, color: CREAM, opacity: useK(10) }}>{s.sub}</div> : null}
    </>
  );
};

const StatScene: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const st = s.stats || [];
  return (
    <div style={{ position: 'absolute', left: 60, right: 460, top: 260, display: 'flex', flexDirection: 'column', gap: 34 }}>
      {s.sub ? <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 40, color: '#b8c4dc', opacity: useK() }}>{s.sub}</div> : null}
      <div style={{ display: 'flex', gap: 34, flexWrap: 'wrap' }}>
        {st.map(([big, label], i) => {
          const k = spring({ frame: f - 6 - i * 12, fps, config: { damping: 12, mass: 0.6 } });
          return (
            <div key={i} style={{ flex: '1 1 420px', padding: '34px 40px', borderRadius: 28, background: 'rgba(16,25,45,.9)', border: `3px solid ${GOLD}`, boxShadow: '0 30px 80px rgba(0,0,0,.5)', opacity: k, transform: `scale(${0.8 + 0.2 * k})` }}>
              <div style={{ fontFamily: 'Bebas', fontSize: 150, lineHeight: 0.95, color: GOLD2 }}>{big}</div>
              <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 40, color: CREAM, marginTop: 6 }}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* Abertura: avatar em tela cheia com o título da aula */
const Opening: React.FC<{ kicker: string; heading: string }> = ({ kicker, heading }) => {
  const k = useK(8, 14);
  const f = useCurrentFrame();
  const out = interpolate(f, [150, 175], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 70, bottom: 70, opacity: k * out, transform: `translateY(${(1 - k) * 40}px)` }}>
      <div style={{ display: 'inline-block', fontFamily: 'Bebas', fontSize: 46, lineHeight: 1, color: NAVY, background: goldBg, padding: '10px 20px 2px', borderRadius: 12 }}>{kicker}</div>
      <div style={{ fontFamily: 'Bebas', fontSize: 96, lineHeight: 1, color: '#fff', marginTop: 12, textShadow: '0 6px 30px rgba(0,0,0,.7)' }}>{heading}</div>
    </div>
  );
};

const EndCard: React.FC = () => {
  const k = useK(0, 12);
  return (
    <AbsoluteFill style={{ background: BG, display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', opacity: k, transform: `scale(${0.85 + 0.15 * k})` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, justifyContent: 'center' }}>
          <div style={{ width: 110, height: 110, borderRadius: 26, display: 'grid', placeItems: 'center', fontFamily: 'Bebas', fontSize: 64, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, #9c7a3c)` }}>TP</div>
          <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 76, color: CREAM }}>Trainer Pro <span style={{ color: GOLD }}>Studio</span></div>
        </div>
        <div style={{ fontFamily: 'Bebas', fontSize: 84, color: GOLD2, marginTop: 40 }}>Seu aluno vai sentir a diferença.</div>
        <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 36, color: '#b8c4dc', marginTop: 10 }}>Prof. José Carlos Gallo</div>
      </div>
    </AbsoluteFill>
  );
};

export const AulaEdit: React.FC<AulaProps> = ({ video, duration, kicker, heading, scenes }) => {
  const { fps } = useVideoConfig();
  const vidFrames = Math.round(duration * fps);
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <style>{fontCss}</style>
      <Sequence from={0} durationInFrames={vidFrames} layout="none">
        <AbsoluteFill>
          <OffthreadVideo src={staticFile(video)} style={{ width: 1920, height: 1080 }} />
          <Opening kicker={kicker} heading={heading} />
        </AbsoluteFill>
      </Sequence>
      {scenes.map((s, i) => {
        const from = Math.round(s.start * fps);
        const dur = Math.max(1, Math.round(s.end * fps) - from);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <AbsoluteFill style={{ background: BG }}>
              <Brand />
              <TitleChip s={s} />
              {s.t === 'app' ? <AppScene s={s} dur={dur} /> : s.t === 'phone' ? <PhoneScene s={s} dur={dur} /> : <StatScene s={s} />}
              <Avatar video={video} from={from} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      <Sequence from={vidFrames} layout="none"><EndCard /></Sequence>
    </AbsoluteFill>
  );
};
