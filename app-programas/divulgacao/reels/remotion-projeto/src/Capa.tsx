import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
export type CapaProps = { tag: string; title: string; sub: string; img: string; kind: 'phone' | 'photo' | 'pdf' };
const GOLD = '#d2a961', GOLD2 = '#e9c886', CREAM = '#f3ecdd', NAVY = '#0b1220';
const fontCss = `@font-face{font-family:'Bebas';src:url(${staticFile('bebas.woff2')}) format('woff2');}`;
export const Capa: React.FC<CapaProps> = ({ tag, title, sub, img, kind }) => (
  <AbsoluteFill style={{ background: `radial-gradient(90% 90% at 85% 20%, #22345a 0%, ${NAVY} 55%, #060a12 100%)`, overflow: 'hidden' }}>
    <style>{fontCss}</style>
    <div style={{ position: 'absolute', right: -160, top: -160, width: 620, height: 620, borderRadius: '50%', border: `2px solid rgba(210,169,97,.18)` }} />
    <div style={{ position: 'absolute', right: -60, top: -60, width: 420, height: 420, borderRadius: '50%', border: `2px solid rgba(210,169,97,.12)` }} />
    <div style={{ position: 'absolute', left: 70, top: 56, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 52, height: 52, borderRadius: 13, display: 'grid', placeItems: 'center', fontFamily: 'Bebas', fontSize: 30, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, #9c7a3c)` }}>TP</div>
      <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 30, color: CREAM }}>Trainer Pro <span style={{ color: GOLD }}>Studio</span></div>
    </div>
    <div style={{ position: 'absolute', left: 70, top: 0, bottom: 0, width: 690, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 30 }}>
      <div><span style={{ fontFamily: 'Bebas', fontSize: 50, letterSpacing: 2, color: NAVY, background: `linear-gradient(135deg, ${GOLD2}, ${GOLD})`, padding: '8px 22px 2px', borderRadius: 12 }}>{tag}</span></div>
      <div style={{ fontFamily: 'Bebas', fontSize: title.length > 26 ? 92 : 108, lineHeight: 0.95, color: CREAM, marginTop: 26, letterSpacing: 1 }}>{title}</div>
      <div style={{ width: 90, height: 6, borderRadius: 3, background: GOLD, margin: '26px 0 22px' }} />
      <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 32, lineHeight: 1.3, color: 'rgba(243,236,221,.85)' }}>{sub}</div>
    </div>
    <div style={{ position: 'absolute', left: 70, bottom: 48, fontFamily: 'Inter', fontWeight: 600, fontSize: 22, color: 'rgba(243,236,221,.55)' }}>Prof. José Carlos Gallo · Instituto Gallo Personal</div>
    {kind === 'phone' ? (
      <div style={{ position: 'absolute', left: 855, top: 66, width: 340, height: 590, borderRadius: 44, background: '#05080f', padding: 12, boxShadow: '0 40px 90px rgba(0,0,0,.65)', border: `3px solid rgba(210,169,97,.55)`, transform: 'rotate(4deg)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 34, overflow: 'hidden', background: NAVY }}>
          <Img src={staticFile(img)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
        </div>
      </div>
    ) : kind === 'photo' ? (
      <div style={{ position: 'absolute', left: 820, top: 150, width: 400, height: 400, borderRadius: '50%', overflow: 'hidden', border: `8px solid ${GOLD}`, boxShadow: '0 40px 90px rgba(0,0,0,.6)' }}>
        <Img src={staticFile(img)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 18%', transform: 'scale(1.6) translateY(12%)' }} />
      </div>
    ) : (
      <div style={{ position: 'absolute', left: 850, top: 95, width: 370, borderRadius: 14, overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,.65)', border: `3px solid ${GOLD}`, transform: 'rotate(4deg)' }}>
        <Img src={staticFile(img)} style={{ width: '100%', display: 'block' }} />
      </div>
    )}
  </AbsoluteFill>
);
