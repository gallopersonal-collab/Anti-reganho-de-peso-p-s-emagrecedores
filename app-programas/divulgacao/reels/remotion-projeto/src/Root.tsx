import React from 'react';
import { Composition } from 'remotion';
import { Reel, ReelProps } from './Reel';
import reel2 from './reel2.json';
import reel1 from './reel1.json';
import reel3 from './reel3.json';

export const FPS = 30;

export const Root: React.FC = () => {
  const p = reel2 as unknown as ReelProps;
  const p1 = reel1 as unknown as ReelProps;
  const p3 = reel3 as unknown as ReelProps;
  return (
    <>
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
