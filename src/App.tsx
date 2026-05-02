/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Lock, 
  Zap,
  User,
  Clock,
  Footprints,
  EyeOff,
  Skull,
  ChevronDown,
  ChevronsRight,
  Coins as CoinIcon,
  Star,
  ShoppingBag,
  Award,
  Sparkles,
  Calendar,
  ListTodo,
  CheckCircle2,
  Hammer,
  Save,
  Play,
  X,
  Plus,
  Settings,
  Volume2,
  VolumeX,
  Vibrate,
  Home,
  Flame,
  ZapOff,
  Key,
  Activity,
  Shield,
  RotateCcw,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type ChallengeType = 'complete_levels' | 'collect_keys' | 'make_moves' | 'reach_level' | 'session_coins';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Skin {
  id: string;
  name: string;
  color: string;
  price: number;
  unlocked: boolean;
  effect?: 'glow' | 'trail' | 'sparkle' | 'pulse';
  rarity: 'common' | 'rare' | 'legendary';
}

interface Achievement {
  id: string;
  text: string;
  condition: (stats: any) => boolean;
  achieved?: boolean;
}

interface DailyChallenge {
  id: string;
  type: ChallengeType;
  target: number;
  progress: number;
  completed: boolean;
  rewardType: 'coins' | 'xp';
  rewardAmount: number;
  description: string;
}

interface DailyChallengeState {
  date: string;
  challenges: DailyChallenge[];
}

interface CustomLevel {
  id: string;
  name: string;
  maze: Maze;
}

// --- Constants ---

const SKINS = [
  { name: 'Gold', color: '#fff01f', price: 0 },
  { name: 'Red', color: '#ff3131', price: 100 },
  { name: 'Pink', color: '#ff00ff', price: 100 },
  { name: 'Blue', color: '#00f2ff', price: 250 },
];

// --- Improved Loud & Sharp Sound Service ---

class SoundService {
  private ctx: AudioContext | null = null;
  private sfxVolume: number = 0.8;
  private vibrationEnabled: boolean = true;
  private bgmOsc: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmInterval: any = null;

  public resume() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      } catch (e) {
        console.error('AudioContext not supported');
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(sfx: number) {
    this.sfxVolume = sfx;
  }

  public setVibration(enabled: boolean) {
    this.vibrationEnabled = enabled;
  }

  public startBGM() {
    this.resume();
    if (!this.ctx || this.bgmOsc) return;

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    this.bgmGain.connect(this.ctx.destination);

    const playPulse = () => {
      if (!this.ctx || !this.bgmGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      
      // Cyberpunk-style low pulse
      const freq = 60 + (Math.random() > 0.8 ? 20 : 0);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq - 10, this.ctx.currentTime + 2);

      g.gain.setValueAtTime(0, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.9);

      osc.connect(g);
      g.connect(this.bgmGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 2);
    };

    playPulse();
    this.bgmInterval = setInterval(playPulse, 2000);
  }

  public stopBGM() {
    if (this.bgmInterval) clearInterval(this.bgmInterval);
    if (this.bgmGain) {
      this.bgmGain.gain.exponentialRampToValueAtTime(0.001, this.ctx?.currentTime || 0 + 0.5);
    }
    this.bgmOsc = null;
    this.bgmInterval = null;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.8, slideTo?: number) {
    this.resume();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private vibrate(ms: number) {
    if (this.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }

  playMove(dx: number, dy: number) {
    // Directional pitch: Up is higher, Down is lower
    const pitch = 600 + (dy * -200) + (dx * 100);
    this.playTone(pitch, 0.04, 'square', 0.6 * this.sfxVolume);
  }

  playWallHit() {
    this.vibrate(50);
    this.playTone(60, 0.15, 'triangle', 0.8 * this.sfxVolume, 20);
  }

  playSuccess() {
    this.resume();
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.15, 'square', 0.5 * this.sfxVolume), i * 150);
    });
  }

  playFailure() {
    this.resume();
    this.vibrate(200);
    const notes = [300, 250, 200, 150];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.4, 'sawtooth', 0.6 * this.sfxVolume, f - 50), i * 300);
    });
  }

  playKey() {
    this.playTone(1760, 0.1, 'sine', 0.7 * this.sfxVolume);
    setTimeout(() => this.playTone(2637, 0.2, 'sine', 0.6 * this.sfxVolume), 50);
  }

  playPowerUp() {
    this.resume();
    // Energetic rising frequency
    this.playTone(400, 0.1, 'sine', 0.6);
    setTimeout(() => this.playTone(800, 0.2, 'sine', 0.8), 50);
  }

  playClick() {
    this.resume();
    this.playTone(800, 0.1, 'square', 0.9 * this.sfxVolume, 100);
  }
}

const sounds = new SoundService();

interface Booster {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'shield_start' | 'time_plus' | 'xp_boost';
  icon: React.ReactNode;
}

const BOOSTERS: Booster[] = [
  { id: 'b_shield', name: 'Shield Entry', description: 'Start levels with a ghost shield', price: 150, type: 'shield_start', icon: <Shield className="w-4 h-4" /> },
  { id: 'b_time', name: 'Time Flux', description: '+20s for the next level', price: 100, type: 'time_plus', icon: <Clock className="w-4 h-4" /> },
  { id: 'b_xp', name: 'XP Overload', description: '2x XP for one level', price: 200, type: 'xp_boost', icon: <Zap className="w-4 h-4" /> },
];

// --- Types ---

type CellType = 'empty' | 'wall' | 'spike' | 'key' | 'portal' | 'speed' | 'shield' | 'chest';

interface PatrolBot {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  direction: 1 | -1;
  axis: 'x' | 'y';
}

interface LevelConfig {
  gridSize: number;
  spikeCount: number;
  keyCount: number;
  wallDensity: number;
  patrolCount: number;
  timeLimit: number;
  moveLimit: number | null;
  hasFog: boolean;
  patrolSpeed: number;
  speedPowerUpCount: number;
  shieldCount: number;
  chestChance: number;
}

interface GridItem {
  id: string;
  type: CellType;
  x: number;
  y: number;
  active: boolean;
}

interface Maze {
  size: number;
  walls: boolean[][];
  start: {x: number, y: number};
  portal: {x: number, y: number};
  items: GridItem[];
  patrols: PatrolBot[];
}

// --- Hard Mode Level Scaling ---

const getLevelConfig = (level: number, difficulty: Difficulty = 'medium'): LevelConfig => {
  let gridSize = 6;
  let spikeCount = 0;
  let keyCount = 0;
  let wallDensity = 0.15;
  let patrolCount = 0;
  let patrolSpeed = 450;
  let hasFog = level >= 30;

  // Difficulty modifiers
  const diffMultiplier = difficulty === 'easy' ? 0.7 : difficulty === 'hard' ? 1.2 : 1.0;
  const speedMultiplier = difficulty === 'easy' ? 1.3 : difficulty === 'hard' ? 0.8 : 1.0; // Slower for easy (higher interval)

  // Dynamic Scaling Logic
  if (level <= 20) {
    gridSize = level <= 10 ? 6 : 8;
    wallDensity = 0.15 * diffMultiplier;
    spikeCount = level < 10 ? 0 : 1;
    keyCount = level < 10 ? 0 : 1;
    patrolCount = 0;
  } else if (level < 50) {
    gridSize = Math.floor(9 + (level - 21) / 7);
    wallDensity = (0.2 + (level / 200)) * diffMultiplier;
    spikeCount = Math.floor((1 + level / 15) * diffMultiplier);
    keyCount = Math.floor(1 + level / 25);
    patrolCount = Math.floor((1 + (level - 21) / 10) * diffMultiplier);
    patrolSpeed = 400 * speedMultiplier;
  } else if (level === 61) {
    // LEVEL 61 SPECFIC FIX: Simpler maze, fewer bots
    gridSize = 7; 
    wallDensity = 0.12; 
    patrolCount = 1; 
    spikeCount = 1;
    keyCount = 1;
    patrolSpeed = 500;
  } else {
    // Hardcore Mode (50+) - Adjusted scaling after 61
    const scaledLevel = level > 61 ? level - 5 : level; // Keep curve steep but respect 61 break
    gridSize = Math.min(18, Math.floor(14 + (level - 50) / 40));
    wallDensity = Math.min(0.38, (0.3 + (level / 400)) * diffMultiplier);
    spikeCount = Math.floor((4 + level / 15) * diffMultiplier);
    keyCount = Math.floor(2 + level / 30);
    patrolCount = Math.floor((4 + (level - 50) / 10) * diffMultiplier);
    patrolSpeed = (level >= 100 ? 220 : 300) * speedMultiplier;
  }

  // Adjust gridSize based on difficulty (min 4, max 18)
  if (difficulty === 'easy') gridSize = Math.max(4, Math.floor(gridSize * 0.8));
  if (difficulty === 'hard') gridSize = Math.min(18, Math.ceil(gridSize * 1.15));

  const speedPowerUpCount = level < 15 ? 0 : Math.floor(1 + level / 30);
  const shieldCount = level < 25 ? 0 : Math.floor(level / 50) + (level >= 100 ? 1 : 0);
  const chestChance = level >= 10 ? 0.3 : 0;

  // Time Limit (Strict)
  let timeLimit = Math.max(15, Math.floor(gridSize * 4 - (level / 10)));
  if (difficulty === 'easy') timeLimit = Math.floor(timeLimit * 1.5);
  if (difficulty === 'hard') timeLimit = Math.floor(timeLimit * 0.85);
  if (level === 61) timeLimit += 15; 
  
  // Move Limit
  const moveLimit = level >= 80 ? Math.floor(gridSize * gridSize * 1.2 * (difficulty === 'easy' ? 1.5 : difficulty === 'hard' ? 0.8 : 1)) : null;

  return { gridSize, spikeCount, keyCount, wallDensity, patrolCount, timeLimit, moveLimit, hasFog, patrolSpeed, speedPowerUpCount, shieldCount, chestChance };
};

// --- Seeded Maze Generation ---

const generateMaze = (level: number, difficulty: Difficulty = 'medium'): Maze => {
  const config = getLevelConfig(level, difficulty);
  const { gridSize, wallDensity, spikeCount, keyCount, patrolCount } = config;
  
  const seed = level * 1337;
  const pseudoRandom = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const walls = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (pseudoRandom(y * gridSize + x) < wallDensity) walls[y][x] = true;
    }
  }

  const start = { x: Math.floor(pseudoRandom(1) * (gridSize / 3)), y: Math.floor(pseudoRandom(2) * (gridSize / 3)) };
  const portal = { x: gridSize - 1 - Math.floor(pseudoRandom(3) * (gridSize / 3)), y: gridSize - 1 - Math.floor(pseudoRandom(4) * (gridSize / 3)) };

  walls[start.y][start.x] = false;
  walls[portal.y][portal.x] = false;

  let cx = start.x, cy = start.y;
  while (cx !== portal.x || cy !== portal.y) {
    if (cx < portal.x) cx++; else if (cx > portal.x) cx--; else if (cy < portal.y) cy++; else if (cy > portal.y) cy--;
    walls[cy][cx] = false;
  }

  const items: GridItem[] = [];
  for (let k = 0; k < keyCount; k++) {
    for (let attempts = 0; attempts < 100; attempts++) {
      const rx = Math.floor(pseudoRandom(50 + k * 10 + attempts) * gridSize);
      const ry = Math.floor(pseudoRandom(60 + k * 10 + attempts) * gridSize);
      if (!walls[ry][rx] && (rx !== start.x || ry !== start.y) && (rx !== portal.x || ry !== portal.y)) {
        if (!items.some(i => i.x === rx && i.y === ry)) {
          items.push({ id: `key-${k}`, type: 'key', x: rx, y: ry, active: true });
          break;
        }
      }
    }
  }

  for (let s = 0; s < spikeCount; s++) {
    for (let attempts = 0; attempts < 100; attempts++) {
      const rx = Math.floor(pseudoRandom(100 + s * 10 + attempts) * gridSize);
      const ry = Math.floor(pseudoRandom(110 + s * 10 + attempts) * gridSize);
      if (!walls[ry][rx] && (rx !== start.x || ry !== start.y) && (rx !== portal.x || ry !== portal.y)) {
        if (!items.some(i => i.x === rx && i.y === ry)) {
          items.push({ id: `spike-${s}`, type: 'spike', x: rx, y: ry, active: true });
          break;
        }
      }
    }
  }

  // Add Speed Power-Ups
  const speedPowerUpCount = config.speedPowerUpCount || 0;
  for (let sp = 0; sp < speedPowerUpCount; sp++) {
    for (let attempts = 0; attempts < 100; attempts++) {
      const rx = Math.floor(pseudoRandom(140 + sp + attempts) * gridSize);
      const ry = Math.floor(pseudoRandom(150 + sp + attempts) * gridSize);
      if (!walls[ry][rx] && (rx !== start.x || ry !== start.y) && (rx !== portal.x || ry !== portal.y)) {
        items.push({ id: `speed-${sp}`, type: 'speed', x: rx, y: ry, active: true });
        break;
      }
    }
  }

  // Add Shield Power-Ups
  const shieldCount = config.shieldCount || 0;
  for (let sc = 0; sc < shieldCount; sc++) {
    for (let attempts = 0; attempts < 100; attempts++) {
      const rx = Math.floor(pseudoRandom(300 + sc + attempts) * gridSize);
      const ry = Math.floor(pseudoRandom(310 + sc + attempts) * gridSize);
      if (!walls[ry][rx] && (rx !== start.x || ry !== start.y) && (rx !== portal.x || ry !== portal.y)) {
        items.push({ id: `shield-${sc}`, type: 'shield', x: rx, y: ry, active: true });
        break;
      }
    }
  }

  // Add Surprise Chest
  if (config.chestChance > 0 && pseudoRandom(500) < config.chestChance) {
    for (let attempts = 0; attempts < 100; attempts++) {
      const rx = Math.floor(pseudoRandom(510 + attempts) * gridSize);
      const ry = Math.floor(pseudoRandom(520 + attempts) * gridSize);
      if (!walls[ry][rx] && (rx !== start.x || ry !== start.y) && (rx !== portal.x || ry !== portal.y)) {
        if (!items.some(i => i.x === rx && i.y === ry)) {
          items.push({ id: `chest-${level}`, type: 'chest', x: rx, y: ry, active: true });
          break;
        }
      }
    }
  }

  const patrols: PatrolBot[] = [];
  for (let p = 0; p < patrolCount; p++) {
    for (let attempts = 0; attempts < 100; attempts++) {
      const rx = Math.floor(pseudoRandom(200 + p * 10 + attempts) * gridSize);
      const ry = Math.floor(pseudoRandom(210 + p * 10 + attempts) * gridSize);
      if (!walls[ry][rx] && (rx !== start.x || ry !== start.y) && (rx !== portal.x || ry !== portal.y)) {
        const axis = pseudoRandom(220 + p) > 0.5 ? 'x' : 'y';
        patrols.push({
          id: `patrol-${p}`,
          x: rx, y: ry, startX: rx, startY: ry, 
          targetX: axis === 'x' ? Math.min(gridSize - 1, rx + 2) : rx,
          targetY: axis === 'y' ? Math.min(gridSize - 1, ry + 2) : ry,
          direction: 1, axis
        });
        break;
      }
    }
  }

  return { size: gridSize, walls, start, portal, items, patrols };
};

// --- Components ---

export default function App() {
  const [userName, setUserName] = useState(() => localStorage.getItem('maze-user-name') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('maze-user-name'));
  const [loginError, setLoginError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [level, setLevel] = useState(() => parseInt(localStorage.getItem('logic-maze-level') || '1', 10));
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => parseInt(localStorage.getItem('logic-maze-max-level') || '1', 10));
  const [difficulty, setDifficulty] = useState<Difficulty>(() => (localStorage.getItem('maze-difficulty') as Difficulty) || 'medium');
  const [gameState, setGameState] = useState<'home' | 'playing' | 'won' | 'dead' | 'fail' | 'editor'>('home');
  const [failReason, setFailReason] = useState<string>('');
  
  // Daily Reward State
  const [loginStreak, setLoginStreak] = useState(() => parseInt(localStorage.getItem('maze-login-streak') || '0', 10));
  const [lastLoginDate, setLastLoginDate] = useState(() => localStorage.getItem('maze-last-login') || '');
  const [showDailyReward, setShowDailyReward] = useState<{coins: number, streak: number} | null>(null);

  // AAA Persistent State
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem('maze-coins') || '0', 10));
  const [xp, setXP] = useState(() => parseInt(localStorage.getItem('maze-xp') || '0', 10));
  const [playerLevel, setPlayerLevel] = useState(() => parseInt(localStorage.getItem('maze-player-level') || '1', 10));
  const [playerColor, setPlayerColor] = useState(() => localStorage.getItem('maze-player-color') || '#fff01f');
  
  const [speedBoost, setSpeedBoost] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  const [shake, setShake] = useState(false);
  const [particles, setParticles] = useState<{id: number, x: number, y: number, color: string}[]>([]);
  const [toasts, setToasts] = useState<{id: number, text: string}[]>([]);

  const addToast = useCallback((text: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const triggerParticles = useCallback((x: number, y: number, color: string) => {
    const count = 12;
    const newParticles = [...Array(count)].map((_, i) => ({
      id: Date.now() + i,
      x,
      y,
      color
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => {
        const remaining = prev.filter(p => !newParticles.find(np => np.id === p.id));
        return remaining;
      });
    }, 800);
  }, []);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  }, []);

  // Persist core stats
  useEffect(() => { localStorage.setItem('maze-coins', coins.toString()); }, [coins]);
  useEffect(() => { localStorage.setItem('maze-xp', xp.toString()); }, [xp]);
  useEffect(() => { localStorage.setItem('maze-player-level', playerLevel.toString()); }, [playerLevel]);
  useEffect(() => { localStorage.setItem('maze-difficulty', difficulty); }, [difficulty]);
  useEffect(() => { localStorage.setItem('maze-player-color', playerColor); }, [playerColor]);
  useEffect(() => { localStorage.setItem('maze-user-name', userName); }, [userName]);
  useEffect(() => { localStorage.setItem('maze-login-streak', loginStreak.toString()); }, [loginStreak]);
  useEffect(() => { localStorage.setItem('maze-last-login', lastLoginDate); }, [lastLoginDate]);

  // Daily Login Logic
  useEffect(() => {
    if (!isLoggedIn) return;

    const today = new Date().toISOString().split('T')[0];
    if (lastLoginDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = 1;
      if (lastLoginDate === yesterdayStr) {
        newStreak = loginStreak + 1;
      }

      const reward = Math.min(100, 10 * newStreak);
      setCoins(prev => prev + reward);
      setLoginStreak(newStreak);
      setLastLoginDate(today);
      setShowDailyReward({ coins: reward, streak: newStreak });
      addToast(`DAILY REWARD: +${reward} COINS!`);
    }
  }, [isLoggedIn, lastLoginDate, loginStreak, addToast]);
  
  // High Specs & Aura Skins
  const skins: Skin[] = [
    { id: '1', name: 'Classic Gold', color: '#fff01f', price: 0, unlocked: true, rarity: 'common' },
    { id: '2', name: 'Cyber Blue', color: '#00f2ff', price: 500, unlocked: false, rarity: 'common' },
    { id: '3', name: 'Neon Pink', color: '#ff00ff', price: 500, unlocked: false, rarity: 'common' },
    { id: '4', name: 'Acid Green', color: '#39ff14', price: 500, unlocked: false, rarity: 'common' },
    { id: '5', name: 'Core Red', color: '#ff3131', price: 700, unlocked: false, rarity: 'common' },
    { id: '6', name: 'Electric Purple', color: '#bc13fe', price: 700, unlocked: false, rarity: 'common' },
    { id: '7', name: 'Cyber Orange', color: '#ff8c00', price: 800, unlocked: false, rarity: 'common' },
    { id: 'aura-gold', name: 'King Aura', color: '#ffd700', price: 2500, unlocked: false, effect: 'glow', rarity: 'rare' },
    { id: 'aura-neon', name: 'Ghost Aura', color: '#00ffff', price: 3000, unlocked: false, effect: 'trail', rarity: 'rare' },
    { id: 'aura-ice', name: 'Ice Aura', color: '#afeeee', price: 3000, unlocked: false, effect: 'sparkle', rarity: 'rare' },
    { id: 'aura-emerald', name: 'Emerald Aura', color: '#50c878', price: 3500, unlocked: false, effect: 'trail', rarity: 'rare' },
    { id: 'aura-void', name: 'Void Aura', color: '#8a2be2', price: 6000, unlocked: false, effect: 'sparkle', rarity: 'legendary' },
    { id: 'aura-pulse', name: 'Pulse Aura', color: '#ff0055', price: 7500, unlocked: false, effect: 'pulse', rarity: 'legendary' },
    { id: 'aura-phantom', name: 'Phantom Aura', color: '#ffffff', price: 9000, unlocked: false, effect: 'glow', rarity: 'legendary' },
    { id: 'aura-nebula', name: 'Nebula Aura', color: '#483d8b', price: 12000, unlocked: false, effect: 'pulse', rarity: 'legendary' },
  ];
  
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('maze-unlocked-skins');
      return stored ? JSON.parse(stored) : ['#fff01f'];
    } catch {
      return ['#fff01f'];
    }
  });

  useEffect(() => {
    localStorage.setItem('maze-unlocked-skins', JSON.stringify(unlockedSkins));
  }, [unlockedSkins]);
  

  // Stats
  const [bestLevelEver, setBestLevelEver] = useState(() => parseInt(localStorage.getItem('maze-best-level-ever') || '1', 10));
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(() => parseInt(localStorage.getItem('maze-total-coins') || '0', 10));
  const [totalKeys, setTotalKeys] = useState(() => parseInt(localStorage.getItem('maze-total-keys') || '0', 10));

  useEffect(() => { localStorage.setItem('maze-best-level-ever', bestLevelEver.toString()); }, [bestLevelEver]);
  useEffect(() => { localStorage.setItem('maze-total-coins', totalCoinsEarned.toString()); }, [totalCoinsEarned]);
  useEffect(() => { localStorage.setItem('maze-total-keys', totalKeys.toString()); }, [totalKeys]);
  useEffect(() => { localStorage.setItem('logic-maze-max-level', maxUnlockedLevel.toString()); }, [maxUnlockedLevel]);
  useEffect(() => { localStorage.setItem('logic-maze-level', level.toString()); }, [level]);

  useEffect(() => {
    if (level > bestLevelEver) {
      setBestLevelEver(level);
      if (level % 10 === 0) addToast(`NEW RECORD: LEVEL ${level} REACHED!`);
    }
  }, [level, bestLevelEver, addToast]);
  
  const [showShop, setShowShop] = useState(false);
  const [shopTab, setShopTab] = useState<'skins' | 'boosters'>('skins');
  const [showSettings, setShowSettings] = useState(false);
  const [sfxVol, setSfxVol] = useState(() => parseFloat(localStorage.getItem('maze-sfx-vol') || '0.8'));
  const [vibrationOn, setVibrationOn] = useState(() => localStorage.getItem('maze-vibration-on') !== 'false');

  useEffect(() => {
    sounds.setVolumes(sfxVol);
    localStorage.setItem('maze-sfx-vol', sfxVol.toString());
  }, [sfxVol]);

  useEffect(() => {
    sounds.setVibration(vibrationOn);
    localStorage.setItem('maze-vibration-on', vibrationOn.toString());
  }, [vibrationOn]);
  
  // Custom Levels & Editor State
  const [customLevels, setCustomLevels] = useState<CustomLevel[]>(() => {
    const stored = localStorage.getItem('maze-custom-levels');
    return stored ? JSON.parse(stored) : [];
  });
  const [activeCustomLevel, setActiveCustomLevel] = useState<CustomLevel | null>(null);
  const [showCustomLevelsModal, setShowCustomLevelsModal] = useState(false);
  
  const [editorConfig, setEditorConfig] = useState({ size: 10 });
  const [editorGrid, setEditorGrid] = useState<number[][]>([]);
  const [editorStart, setEditorStart] = useState<{x: number, y: number} | null>(null);
  const [editorExit, setEditorExit] = useState<{x: number, y: number} | null>(null);
  const [editorItems, setEditorItems] = useState<{x: number, y: number, type: 'spike' | 'key'}[]>([]);
  const [editorTool, setEditorTool] = useState<'wall' | 'path' | 'start' | 'exit' | 'spike' | 'key'>('wall');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [victoryStars, setVictoryStars] = useState(0);

  // Helper for XP scaling: Base XP (level * 100) + 5% increase for every 10 levels
  const getXPToLevel = useCallback((level: number) => {
    const baseXP = level * 100;
    const bonusMultiplier = 1 + Math.floor(level / 10) * 0.05;
    return Math.floor(baseXP * bonusMultiplier);
  }, []);

  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [maze, setMaze] = useState(() => generateMaze(level));
  const [collectedKeys, setCollectedKeys] = useState(0);
  const [showWinEffect, setShowWinEffect] = useState(false);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(() => !!localStorage.getItem('maze-saved-game'));

  const [timeLeft, setTimeLeft] = useState(0);
  const [movesCount, setMovesCount] = useState(0);

  // Auto-Save Effect
  useEffect(() => {
    if (gameState === 'playing') {
      const savedData = {
        level,
        playerPos,
        maze,
        collectedKeys,
        timeLeft,
        movesCount,
        activeCustomLevel
      };
      localStorage.setItem('maze-saved-game', JSON.stringify(savedData));
      setHasSavedGame(true);
    } else if (['won', 'dead', 'fail'].includes(gameState)) {
      localStorage.removeItem('maze-saved-game');
      setHasSavedGame(false);
    }
  }, [gameState, playerPos, maze, collectedKeys, timeLeft, movesCount, level, activeCustomLevel]);

  const config = useMemo(() => {
    if (activeCustomLevel) {
      return { gridSize: activeCustomLevel.maze.size, timeLimit: 999 };
    }
    return getLevelConfig(level);
  }, [level, activeCustomLevel]);

  // Session tracking
  const [sessionCoins, setSessionCoins] = useState(0);
  const [sessionLevels, setSessionLevels] = useState(0);

  // Daily Missions
  const [dailyChallengesState, setDailyChallengesState] = useState<DailyChallengeState>(() => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem('maze-daily-challenges');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) return parsed;
      } catch (e) {}
    }
    return {
      date: today,
      challenges: [
        { id: `mission_5_levels`, type: 'complete_levels', target: 5, progress: 0, completed: false, rewardType: 'coins', rewardAmount: 100, description: 'Complete 5 Levels' },
        { id: `mission_reach_75`, type: 'reach_level', target: 75, progress: 0, completed: false, rewardType: 'coins', rewardAmount: 500, description: 'Reach Level 75' },
        { id: `mission_coins_50`, type: 'session_coins', target: 50, progress: 0, completed: false, rewardType: 'coins', rewardAmount: 200, description: 'Bank 50 Coins' },
        { id: `mission_moves_200`, type: 'make_moves', target: 200, progress: 0, completed: false, rewardType: 'xp', rewardAmount: 300, description: 'Walk 200 Steps' },
        { id: `mission_keys_20`, type: 'collect_keys', target: 20, progress: 0, completed: false, rewardType: 'coins', rewardAmount: 250, description: 'Find 20 Keys' },
        { id: `mission_no_death`, type: 'complete_levels', target: 10, progress: 0, completed: false, rewardType: 'xp', rewardAmount: 500, description: '10 Perfect Runs' }
      ]
    };
  });
  
  const [showChallengesModal, setShowChallengesModal] = useState(false);
  const [showChallengeCompletedAlert, setShowChallengeCompletedAlert] = useState<DailyChallenge | null>(null);

  const updateChallengeProgress = useCallback((type: ChallengeType, amount: number) => {
    setDailyChallengesState(prev => {
      let isChanged = false;
      const newChallenges = prev.challenges.map(c => {
        if (c.type === type && !c.completed) {
          const newProgress = type === 'reach_level' ? Math.max(c.progress, amount) : Math.min(c.target, c.progress + amount);
          if (newProgress !== c.progress) {
            isChanged = true;
            let completed = false;
            if (newProgress >= c.target) {
              completed = true;
              setTimeout(() => setShowChallengeCompletedAlert({ ...c, progress: newProgress, completed: true }), 500);

              if (c.rewardType === 'coins') {
                setCoins(curr => curr + c.rewardAmount);
                setTotalCoinsEarned(curr => curr + c.rewardAmount);
              } else if (c.rewardType === 'xp') {
                setXP(curr => curr + c.rewardAmount);
              }
            }
            return { ...c, progress: newProgress, completed };
          }
        }
        return c;
      });

      if (isChanged) {
        const newState = { ...prev, challenges: newChallenges };
        localStorage.setItem('maze-daily-challenges', JSON.stringify(newState));
        return newState;
      }
      return prev;
    });
  }, []);

  // Level Up Logic
  useEffect(() => {
    const xpToLevel = getXPToLevel(playerLevel);
    if (xp >= xpToLevel) {
      setPlayerLevel(prev => prev + 1);
      setXP(prev => prev - xpToLevel);
      setShowLevelUp(true);
    }
  }, [xp, playerLevel, getXPToLevel]);

  const claimDailyReward = useCallback(() => {
    sounds.playClick();
    setShowChallengesModal(true);
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && isAudioInitialized) {
      sounds.startBGM();
    } else if (gameState !== 'playing') {
      sounds.stopBGM();
    }
  }, [gameState, isAudioInitialized]);

  // Patrol Movement Effect
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setMaze(prev => {
        const newPatrols = prev.patrols.map(p => {
          let nx = p.x, ny = p.y;
          if (p.axis === 'x') {
            nx += p.direction;
            if (nx > p.targetX || nx < p.startX || prev.walls[ny][nx]) p.direction *= -1;
            else p.x = nx;
          } else {
            ny += p.direction;
            if (ny > p.targetY || ny < p.startY || prev.walls[ny][nx]) p.direction *= -1;
            else p.y = ny;
          }
          return { ...p };
        });
        
    // Check collision
        const colliding = newPatrols.some(p => Math.floor(p.x) === playerPos.x && Math.floor(p.y) === playerPos.y);
        if (colliding) {
          if (hasShield) {
            setHasShield(false);
            addToast('🛡️ SHIELD BROKEN!');
            if (navigator.vibrate) navigator.vibrate(50);
          } else {
            // DUSHMAN BOT RESET: Move player back to start
            setPlayerPos(prev.start);
            triggerShake();
            sounds.playFailure();
            addToast('💀 DUSHMAN ATTACK: RESET TO START!');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          }
        }

        return { ...prev, patrolCount: prev.patrols.length, patrols: newPatrols };
      });
    }, config.patrolSpeed);
    return () => clearInterval(interval);
  }, [gameState, playerPos, config.patrolSpeed]);

  // Timer Effect
  useEffect(() => {
    if (gameState !== 'playing' || !isAudioInitialized) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('fail');
          setFailReason('TIME EXHAUSTED');
          sounds.playFailure();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, isAudioInitialized]);


  const initLevel = useCallback((lvl: number, customLvl?: CustomLevel | null, extraTime = false) => {
    const targetCustomLvl = customLvl !== undefined ? customLvl : activeCustomLevel;
    setActiveCustomLevel(targetCustomLvl || null);

    if (targetCustomLvl) {
      setMaze(JSON.parse(JSON.stringify(targetCustomLvl.maze)));
      setPlayerPos(targetCustomLvl.maze.start);
      setGameState(prev => prev === 'home' ? 'home' : 'playing');
      setCollectedKeys(0);
      setShowWinEffect(false);
      setTimeLeft(999);
      setMovesCount(0);
      return;
    }

    const newMaze = generateMaze(lvl, difficulty);
    const newConfig = getLevelConfig(lvl, difficulty);
    setMaze(newMaze);
    setPlayerPos(newMaze.start);
    setGameState(prev => prev === 'home' ? 'home' : 'playing');
    setCollectedKeys(0);
    setShowWinEffect(false);
    setTimeLeft(newConfig.timeLimit + (extraTime ? 20 : 0));
    setMovesCount(0);
    localStorage.setItem('logic-maze-level', lvl.toString());
  }, [activeCustomLevel, difficulty]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 500);
      return;
    }
    localStorage.setItem('maze-user-name', userName);
    setIsLoggedIn(true);
    setGameState('home');
    sounds.resume();
    setIsAudioInitialized(true);
  };

  const [activeXPBoost, setActiveXPBoost] = useState(false);

  const handleStart = () => {
    setSessionCoins(0);
    
    // Check Boosters
    const boosterShield = localStorage.getItem('booster_shield') === 'true';
    const boosterTime = localStorage.getItem('booster_time') === 'true';
    const boosterXP = localStorage.getItem('booster_xp') === 'true';

    setHasShield(boosterShield);
    setActiveXPBoost(boosterXP);
    
    localStorage.removeItem('booster_shield');
    localStorage.removeItem('booster_time');
    localStorage.removeItem('booster_xp');

    sounds.resume();
    updateChallengeProgress('reach_level', level);
    sounds.playClick();
    setIsAudioInitialized(true);
    setGameState('playing');
    initLevel(level, null, boosterTime);
  };

  const handleResume = () => {
    const stored = localStorage.getItem('maze-saved-game');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Load state
        setLevel(data.level);
        setPlayerPos(data.playerPos);
        setMaze(data.maze);
        setCollectedKeys(data.collectedKeys);
        setTimeLeft(data.timeLeft);
        setMovesCount(data.movesCount);
        setActiveCustomLevel(data.activeCustomLevel);
        
        sounds.resume();
        sounds.playClick();
        setIsAudioInitialized(true);
        setGameState('playing');
        addToast('RESUMED FROM LAST SAVE');
      } catch (e) {
        localStorage.removeItem('maze-saved-game');
        setHasSavedGame(false);
        handleStart();
      }
    }
  };

  // Editor Functions
  const initEditor = (size: number) => {
    const newGrid = Array(size).fill(0).map(() => Array(size).fill(0));
    setEditorGrid(newGrid);
    setEditorStart(null);
    setEditorExit(null);
    setEditorItems([]);
    setEditorConfig({ size });
    setGameState('editor');
  };

  const handleEditorCellClick = (x: number, y: number) => {
    if (editorTool === 'wall' || editorTool === 'path') {
      const newGrid = [...editorGrid];
      newGrid[y] = [...newGrid[y]];
      newGrid[y][x] = editorTool === 'wall' ? 1 : 0;
      setEditorGrid(newGrid);
      setEditorItems(items => items.filter(i => i.x !== x || i.y !== y));
      if (editorStart?.x === x && editorStart?.y === y) setEditorStart(null);
      if (editorExit?.x === x && editorExit?.y === y) setEditorExit(null);
    } else if (editorTool === 'start') {
      setEditorStart({ x, y });
      const newGrid = [...editorGrid];
      newGrid[y] = [...newGrid[y]];
      newGrid[y][x] = 0;
      setEditorGrid(newGrid);
      setEditorItems(items => items.filter(i => i.x !== x || i.y !== y));
      if (editorExit?.x === x && editorExit?.y === y) setEditorExit(null);
    } else if (editorTool === 'exit') {
      setEditorExit({ x, y });
      const newGrid = [...editorGrid];
      newGrid[y] = [...newGrid[y]];
      newGrid[y][x] = 0;
      setEditorGrid(newGrid);
      setEditorItems(items => items.filter(i => i.x !== x || i.y !== y));
      if (editorStart?.x === x && editorStart?.y === y) setEditorStart(null);
    } else if (editorTool === 'spike' || editorTool === 'key') {
      const newGrid = [...editorGrid];
      newGrid[y] = [...newGrid[y]];
      newGrid[y][x] = 0;
      setEditorGrid(newGrid);
      if (editorStart?.x === x && editorStart?.y === y) setEditorStart(null);
      if (editorExit?.x === x && editorExit?.y === y) setEditorExit(null);
      setEditorItems(items => {
        const others = items.filter(i => i.x !== x || i.y !== y);
        return [...others, { x, y, type: editorTool, active: true }];
      });
    }
  };

  const saveCustomLevel = () => {
    if (!editorStart) return alert('Need a Start position');
    if (!editorExit) return alert('Need an Exit position');
    const name = prompt('Enter level name', `Custom Level ${customLevels.length + 1}`);
    if (!name) return;
    const newLevel: CustomLevel = {
      id: Date.now().toString(),
      name,
      maze: {
        size: editorConfig.size,
        walls: editorGrid.map(row => row.map(cell => cell === 1)),
        start: editorStart,
        portal: editorExit,
        items: editorItems.map((item, idx) => ({ ...item, id: `c-item-${idx}`, active: true })),
        patrols: []
      }
    };
    const newLevels = [...customLevels, newLevel];
    setCustomLevels(newLevels);
    localStorage.setItem('maze-custom-levels', JSON.stringify(newLevels));
    setGameState('home');
  };

  useEffect(() => {
    if (isLoggedIn) initLevel(level);
  }, [level, initLevel, isLoggedIn]);

  const move = useCallback((dx: number, dy: number) => {
    if (gameState !== 'playing') return;
    sounds.resume();
    if (!isAudioInitialized) setIsAudioInitialized(true);

    const nx = playerPos.x + dx, ny = playerPos.y + dy;

    if (nx < 0 || nx >= config.gridSize || ny < 0 || ny >= config.gridSize || maze.walls[ny][nx]) {
      sounds.playWallHit();
      if (gameState === 'playing') triggerShake();
      return;
    }

    if (config.moveLimit && movesCount + 1 >= config.moveLimit) {
      setGameState('fail');
      setFailReason('STEP LIMIT REACHED');
      sounds.playFailure();
      return;
    }

    sounds.playMove(dx, dy);
    setMovesCount(prev => prev + 1);

    updateChallengeProgress('make_moves', 1);

    let newItems = [...maze.items];
    const itemAt = newItems.find(i => i.x === nx && i.y === ny && i.active);
    if (itemAt) {
      if (itemAt.type === 'key') {
        itemAt.active = false;
        setCollectedKeys(prev => prev + 1);
        setTotalKeys(prev => prev + 1);
        setMaze(prev => ({ ...prev, items: newItems }));
        sounds.playKey();
        triggerParticles(nx, ny, '#fff01f');
        updateChallengeProgress('collect_keys', 1);
      } else if (itemAt.type === 'speed') {
        itemAt.active = false;
        setMaze(prev => ({ ...prev, items: newItems }));
        sounds.playPowerUp();
        setSpeedBoost(true);
        triggerParticles(nx, ny, '#00f2ff');
        addToast('⚡ SPEED BOOST ACTIVATED!');
        setTimeout(() => setSpeedBoost(false), 5000);
      } else if (itemAt.type === 'shield') {
        itemAt.active = false;
        setMaze(prev => ({ ...prev, items: newItems }));
        sounds.playPowerUp();
        setHasShield(true);
        triggerParticles(nx, ny, '#39ff14');
        addToast('🛡️ GHOST SHIELD ACTIVATED!');
      } else if (itemAt.type === 'chest') {
        itemAt.active = false;
        setMaze(prev => ({ ...prev, items: newItems }));
        sounds.playPowerUp();
        const reward = Math.floor(Math.random() * 81) + 20; // 20 to 100
        setCoins(prev => prev + reward);
        setSessionCoins(prev => {
          const newSessionCoins = prev + reward;
          updateChallengeProgress('session_coins', newSessionCoins);
          return newSessionCoins;
        });
        triggerParticles(nx, ny, '#ffd700');
        addToast(`💎 CHEST REVEALED: +${reward} COINS!`);
      } else if (itemAt.type === 'spike') {
        if (hasShield) {
          itemAt.active = false;
          setHasShield(false);
          addToast('🛡️ SHIELD DEPLOYED!');
          setMaze(prev => ({ ...prev, items: newItems }));
        } else {
          setGameState('dead');
          triggerShake();
          sounds.playFailure();
          return;
        }
      }
    }

    // Patrol Bot check
    if (maze.patrols.some(p => Math.floor(p.x) === nx && Math.floor(p.y) === ny)) {
      if (hasShield) {
        setHasShield(false);
        addToast('🛡️ SHIELD BROKEN!');
      } else {
        // DUSHMAN BOT RESET: Move player back to start
        setPlayerPos(maze.start);
        triggerShake();
        sounds.playFailure();
        addToast('💀 DUSHMAN ATTACK!');
        return;
      }
    }

    if (nx === maze.portal.x && ny === maze.portal.y && collectedKeys >= config.keyCount) {
      setGameState('won');
      setShowWinEffect(true);
      sounds.playSuccess();
      updateChallengeProgress('complete_levels', 1);
      
      // Calculate Stars
      const minSteps = config.gridSize * 1.5;
      let stars = 1;
      if (movesCount <= minSteps) stars = 3;
      else if (movesCount <= minSteps * 2) stars = 2;
      setVictoryStars(stars);

      if (!activeCustomLevel) {
        // Rewards
        const coinReward = 10;
        const xpReward = (20 + level * 2) * (activeXPBoost ? 2 : 1);
        
        if (activeXPBoost) {
          addToast('2X XP BOOST APPLIED!');
          setActiveXPBoost(false);
        }

        setCoins(prev => {
          const nc = prev + coinReward;
          localStorage.setItem('maze-coins', nc.toString());
          return nc;
        });
        setXP(prev => {
          const nxp = prev + xpReward;
          localStorage.setItem('maze-xp', nxp.toString());
          return nxp;
        });

        const nextLvl = Math.min(1000, level + 1);
        if (nextLvl > maxUnlockedLevel) {
          setMaxUnlockedLevel(nextLvl);
          localStorage.setItem('logic-maze-max-level', nextLvl.toString());
        }
      }
    }

    setPlayerPos({ x: nx, y: ny });
  }, [playerPos, maze, gameState, config, level, maxUnlockedLevel, collectedKeys, movesCount, isAudioInitialized, updateChallengeProgress, activeCustomLevel]);

  useEffect(() => {
    const handleKD = (e: KeyboardEvent) => {
      if (!isLoggedIn) return;
      if (['ArrowUp', 'w'].includes(e.key)) move(0, -1);
      if (['ArrowDown', 's'].includes(e.key)) move(0, 1);
      if (['ArrowLeft', 'a'].includes(e.key)) move(-1, 0);
      if (['ArrowRight', 'd'].includes(e.key)) move(1, 0);
      if (e.key.toLowerCase() === 'r') initLevel(level);
    };
    window.addEventListener('keydown', handleKD);
    return () => window.removeEventListener('keydown', handleKD);
  }, [move, initLevel, level, isLoggedIn]);

  const buySkin = (skinColor: string, price: number) => {
    if (unlockedSkins.includes(skinColor)) {
      setPlayerColor(skinColor);
      localStorage.setItem('maze-player-color', skinColor);
      return;
    }
    if (coins >= price) {
      const updatedCoins = coins - price;
      setCoins(updatedCoins);
      const updatedUnlocked = [...unlockedSkins, skinColor];
      setUnlockedSkins(updatedUnlocked);
      setPlayerColor(skinColor);
      localStorage.setItem('maze-coins', updatedCoins.toString());
      localStorage.setItem('maze-unlocked-skins', JSON.stringify(updatedUnlocked));
      localStorage.setItem('maze-player-color', skinColor);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xs space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-black text-[#00f2ff] tracking-[10px] uppercase mb-2">MAZE</h1>
            <p className="text-zinc-500 text-[10px] tracking-[4px] uppercase">Initializing Session...</p>
          </div>
          
          <div className="relative h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute top-0 left-0 h-full bg-[#00f2ff] shadow-[0_0_10px_#00f2ff]"
            />
          </div>
          
          <div className="flex justify-between text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
             <span>Core System</span>
             <span>v4.0.0</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-[#050505] flex items-center justify-center p-6 font-mono" style={{ background: 'radial-gradient(circle at center, #1a1a1a 0%, #050505 100%)' }}>
        <motion.div 
          animate={loginError ? { x: [-10, 10, -10, 10, 0] } : {}}
          className="w-full max-w-sm bg-black/40 backdrop-blur-xl border border-[#00f2ff]/30 p-10 rounded-3xl shadow-[0_0_50px_rgba(0,242,255,0.1)]"
        >
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-[#00f2ff] rounded-2xl flex items-center justify-center shadow-[0_0_30px_#00f2ff]">
              <Lock className="w-10 h-10 text-black" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-center text-white tracking-[8px] mb-2 uppercase">Identity</h1>
          <p className="text-zinc-500 text-xs text-center mb-10 tracking-widest leading-loose">Access requested for grid protocol 1337</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#00f2ff] font-bold tracking-widest pl-2">User Designation</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter Name..."
                  className="w-full bg-[#111] border-2 border-[#222] rounded-xl py-4 pl-12 pr-4 text-white focus:border-[#00f2ff] transition-all outline-none"
                />
              </div>
            </div>
            
            <button 
              type="submit"
              className="w-full py-5 bg-[#00f2ff] text-black font-black uppercase tracking-[4px] rounded-xl shadow-[0_0_30px_rgba(0,242,255,0.3)] hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer"
            >
              Start Gaming
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#050505] text-[#e0e0e0] font-mono flex flex-col items-center overflow-hidden touch-none" 
         style={{ background: 'radial-gradient(circle at center, #1a1a1a 0%, #050505 100%)' }}>
      
      <AnimatePresence mode="wait">
        {gameState === 'home' && (
          <motion.div 
            key="home-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-[60] bg-black backdrop-blur-md flex flex-col items-center p-6 overflow-hidden"
          >
             {/* Progress Bar at the very top */}
             <div className="w-full pt-4 pb-2 relative z-10">
                <div className="flex justify-between items-end mb-1">
                   <span className="text-[10px] font-black text-zinc-500 tracking-[3px] uppercase">Neural Progress</span>
                   <span className="text-[10px] font-black text-[#00f2ff] tracking-[1px]">LVL {level} / 1000</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${(level / 1000) * 100}%` }}
                     className="h-full bg-gradient-to-r from-[#00f2ff] to-[#39ff14] shadow-[0_0_10px_rgba(0,242,255,0.5)]" 
                   />
                </div>
             </div>

             {/* Particle Background Effect */}
             <div className="absolute inset-0 pointer-events-none opacity-20">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    animate={{
                      y: [-40, 40, -40],
                      x: [-40, 40, -40],
                      opacity: [0.1, 0.4, 0.1],
                      scale: [1, 1.3, 1]
                    }}
                    transition={{
                      duration: 4 + Math.random() * 5,
                      repeat: Infinity,
                      delay: Math.random() * 8
                    }}
                    className="absolute rounded-full bg-[#00f2ff]"
                    style={{
                      width: Math.random() * 3 + 1 + 'px',
                      height: Math.random() * 3 + 1 + 'px',
                      left: Math.random() * 100 + '%',
                      top: Math.random() * 100 + '%'
                    }}
                  />
                ))}
             </div>
  
             <div className="w-full flex justify-between items-center mt-4 relative z-10">
                <div className="flex flex-col">
                  <div className="text-lg font-black text-[#fff01f] tracking-widest uppercase flex items-center gap-2 drop-shadow-[0_0_10px_rgba(255,240,31,0.4)]">
                    <CoinIcon className="w-5 h-5 fill-[#fff01f]" /> {coins}
                  </div>
                  <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Neon Balance</div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-1.5 text-white font-black text-sm">
                      <Trophy className="w-3.5 h-3.5 text-[#fff01f]" /> LVL {bestLevelEver}
                   </div>
                   <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Hall of Fame</div>
                </div>
             </div>
  
              <div className="flex-1 flex flex-col items-center justify-center w-full gap-3 py-6">
                <div className="text-4xl font-black text-white tracking-[12px] uppercase mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">MAZE</div>
                
                <button 
                  onPointerDown={handleStart}
                  className="w-[85%] h-[60px] bg-[#00f2ff] text-black hover:bg-white hover:text-black hover:scale-102 transition-all uppercase font-black tracking-[8px] text-lg rounded-2xl shadow-[0_0_30px_rgba(0,242,255,0.5)] active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  {hasSavedGame ? 'NEW RUN' : 'INITIALIZE'}
                </button>
                
                {hasSavedGame && (
                  <button 
                    onPointerDown={handleResume}
                    className="w-[85%] h-[60px] bg-white/5 border border-white/10 text-[#39ff14] hover:bg-[#39ff14]/10 hover:scale-102 transition-all uppercase font-black tracking-[8px] text-lg rounded-2xl shadow-[0_0_20px_rgba(57,255,20,0.2)] active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    CONTINUE
                  </button>
                )}

                {/* Simulation Difficulty Selector */}
                <div className="w-[85%] mt-4 bg-white/5 p-3 rounded-2xl border border-white/5 relative z-10">
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-zinc-500 tracking-[2px] uppercase">Simulation Intensity</span>
                      <span className={`text-[10px] font-black uppercase ${difficulty === 'easy' ? 'text-[#39ff14]' : difficulty === 'hard' ? 'text-red-500' : 'text-[#00f2ff]'}`}>
                         {difficulty}
                      </span>
                   </div>
                   <div className="flex gap-2">
                      {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                         <button
                           key={d}
                           onPointerDown={() => {
                              sounds.playClick();
                              setDifficulty(d);
                           }}
                           className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                              difficulty === d 
                              ? d === 'easy' ? 'bg-[#39ff14] text-black border-[#39ff14]' : d === 'hard' ? 'bg-red-600 text-white border-red-600' : 'bg-[#00f2ff] text-black border-[#00f2ff]'
                              : 'bg-zinc-900 text-zinc-600 border-white/5'
                           }`}
                         >
                            {d}
                         </button>
                      ))}
                   </div>
                </div>

                {/* Daily Missions List On Home Screen */}
                <div className="w-[85%] flex flex-col gap-2 mt-4">
                  <div className="text-[10px] font-black text-zinc-500 tracking-[3px] uppercase flex justify-between items-center mb-1">
                    <span>Active Missions</span>
                    <span className="text-[#39ff14] text-[8px]">+{dailyChallengesState.challenges.filter(c => c.completed).length}/{dailyChallengesState.challenges.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {dailyChallengesState.challenges.map(c => (
                      <div key={c.id} className="bg-white/5 border border-white/5 p-2 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex flex-col flex-1">
                          <div className="text-[9px] text-white font-bold opacity-80 uppercase tracking-wider">{c.description}</div>
                          <div className="w-full h-1 bg-black/40 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${c.completed ? 'bg-[#39ff14]' : 'bg-[#00f2ff]'}`}
                              style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-[#fff01f] text-[9px] font-black">+{c.rewardAmount}¢</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 w-[85%] mt-4">
                  <button
                    onPointerDown={() => {
                      sounds.playClick();
                      setShowCustomLevelsModal(true);
                    }}
                    className="flex-1 h-[50px] bg-[#111] border border-white/10 text-white hover:border-[#00f2ff] transition-all uppercase font-black tracking-[2px] text-[9px] rounded-xl active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    CUSTOM
                  </button>
                  <button
                    onPointerDown={() => {
                      sounds.playClick();
                      initEditor(10);
                    }}
                    className="flex-1 h-[50px] bg-[#111] border border-white/10 text-white hover:border-[#39ff14] transition-all uppercase font-black tracking-[2px] text-[9px] rounded-xl active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    EDITOR
                  </button>
                </div>
              </div>
  
             <div className="w-full flex justify-center items-end mb-6 gap-3">
               <button 
                 onPointerDown={() => {
                   sounds.playClick();
                   setShowShop(true);
                 }}
                 className="flex-1 max-w-[90px] h-[80px] bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
               >
                 <ShoppingBag className="w-6 h-6 text-[#00f2ff]" />
                 <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Shop</span>
               </button>
  
               <button 
                 onPointerDown={() => {
                   sounds.playClick();
                   setShowChallengesModal(true);
                 }}
                 className="flex-1 max-w-[90px] h-[80px] bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all relative cursor-pointer"
               >
                 <ListTodo className="w-6 h-6 text-[#39ff14]" />
                 <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Goals</span>
                 {dailyChallengesState.challenges.some(c => !c.completed) && (
                   <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                 )}
               </button>
  
               <button 
                 onPointerDown={() => {
                   sounds.playClick();
                   setShowSettings(true);
                 }}
                 className="flex-1 max-w-[90px] h-[80px] bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
               >
                 <Settings className="w-6 h-6 text-zinc-400" />
                 <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Config</span>
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState === 'editor' && (
        <div className="absolute inset-0 z-[60] bg-black flex flex-col items-center pt-8">
           <h2 className="text-2xl font-black text-white tracking-[8px] uppercase mb-4">Level Editor</h2>
           
           <div className="w-full max-w-2xl px-4 py-2 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
             {['wall', 'path', 'start', 'exit', 'spike', 'key'].map((t) => (
               <button 
                 key={t}
               onPointerDown={() => { sounds.playClick(); setEditorTool(t as any); }}
                 className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 hover:scale-105 active:scale-95 cursor-pointer ${
                   editorTool === t 
                     ? 'bg-[#00f2ff] text-black border-[#00f2ff]' 
                     : 'bg-[#111] text-zinc-500 border-[#222] hover:border-zinc-700'
                 }`}
               >
                 {t}
               </button>
             ))}
           </div>
           
           <div className="flex-1 w-full max-w-2xl px-4 flex flex-col items-center justify-center min-h-[300px]">
             <div 
               className="relative bg-[#0a0a0a] border-4 border-[#222] rounded-3xl overflow-hidden aspect-square w-full max-w-sm shrink-0 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
             >
               {editorGrid.map((row, y) => (
                 <div key={y} className="flex" style={{ height: `${100 / editorConfig.size}%` }}>
                   {row.map((cell, x) => (
                     <div 
                       key={x} 
                       onPointerDown={() => handleEditorCellClick(x, y)}
                       onPointerEnter={(e) => {
                         if (e.buttons === 1) handleEditorCellClick(x, y);
                       }}
                       style={{ width: `${100 / editorConfig.size}%` }}
                       className={`border-[0.5px] border-[#222]/30 flex items-center justify-center transition-colors cursor-crosshair
                         ${cell === 1 ? 'bg-zinc-800' : 'bg-transparent hover:bg-[#111]'}`}
                     >
                        {editorStart?.x === x && editorStart?.y === y && <div className="w-3/4 h-3/4 bg-[#00f2ff] rounded-full shadow-[0_0_10px_#00f2ff]" />}
                        {editorExit?.x === x && editorExit?.y === y && <div className="w-3/4 h-3/4 bg-[#39ff14] rounded shadow-[0_0_10px_#39ff14]" />}
                        {editorItems.find(i => i.x === x && i.y === y && i.type === 'key') && <Star className="w-1/2 h-1/2 text-[#fff01f]" />}
                        {editorItems.find(i => i.x === x && i.y === y && i.type === 'spike') && <div className="w-1/2 h-1/2 bg-red-600 rotate-45" />}
                     </div>
                   ))}
                 </div>
               ))}
             </div>
           </div>
           
           <div className="flex gap-4 p-8 w-full max-w-sm mt-auto mb-4">
             <button 
               onPointerDown={() => { sounds.playClick(); setGameState('home'); }}
               className="w-1/2 py-4 bg-[#111] border-2 border-[#222] text-zinc-500 hover:text-white font-black tracking-widest uppercase rounded-2xl hover:scale-105 active:scale-95 transition-all text-xs cursor-pointer"
             >
               Discard
             </button>
             <button 
               onPointerDown={() => { sounds.playClick(); saveCustomLevel(); }}
               className="w-1/2 py-4 bg-[#00f2ff] text-black hover:bg-white hover:text-black font-black tracking-widest uppercase rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,242,255,0.4)] text-xs cursor-pointer"
             >
               Save Level
             </button>
           </div>
        </div>
      )}

      {/* Header */}
      <div className={`w-full max-w-2xl px-6 pt-6 pb-2 flex flex-col gap-3 z-20 ${gameState === 'home' || gameState === 'editor' ? 'hidden' : ''}`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center group">
                <select 
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value, 10))}
                  className="bg-black/80 border-2 border-[#00f2ff]/40 text-[#00f2ff] font-black py-2 pl-4 pr-10 rounded-xl outline-none focus:border-[#00f2ff] appearance-none cursor-pointer text-xl tracking-[4px] shadow-[0_0_20px_rgba(0,242,255,0.1)] hover:shadow-[0_0_30px_rgba(0,242,255,0.2)] transition-all"
                >
                  {[...Array(maxUnlockedLevel)].map((_, i) => (
                    <option key={i + 1} value={i + 1} className="bg-[#111] text-white">LVL {String(i + 1).padStart(2, '0')}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 w-5 h-5 text-[#00f2ff] pointer-events-none group-hover:scale-110 transition-transform" />
              </div>
              
              {level < maxUnlockedLevel && (
                <button 
                  onPointerDown={() => setLevel(maxUnlockedLevel)}
                  className="bg-[#39ff14]/10 border border-[#39ff14]/40 text-[#39ff14] text-[9px] px-3 py-2 rounded-lg hover:bg-[#39ff14]/20 transition-all uppercase font-black tracking-widest flex items-center gap-1 shadow-[0_0_15px_rgba(57,255,20,0.1)] hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <ChevronsRight className="w-3 h-3" />
                  Next
                </button>
              )}
            </div>
            <div className="text-[8px] text-zinc-500 uppercase tracking-[3px] mt-2 font-bold flex items-center gap-2">
              <span className="w-1 h-1 bg-[#00f2ff] rounded-full animate-pulse" />
              Rank {playerLevel}: {userName}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-[#fff01f]">
                <CoinIcon className="w-4 h-4 fill-[#fff01f]/20" />
                <span className="text-sm font-black">{coins}</span>
              </div>
              <div className="w-24 h-1 bg-zinc-900 rounded-full mt-1 overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${(xp / getXPToLevel(playerLevel)) * 100}%` }} 
                />
              </div>
            </div>
            <button 
              onPointerDown={() => {
                sounds.playClick();
                setGameState('home');
              }}
              className="px-4 py-2 bg-red-600 border-2 border-white/20 rounded-xl text-white font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,0,0,0.3)] flex items-center gap-2"
              title="Exit to Home"
            >
              <X className="w-4 h-4" />
              EXIT
            </button>
          </div>
        </div>
        
        {/* Hard Mode Stats */}
        <div className="flex gap-4">
          <div className="flex-1 flex items-center gap-2 bg-black/40 px-3 py-2 rounded border border-[#222]">
            <Clock className={`w-3 h-3 ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`} />
            <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full bg-[#39ff14] transition-all" style={{ width: `${(timeLeft / config.timeLimit) * 100}%` }} />
            </div>
          </div>
          {config.moveLimit && (
            <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded border border-[#222]">
              <Footprints className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] font-bold">{config.moveLimit - movesCount} <span className="text-zinc-600">STEPS</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 w-full flex items-center justify-center p-4 relative">
        <motion.div 
          animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
          transition={{ duration: 0.2 }}
          className="relative rounded-sm overflow-hidden bg-[#111] border-2 border-[#333] shadow-[0_0_60px_rgba(0,0,0,0.8)]"
          style={{ width: 'min(80vw, 380px)', height: 'min(80vw, 380px)', display: 'grid', gridTemplateColumns: `repeat(${config.gridSize}, 1fr)`, gridTemplateRows: `repeat(${config.gridSize}, 1fr)` }}
        >
          {/* Particle System */}
          <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
             {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{ left: `${(p.x / config.gridSize) * 100}%`, top: `${(p.y / config.gridSize) * 100}%`, opacity: 1, scale: 1 }}
                animate={{ 
                  left: `${(p.x / config.gridSize) * 100 + (Math.random() - 0.5) * 40}%`, 
                  top: `${(p.y / config.gridSize) * 100 + (Math.random() - 0.5) * 40}%`,
                  opacity: 0,
                  scale: 0 
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
            ))}
          </div>

            {/* Player Light aura */}
            <div 
              className="absolute pointer-events-none z-10 transition-all duration-300 rounded-full blur-[40px] opacity-20"
              style={{
                left: `${(playerPos.x / config.gridSize) * 100}%`,
                top: `${(playerPos.y / config.gridSize) * 100}%`,
                width: `${(3 / config.gridSize) * 100}%`,
                height: `${(3 / config.gridSize) * 100}%`,
                backgroundColor: playerColor,
                transform: 'translate(-33%, -33%)',
                boxShadow: `0 0 100px 50px ${playerColor}44`
              }}
            />

            {maze.walls.flatMap((row, y) => row.map((isWall, x) => {
            const isVisible = !config.hasFog || Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y) <= 3;
            return (
              <div key={`wall-${x}-${y}`} className={`w-full h-full transition-opacity duration-300 ${isWall ? 'bg-[#222]' : 'bg-[#0a0a0a]'} ${!isVisible ? 'opacity-0' : 'opacity-100'}`} />
            );
          }))}

          {maze.items.map((item) => {
            const isVisible = !config.hasFog || Math.abs(item.x - playerPos.x) + Math.abs(item.y - playerPos.y) <= 3;
            return item.active && isVisible && (
              <div key={`item-${item.id}`} className="absolute flex items-center justify-center transition-all" style={{ left: `${(item.x / config.gridSize) * 100}%`, top: `${(item.y / config.gridSize) * 100}%`, width: `${100 / config.gridSize}%`, height: `${100 / config.gridSize}%` }}>
                {item.type === 'key' ? <div className="w-[50%] h-[50%] bg-[#fff01f] shadow-[0_0_15px_#fff01f]" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} /> : 
                 item.type === 'speed' ? <div className="w-[60%] h-[60%] bg-[#00f2ff] flex items-center justify-center animate-pulse"><Zap className="w-full h-full fill-[#00f2ff]" /></div> :
                 item.type === 'shield' ? <div className="w-[60%] h-[60%] bg-[#39ff14] flex items-center justify-center animate-pulse rounded-full shadow-[0_0_15px_#39ff14]"><Shield className="w-[70%] h-[70%] text-black fill-black" /></div> :
                 item.type === 'chest' ? <div className="w-[60%] h-[60%] bg-[#ffd700] flex items-center justify-center animate-bounce rounded shadow-[0_0_15px_#ffd700] border-2 border-white/20"><Trophy className="w-[70%] h-[70%] text-black fill-black" /></div> :
                 <div className="w-[60%] h-[60%] bg-[#ff3131] shadow-[0_0_10px_#ff3131]" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} />}
              </div>
            );
          })}

          {maze.patrols.map((p) => {
            const isVisible = !config.hasFog || Math.abs(p.x - playerPos.x) + Math.abs(p.y - playerPos.y) <= 3;
            return isVisible && (
              <div key={`patrol-${p.id}`} className="absolute flex items-center justify-center transition-all duration-400" style={{ left: `${(p.x / config.gridSize) * 100}%`, top: `${(p.y / config.gridSize) * 100}%`, width: `${100 / config.gridSize}%`, height: `${100 / config.gridSize}%` }}>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-red-600 rounded-full blur-md"
                />
                <div className="w-[80%] h-[80%] bg-zinc-900 border-2 border-red-500 rounded-xl shadow-[0_0_15px_#ff0000] flex items-center justify-center relative z-10">
                   <Skull className="w-[60%] h-[60%] text-red-500" />
                   <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                </div>
              </div>
            );
          })}

          <div key="portal" className="absolute flex items-center justify-center" style={{ left: `${(maze.portal.x / config.gridSize) * 100}%`, top: `${(maze.portal.y / config.gridSize) * 100}%`, width: `${100 / config.gridSize}%`, height: `${100 / config.gridSize}%` }}>
            <div className={`w-[80%] h-[80%] rounded-full transition-all duration-500 flex items-center justify-center ${collectedKeys >= config.keyCount ? 'bg-[#39ff14] shadow-[0_0_20px_#39ff14]' : 'border-2 border-dashed border-[#333]'}`}>
              {collectedKeys < config.keyCount && <Lock className="w-[40%] h-[40%] text-[#333]" />}
            </div>
          </div>

          <motion.div 
            key="player"
            layout 
            transition={{ type: 'spring', stiffness: 450, damping: 35 }} 
            className="absolute z-10 flex items-center justify-center p-1" 
            style={{ 
              left: `${(playerPos.x / config.gridSize) * 100}%`, 
              top: `${(playerPos.y / config.gridSize) * 100}%`, 
              width: `${100 / config.gridSize}%`, 
              height: `${100 / config.gridSize}%`, 
            }}
          >
            {/* Skin Aura Effects */}
            {skins.find(s => s.color === playerColor)?.effect === 'glow' && (
              <div className="absolute inset-0 bg-[inherit] rounded-full blur-md opacity-60 animate-pulse" style={{ backgroundColor: playerColor }} />
            )}
            {skins.find(s => s.color === playerColor)?.effect === 'trail' && (
              <motion.div 
                initial={{ opacity: 0.5, scale: 1 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full" 
                style={{ border: `2px solid ${playerColor}` }}
              />
            )}
            {skins.find(s => s.color === playerColor)?.effect === 'sparkle' && (
              <div className="absolute -inset-1 blur-[2px] opacity-40 animate-spin" style={{ background: `conic-gradient(from 0deg, transparent, ${playerColor}, transparent)` }} />
            )}

            {speedBoost && (
              <div className="absolute -inset-2 border-2 border-[#00f2ff] rounded-full opacity-50 animate-ping" />
            )}

            {hasShield && (
              <div className="absolute -inset-2 border-2 border-[#39ff14] rounded-full opacity-60 animate-pulse" />
            )}

            {skins.find(s => s.color === playerColor)?.effect === 'pulse' && (
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 bg-[inherit] rounded-full blur-xl" 
                style={{ backgroundColor: playerColor }} 
              />
            )}
            
            <div 
              className="w-full h-full rounded-sm relative z-20 flex items-center justify-center overflow-hidden" 
              style={{ 
                backgroundColor: playerColor,
                boxShadow: `0 0 15px ${playerColor}`,
                transform: 'scale(0.8)'
              }}
            >
              {speedBoost && <Zap className="w-[60%] h-[60%] text-black fill-black" />}
            </div>
          </motion.div>

          <AnimatePresence>
            {(gameState === 'dead' || gameState === 'fail') && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#210000]/90 backdrop-blur-[4px] z-30 flex flex-col items-center justify-center p-4">
                <div className="bg-black/80 border-2 border-[#ff3131] p-4 rounded-[24px] flex flex-col items-center shadow-[0_0_50px_rgba(255,49,49,0.2)] max-w-[280px] w-[90%]">
                  <Skull className="w-7 h-7 text-[#ff3131] mb-1 drop-shadow-[0_0_20px_#ff3131]" />
                  <h2 className="text-lg font-black text-white tracking-[2px] mb-0.5 text-center leading-none uppercase">{gameState === 'fail' ? failReason : 'ELIMINATED'}</h2>
                  <h3 className="text-[#ff3131] font-bold text-[9px] tracking-[2px] mb-3">GAME OVER</h3>
                  <div className="flex w-full gap-2 mt-2 shrink-0">
                    <button 
                      onPointerDown={() => {
                        sounds.playClick();
                        setGameState('home');
                      }} 
                      className="flex-1 py-3 bg-[#111] border-2 border-[#222] text-zinc-400 hover:text-white uppercase text-[9px] sm:text-[10px] font-bold tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer rounded-xl"
                    >
                      Go to Home
                    </button>
                    <button 
                      onPointerDown={() => {
                        sounds.playClick();
                        initLevel(level);
                      }} 
                      className="flex-1 py-3 bg-[#ff3131] text-black hover:bg-white hover:text-black uppercase text-[9px] sm:text-[10px] font-bold tracking-widest hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,49,49,0.3)] transition-all cursor-pointer rounded-xl"
                    >
                      Restart Level
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            {showWinEffect && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#002100]/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-4">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                  {[...Array(15)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: -50, x: Math.random() * 300 - 150, rotate: 0 }}
                      animate={{ y: 500, rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() * 1 }}
                      className="absolute w-1.5 h-3 bg-[#39ff14] opacity-40"
                      style={{ left: `${Math.random() * 100}%` }}
                    />
                  ))}
                </div>
                
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0, y: 30 }} 
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                  className="bg-black/90 backdrop-blur-2xl border-2 border-[#39ff14]/40 p-4 rounded-[32px] flex flex-col items-center justify-center shadow-[0_0_80px_rgba(57,255,20,0.3)] relative w-[90%] max-w-[240px]"
                >
                   <div className="w-10 h-10 bg-[#39ff14]/20 rounded-2xl flex items-center justify-center mb-3">
                      <Award className="w-6 h-6 text-[#39ff14] drop-shadow-[0_0_10px_#39ff14]" />
                   </div>
                   
                   <h2 className="text-xl font-black text-center text-white tracking-[3px] mb-1 uppercase italic leading-none">MISSION<br/>SUCCESS</h2>
                   <p className="text-[7px] font-black text-zinc-500 tracking-[3px] uppercase mb-4">Neural Protocol Complete</p>
                   
                   <div className="flex gap-1 mb-5">
                      {[...Array(3)].map((_, i) => (
                        <Star key={`win-star-${i}`} className={`w-5 h-5 ${i < victoryStars ? 'text-[#fff01f] fill-[#fff01f] drop-shadow-[0_0_8px_#fff01f]' : 'text-zinc-800'}`} />
                      ))}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 w-full mb-6">
                      <div className="flex flex-col items-center bg-white/5 p-2 rounded-2xl border border-white/5">
                        <span className="text-[6px] text-zinc-500 uppercase tracking-widest font-black mb-1">Credits</span>
                        <div className="text-[#fff01f] font-black text-sm flex items-center gap-1">+{150 + level * 5}<CoinIcon className="w-2.5 h-2.5 fill-[#fff01f]" /></div>
                      </div>
                      <div className="flex flex-col items-center bg-white/5 p-2 rounded-2xl border border-white/5">
                        <span className="text-[6px] text-zinc-500 uppercase tracking-widest font-black mb-1">XP Gain</span>
                        <div className="text-indigo-400 font-black text-sm flex items-center gap-1">+{25 + level * 3}<Zap className="w-2.5 h-2.5 fill-indigo-400" /></div>
                      </div>
                   </div>

                   <button 
                      onPointerDown={() => {
                        sounds.playClick();
                        updateChallengeProgress('complete_levels', 1);
                        updateChallengeProgress('reach_level', level + 1);
                        const nextLvl = Math.min(1000, level + 1);
                        initLevel(nextLvl);
                        setGameState('playing');
                      }}
                      className="w-full py-4 bg-[#39ff14] text-black font-black tracking-[4px] uppercase rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(57,255,20,0.4)] cursor-pointer text-[10px] mb-2"
                   >
                    Proceed Forward
                   </button>
                   
                   <button 
                      onPointerDown={() => {
                        sounds.playClick();
                        setGameState('home');
                        setLevel(Math.min(1000, level + 1));
                      }}
                      className="w-full text-zinc-600 font-bold uppercase text-[8px] tracking-[4px] hover:text-white transition-colors"
                   >
                    Return to Base
                   </button>
                </motion.div>
              </motion.div>
            )}
            
            {showLevelUp && (
              <motion.div 
                initial={{ y: 100, opacity: 0, scale: 0.8 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                exit={{ y: -100, opacity: 0, scale: 0.8 }}
                onAnimationComplete={() => setTimeout(() => setShowLevelUp(false), 3000)}
                className="absolute top-1/4 left-1/2 -translate-x-1/2 z-[60] bg-white text-black font-black px-8 py-4 rounded-[2rem] shadow-[0_0_50px_white] flex flex-col items-center gap-1 uppercase tracking-[4px]"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-zinc-900" />
                  Level Up!
                </div>
                <div className="text-[10px] text-zinc-500 tracking-widest">
                  RANK {playerLevel} ACHIEVED • NEXT: {getXPToLevel(playerLevel)} XP
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        {config.hasFog && <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded border border-[#00f2ff]/20"><EyeOff className="w-3 h-3 text-[#00f2ff]" /><span className="text-[8px] text-[#00f2ff] uppercase tracking-widest font-bold">Fog Protocol Active</span></div>}
      </div>

      {/* Inventory & Status Overlay */}
      <div className={`w-full max-w-md px-8 py-3 flex justify-between items-center bg-black/60 border-y border-[#1a1a1a] ${gameState === 'home' || gameState === 'editor' ? 'hidden' : ''}`}>
        <div className="flex flex-col">
          <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-black mb-1">Items</span>
          <div className="flex gap-1.5 min-h-[20px]">
            {config.keyCount > 0 ? [...Array(config.keyCount)].map((_, i) => (
              <div key={`inv-key-${i}`} className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-all ${i < collectedKeys ? 'bg-[#fff01f]/20 border-[#fff01f]' : 'border-dashed border-[#222]'}`}>{i < collectedKeys && <div className="w-1/2 h-1/2 bg-[#fff01f]" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />}</div>
            )) : <span className="text-[9px] text-[#333] pt-1">NONE</span>}
          </div>
        </div>
        <div className={`text-[10px] font-black tracking-widest ${gameState === 'dead' ? 'text-[#ff3131]' : 'text-[#00f2ff]'}`}>
          {gameState === 'dead' ? 'DOWN' : 'PROTOCOL ACTIVE'}
        </div>
      </div>

      {/* NEURAL COMMAND CENTER (Adjusted Buttons) */}
      <div className={`w-full px-4 flex flex-col items-center justify-center z-20 pb-4 ${gameState === 'home' || gameState === 'editor' ? 'hidden' : ''}`}>
        <div className="flex gap-4 mb-4">
           <button 
             onPointerDown={() => { sounds.playClick(); initLevel(level); }}
             className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-all shadow-lg active:scale-90"
           >
             <RotateCcw className="w-5 h-5" />
           </button>
           <div className="grid grid-cols-3 gap-3">
              <div />
              <button onPointerDown={(e) => { e.preventDefault(); sounds.resume(); if (navigator.vibrate) navigator.vibrate(10); move(0, -1); }} className="w-20 h-20 bg-gradient-to-b from-[#222] to-[#111] border-2 border-[#333] rounded-3xl flex items-center justify-center hover:border-[#00f2ff] active:bg-[#00f2ff] active:text-black active:border-[#00f2ff] text-zinc-400 text-4xl shadow-2xl active:scale-90 transition-all outline-none cursor-pointer group">
                <ChevronUp className="w-10 h-10 group-active:text-black" />
              </button>
              <div />
              <button onPointerDown={(e) => { e.preventDefault(); sounds.resume(); if (navigator.vibrate) navigator.vibrate(10); move(-1, 0); }} className="w-20 h-20 bg-gradient-to-r from-[#222] to-[#111] border-2 border-[#333] rounded-3xl flex items-center justify-center hover:border-[#00f2ff] active:bg-[#00f2ff] active:text-black active:border-[#00f2ff] text-zinc-400 text-4xl shadow-2xl active:scale-90 transition-all outline-none cursor-pointer group">
                <ChevronLeft className="w-10 h-10 group-active:text-black" />
              </button>
              <button onPointerDown={(e) => { e.preventDefault(); sounds.resume(); if (navigator.vibrate) navigator.vibrate(10); move(0, 1); }} className="w-20 h-20 bg-gradient-to-t from-[#222] to-[#111] border-2 border-[#333] rounded-3xl flex items-center justify-center hover:border-[#00f2ff] active:bg-[#00f2ff] active:text-black active:border-[#00f2ff] text-zinc-400 text-4xl shadow-2xl active:scale-90 transition-all outline-none cursor-pointer group">
                <ChevronDown className="w-10 h-10 group-active:text-black" />
              </button>
              <button onPointerDown={(e) => { e.preventDefault(); sounds.resume(); if (navigator.vibrate) navigator.vibrate(10); move(1, 0); }} className="w-20 h-20 bg-gradient-to-l from-[#222] to-[#111] border-2 border-[#333] rounded-3xl flex items-center justify-center hover:border-[#00f2ff] active:bg-[#00f2ff] active:text-black active:border-[#00f2ff] text-zinc-400 text-4xl shadow-2xl active:scale-90 transition-all outline-none cursor-pointer group">
                <ChevronRight className="w-10 h-10 group-active:text-black" />
              </button>
           </div>
           <button 
             onPointerDown={() => { sounds.resume(); sounds.playClick(); setGameState('home'); }}
             className="w-12 h-12 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center text-zinc-500 hover:text-red-500 transition-all shadow-lg active:scale-90"
           >
             <Home className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Skin Shop Modal */}
      <AnimatePresence>
        {showChallengesModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <div className="w-full max-w-sm">
              <h2 className="text-3xl font-black text-center text-white tracking-[8px] mb-2 uppercase">Daily Goals</h2>
              <div className="text-center text-zinc-500 text-[10px] tracking-widest uppercase mb-10">Resets at midnight</div>
              
              <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[60vh] pr-2 text-left">
                {dailyChallengesState.challenges.map((challenge) => (
                  <div key={challenge.id} className={`w-full p-5 flex flex-col gap-3 rounded-2xl border-2 transition-all ${challenge.completed ? 'border-[#39ff14]/30 bg-[#39ff14]/5' : 'border-[#222] bg-white/5 backdrop-blur-sm'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <div className="font-black tracking-widest text-[10px] text-[#00f2ff] uppercase mb-1">Mission</div>
                        <div className="font-bold tracking-widest text-sm text-white">{challenge.description}</div>
                      </div>
                      {challenge.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-[#39ff14] drop-shadow-[0_0_10px_#39ff14]" />
                      ) : (
                        <div className="flex items-center gap-1.5 bg-[#fff01f]/10 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-[#fff01f] border border-[#fff01f]/20">
                          +{challenge.rewardAmount} <CoinIcon className="w-3 h-3 fill-[#fff01f]" />
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (challenge.progress / challenge.target) * 100)}%` }}
                        className={`h-full transition-all duration-500 shadow-[0_0_10px] ${challenge.completed ? 'bg-[#39ff14] shadow-[#39ff14]' : 'bg-[#00f2ff] shadow-[#00f2ff]'}`}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-black tracking-widest text-zinc-500 uppercase">
                      <span className="text-white">{challenge.progress} <span className="text-zinc-600">/ {challenge.target}</span></span>
                      {challenge.completed ? <span className="text-[#39ff14]">Mission Success</span> : <span className="animate-pulse">Active</span>}
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onPointerDown={() => setShowChallengesModal(false)}
                className="w-full mt-10 py-5 border-2 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 font-black uppercase tracking-[4px] rounded-2xl hover:scale-105 active:scale-95 transition-all text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChallengeCompletedAlert && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setShowChallengeCompletedAlert(null), 3000)}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[110] bg-[#111] border-2 border-[#39ff14] text-white p-4 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(57,255,20,0.2)] w-max max-w-[90vw]"
          >
            <div className="w-10 h-10 bg-[#39ff14]/20 rounded-full flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-[#39ff14]" />
            </div>
            <div className="flex flex-col pr-4">
              <span className="text-[10px] text-[#39ff14] font-black uppercase tracking-widest">Goal Completed</span>
              <span className="font-bold text-sm">{showChallengeCompletedAlert.description}</span>
            </div>
            <div className="ml-auto pl-4 border-l border-[#222] flex items-center gap-1.5 font-black">
              +{showChallengeCompletedAlert.rewardAmount}
              {showChallengeCompletedAlert.rewardType === 'coins' ? <CoinIcon className="w-4 h-4 text-[#fff01f]" /> : <Zap className="w-4 h-4 text-[#00f2ff]" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShop && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-sm flex flex-col h-full pt-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-black text-white tracking-[8px] uppercase italic">Neural Market</h2>
                <div className="flex items-center gap-2 bg-[#fff01f]/10 px-4 py-2 rounded-2xl border border-[#fff01f]/30">
                  <CoinIcon className="w-5 h-5 text-[#fff01f] shadow-sm" />
                  <span className="text-[#fff01f] font-black text-xl">{coins}</span>
                </div>
              </div>

              <div className="flex gap-2 mb-6">
                 <button 
                   onPointerDown={() => setShopTab('skins')} 
                   className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border ${shopTab === 'skins' ? 'bg-[#00f2ff] text-black border-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.3)]' : 'bg-white/5 text-zinc-500 border-white/5'}`}
                 >Skins</button>
                 <button 
                   onPointerDown={() => setShopTab('boosters')} 
                   className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border ${shopTab === 'boosters' ? 'bg-[#39ff14] text-black border-[#39ff14] shadow-[0_0_20px_rgba(57,255,20,0.3)]' : 'bg-white/5 text-zinc-500 border-white/5'}`}
                 >Boosters</button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {shopTab === 'skins' ? (
                  skins.map((skin) => (
                    <button
                      key={skin.id}
                      onPointerDown={() => {
                         sounds.playClick();
                         if (unlockedSkins.includes(skin.color)) {
                           setPlayerColor(skin.color);
                         } else if (coins >= skin.price) {
                           setCoins(prev => prev - skin.price);
                           setUnlockedSkins(prev => [...prev, skin.color]);
                           setPlayerColor(skin.color);
                           addToast(`UNLOCKED: ${skin.name}`);
                         }
                      }}
                      className={`w-full p-4 flex items-center justify-between rounded-3xl border-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${
                        playerColor === skin.color 
                          ? 'border-[#00f2ff] bg-[#00f2ff]/10' 
                          : 'border-white/5 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl shadow-lg relative flex items-center justify-center border border-white/10" style={{ backgroundColor: skin.color, boxShadow: `0 0 20px ${skin.color}44` }}>
                           {skin.effect && <Sparkles className="w-4 h-4 text-black opacity-40 shrink-0" />}
                        </div>
                        <div className="flex flex-col text-left">
                          <div className="font-black tracking-widest text-[11px] uppercase text-white">{skin.name}</div>
                          <div className={`text-[8px] font-black uppercase ${skin.rarity === 'legendary' ? 'text-[#ff00ff]' : skin.rarity === 'rare' ? 'text-[#ffd700]' : 'text-zinc-500'}`}>{skin.rarity}</div>
                        </div>
                      </div>
                      {!unlockedSkins.includes(skin.color) ? (
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl">
                          <span className="text-[10px] font-black text-[#fff01f]">{skin.price}</span>
                          <CoinIcon className="w-3 h-3 text-[#fff01f]" />
                        </div>
                      ) : (
                        <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Equipped</div>
                      )}
                    </button>
                  ))
                ) : (
                  BOOSTERS.map((booster) => (
                    <button
                      key={booster.id}
                      onPointerDown={() => {
                         if (coins >= booster.price) {
                           setCoins(prev => prev - booster.price);
                           sounds.playPowerUp();
                           addToast(`PURCHASED: ${booster.name}`);
                           if (booster.type === 'shield_start') localStorage.setItem('booster_shield', 'true');
                           if (booster.type === 'time_plus') localStorage.setItem('booster_time', 'true');
                           if (booster.type === 'xp_boost') localStorage.setItem('booster_xp', 'true');
                         } else {
                           addToast('INSUFFICIENT CREDITS');
                         }
                      }}
                      className="w-full p-5 flex items-center justify-between rounded-3xl border-2 border-white/5 bg-white/5 hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#39ff14]/10 rounded-2xl flex items-center justify-center text-[#39ff14] border border-[#39ff14]/20">
                           {booster.icon}
                        </div>
                        <div className="flex flex-col text-left">
                          <div className="font-black tracking-widest text-xs uppercase text-white">{booster.name}</div>
                          <div className="text-[9px] text-zinc-500 font-bold uppercase">{booster.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-[#fff01f]/20">
                        <span className="text-[10px] font-black text-[#fff01f]">{booster.price}</span>
                        <CoinIcon className="w-3 h-3 text-[#fff01f]" />
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button 
                onPointerDown={() => setShowShop(false)}
                className="w-full mt-6 py-5 border-2 border-zinc-800 text-zinc-500 hover:text-white uppercase font-black tracking-[4px] rounded-2xl transition-all text-xs"
              >Back to Base</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8"
          >
            <div className="w-full max-w-sm bg-[#0a0a0a] border-2 border-[#00f2ff]/20 p-8 rounded-[40px] shadow-[0_0_80px_rgba(0,0,0,0.9)] relative">
              <button 
                onPointerDown={() => { sounds.playClick(); setShowSettings(false); }}
                className="absolute top-6 right-6 w-10 h-10 bg-[#111] rounded-full flex items-center justify-center border border-[#222] text-zinc-500 hover:text-white cursor-pointer active:scale-90 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-[#00f2ff] rounded-2xl shadow-[0_0_20px_rgba(0,242,255,0.4)] text-black">
                  <Settings className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-[6px] uppercase leading-none">System Settings</h2>
              </div>

              <div className="space-y-10">

                {/* SFX Volume */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                      <div className="text-zinc-500"><Volume2 className="w-4 h-4" /></div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-[#fff01f]">Audio Feedback</span>
                    </div>
                    <span className="text-xs font-black text-white">{Math.round(sfxVol * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={sfxVol} onChange={(e) => setSfxVol(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#fff01f]"
                  />
                </div>

                {/* Vibration Feedback */}
                <div className="flex items-center justify-between bg-[#111] p-5 rounded-3xl border border-[#222]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#39ff14]/10 rounded-xl text-[#39ff14]">
                      <Vibrate className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-black tracking-widest text-[#39ff14]">Haptic Engine</div>
                      <div className="text-[10px] text-zinc-500 font-bold">Touch Feedback</div>
                    </div>
                  </div>
                  <button 
                    onPointerDown={() => { sounds.playClick(); setVibrationOn(!vibrationOn); }}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${vibrationOn ? 'bg-[#39ff14]' : 'bg-[#222]'}`}
                  >
                    <div className={`absolute top-1 bottom-1 w-6 bg-white rounded-full transition-all duration-300 ${vibrationOn ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button 
                onPointerDown={() => { sounds.playClick(); setShowSettings(false); }}
                className="w-full mt-12 py-5 bg-[#00f2ff] text-black font-black uppercase tracking-[4px] rounded-2xl hover:scale-105 active:scale-95 transition-all text-xs shadow-[0_0_30px_rgba(0,242,255,0.3)] cursor-pointer"
              >
                Sync Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDailyReward && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-full max-w-sm bg-[#111] border-2 border-[#fff01f]/30 p-10 rounded-[40px] flex flex-col items-center shadow-[0_0_100px_rgba(255,240,31,0.15)]">
              <Calendar className="w-16 h-16 text-[#fff01f] mb-6 animate-bounce" />
              <h2 className="text-3xl font-black text-white tracking-[6px] mb-2 uppercase">Daily Reward</h2>
              <p className="text-zinc-400 text-sm tracking-widest uppercase mb-8">Login Streak: <span className="text-white font-black">{showDailyReward.streak} Days</span></p>
              
              <div className="bg-[#fff01f]/10 p-6 rounded-3xl border border-[#fff01f]/20 flex flex-col items-center w-full mb-8">
                <span className="text-[10px] text-[#fff01f] uppercase tracking-widest font-black mb-2">Bonus Coins</span>
                <div className="text-[#fff01f] font-black text-4xl flex items-center justify-center gap-3">
                   +{showDailyReward.coins} <CoinIcon className="w-8 h-8 fill-[#fff01f]" />
                </div>
              </div>
              
              <button 
                onPointerDown={() => setShowDailyReward(null)}
                className="w-full py-5 bg-[#fff01f] text-black font-black uppercase tracking-[4px] rounded-2xl hover:scale-105 active:scale-95 transition-all text-sm shadow-[0_0_30px_rgba(255,240,31,0.3)] cursor-pointer"
              >
                Claim
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Achievement Toasts */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 pointer-events-none w-[90%] max-w-[300px]">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ x: -20, opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="px-6 py-3 bg-black/80 border-2 border-[#fff01f] text-white text-[10px] font-black uppercase tracking-[2px] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center gap-3"
            >
              <div className="w-6 h-6 bg-[#fff01f] text-black rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,240,31,0.5)]">
                <Trophy className="w-4 h-4" />
              </div>
              <span className="leading-tight">{toast.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCustomLevelsModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <div className="w-full max-w-sm">
              <h2 className="text-3xl font-black text-center text-white tracking-[8px] mb-8 uppercase">Custom Levels</h2>
              
              <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[60vh] pr-2">
                {customLevels.length === 0 ? (
                  <div className="text-center text-zinc-500 font-bold uppercase tracking-widest py-10">No custom levels yet</div>
                ) : (
                  customLevels.map((lvl) => (
                    <div key={lvl.id} className="w-full p-5 flex flex-col gap-3 rounded-3xl border-2 border-[#222] bg-[#111]">
                      <div className="flex justify-between items-center">
                        <div className="text-left font-bold tracking-widest text-sm text-white">{lvl.name}</div>
                        <div className="text-[9px] font-black uppercase text-zinc-500">{lvl.maze.size}x{lvl.maze.size}</div>
                      </div>
                      <button 
                        onPointerDown={() => {
                           setShowCustomLevelsModal(false);
                           initLevel(0, lvl);
                        }}
                        className="w-full py-3 mt-2 bg-[#00f2ff]/10 border border-[#00f2ff]/20 text-[#00f2ff] hover:bg-[#00f2ff] hover:text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,242,255,0.1)] text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4" /> Play
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <button 
                onPointerDown={() => setShowCustomLevelsModal(false)}
                className="w-full mt-10 py-5 border-2 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 font-black uppercase tracking-[4px] rounded-2xl hover:scale-105 active:scale-95 transition-all text-xs cursor-pointer"
              >
                Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        body {
          overscroll-behavior: none;
          touch-action: none;
          user-select: none;
        }
      `}</style>
    </div>
  );
}
