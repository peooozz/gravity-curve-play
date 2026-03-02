export type GravityDirection = 'down' | 'up' | 'left' | 'right' | 'zero';

export interface Star {
  x: number;
  y: number;
  collected: boolean;
}

export interface GravityWell {
  x: number;
  y: number;
  radius: number;
  strength: number; // positive = attract, negative = repel
}

export interface Level {
  id: number;
  name: string;
  description: string;
  stars: Star[];
  gravity: GravityDirection;
  gravityWells: GravityWell[];
  canFlipGravity: boolean;
  defaultEquation: string;
  xRange: [number, number];
  yRange: [number, number];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export type EquationType = 'linear' | 'quadratic' | 'sinusoidal' | 'unknown';
