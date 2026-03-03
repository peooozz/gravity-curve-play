export interface Star {
  x: number;
  y: number;
  collected: boolean;
}

export interface GravityWell {
  x: number;
  y: number;
  radius: number;
  strength: number;
}

export type GravityDirection = 'down' | 'up' | 'left' | 'right' | 'zero';

export interface EquationRow {
  id: string;
  text: string;
  isInstruction: boolean;
  locked: boolean;
}

export interface Level {
  id: number;
  name: string;
  instructions: string;
  equations: EquationRow[];
  stars: Star[];
  gravity: GravityDirection;
  gravityWells: GravityWell[];
  canFlipGravity: boolean;
  xRange: [number, number];
  yRange: [number, number];
  marbleStart: { x: number; y: number } | null;
  answers?: string[];
  isFreestyle?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface ParsedFn {
  fn: (x: number) => number;
  condition?: (x: number) => boolean;
  color: string;
}
