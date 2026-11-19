import React from 'react';
import { Composition } from 'remotion';
import { Reel, ReelProps } from './Reel';
import reel2 from './reel2.json';

export const FPS = 30;

export const Root: React.FC = () => {
  const p = reel2 as unknown as ReelProps;
  return (
    <Composition
      id="Reel2"
      component={Reel}
      durationInFrames={Math.ceil(p.duration * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={p}
    />
  );
};
