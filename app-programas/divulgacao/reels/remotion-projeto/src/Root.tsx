import React from 'react';
import { Composition } from 'remotion';
import { Reel, ReelProps } from './Reel';
import reel2 from './reel2.json';
import reel1 from './reel1.json';
import reel3 from './reel3.json';
import aula1 from './aula1.json';
import aula2 from './aula2.json';
import aula3 from './aula3.json';
import aula4 from './aula4.json';
import aula5 from './aula5.json';
import aula6 from './aula6.json';
import bv from './bv.json';
import { BoasVindas, BVProps } from './BoasVindas';


export const FPS = 30;

export const Root: React.FC = () => {
  const p = reel2 as unknown as ReelProps;
  const p1 = reel1 as unknown as ReelProps;
  const p3 = reel3 as unknown as ReelProps;
  return (
    <>
    <Composition id="Aula1" component={Reel} durationInFrames={Math.ceil((aula1 as any).duration * FPS)} fps={FPS} width={1080} height={1920} defaultProps={aula1 as unknown as ReelProps} />
    <Composition id="Aula2" component={Reel} durationInFrames={Math.ceil((aula2 as any).duration * FPS)} fps={FPS} width={1080} height={1920} defaultProps={aula2 as unknown as ReelProps} />
    <Composition id="Aula3" component={Reel} durationInFrames={Math.ceil((aula3 as any).duration * FPS)} fps={FPS} width={1080} height={1920} defaultProps={aula3 as unknown as ReelProps} />
    <Composition id="Aula4" component={Reel} durationInFrames={Math.ceil((aula4 as any).duration * FPS)} fps={FPS} width={1080} height={1920} defaultProps={aula4 as unknown as ReelProps} />
    <Composition id="Aula5" component={Reel} durationInFrames={Math.ceil((aula5 as any).duration * FPS)} fps={FPS} width={1080} height={1920} defaultProps={aula5 as unknown as ReelProps} />
    <Composition id="Aula6" component={Reel} durationInFrames={Math.ceil((aula6 as any).duration * FPS)} fps={FPS} width={1080} height={1920} defaultProps={aula6 as unknown as ReelProps} />
    <Composition id="BVVertical" component={BoasVindas} durationInFrames={Math.round((bv.videoDur + bv.endCard) * 25)} fps={25} width={1080} height={1920} defaultProps={{ ...(bv as any), vertical: true } as BVProps} />
    <Composition id="BVHorizontal" component={BoasVindas} durationInFrames={Math.round((bv.videoDur + bv.endCard) * 25)} fps={25} width={1920} height={1080} defaultProps={{ ...(bv as any), vertical: false } as BVProps} />
    <Composition id="Reel3" component={Reel} durationInFrames={Math.ceil(p3.duration * FPS)} fps={FPS} width={1080} height={1920} defaultProps={p3} />
    <Composition id="Reel1" component={Reel} durationInFrames={Math.ceil(p1.duration * FPS)} fps={FPS} width={1080} height={1920} defaultProps={p1} />
    <Composition
      id="Reel2"
      component={Reel}
      durationInFrames={Math.ceil(p.duration * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={p}
    />
    </>
  );
};
