/**
 * platform/audio.js —— 原版 Poke Jam 声音系统接入层
 * - AudioController：原版 ln 类的可读移植，负责球场环境音、喝彩与全部 SFX
 * - music.js：原版程序化 BGM（菜单轮播 / 比赛静音）
 * - 偏好键沿用本项目：pokedunk.muted / pokedunk.music / pokedunk.announcer
 */
import { MusicManager } from "./music.js?v=31";

const SFX_KEY = "pokedunk.muted";
const MUSIC_KEY = "pokedunk.music";
const ANNOUNCER_KEY = "pokedunk.announcer";

function readFlag(key, invert = false) {
  try {
    const v = localStorage.getItem(key);
    const on = invert ? v !== "1" : v !== "0";
    return on;
  } catch {
    return true;
  }
}

class AudioController {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.crowd = null;
    this.noiseBuf = null;
    this.muted = !readFlag(SFX_KEY, true);
    this.music = new MusicManager();
    this.musicWanted = "menu";
    // 解说键兼容：引擎内部读取 pokejam.announcer（比赛内开关也写这个键）
    try {
      const v = localStorage.getItem("pokejam.announcer") ?? localStorage.getItem(ANNOUNCER_KEY);
      if (v != null) {
        localStorage.setItem("pokejam.announcer", v);
        localStorage.setItem(ANNOUNCER_KEY, v);
      }
    } catch {}
    try {
      const m = localStorage.getItem(MUSIC_KEY);
      if (m != null) localStorage.setItem("pokedunk.music", m);
    } catch {}
  }

  get context() { return this.ctx; }
  get output() { return this.master; }
  get musicPlaying() { return this.music.playing; }

  /** 必须在用户手势中调用，创建/恢复 AudioContext */
  unlock() {
    if (this.ctx) {
      try { this.ctx.resume(); } catch {}
      this.music.attach(this.ctx);
      this.music.setTrack(this.musicWanted);
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch { return; }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const rate = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, rate, rate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < rate; i++) data[i] = Math.random() * 2 - 1;
    this.music.attach(this.ctx);
    this.music.setTrack(this.musicWanted);
  }

  setMuted(v) {
    this.muted = !!v;
    try { localStorage.setItem(SFX_KEY, v ? "1" : "0"); } catch {}
    if (this.master) this.master.gain.value = v ? 0 : 0.5;
    if (v) this.stopCrowd();
  }

  setMusicEnabled(v) {
    this.music.setEnabled(!!v);
    try { localStorage.setItem(MUSIC_KEY, v ? "1" : "0"); } catch {}
  }

  /** "menu" | "draft" | null */
  setTrack(name) {
    this.musicWanted = name;
    this.music.setTrack(name);
  }

  startCrowd() {
    if (!this.ctx || !this.master || !this.noiseBuf || this.crowd) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.6;
    this.crowd = this.ctx.createGain();
    this.crowd.gain.value = 0.04;
    src.connect(filter).connect(this.crowd).connect(this.master);
    src.start();
  }

  stopCrowd() {
    try { this.crowd?.disconnect(); } catch {}
    this.crowd = null;
  }

  cheer(amount = 1) {
    if (!this.ctx || !this.crowd) return;
    const t = this.ctx.currentTime;
    this.crowd.gain.cancelScheduledValues(t);
    this.crowd.gain.setValueAtTime(0.04 + 0.16 * amount, t);
    this.crowd.gain.exponentialRampToValueAtTime(0.04, t + 2.2);
  }

  horn(len, gain) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    lp.Q.value = 0.7;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(1e-4, t);
    out.gain.linearRampToValueAtTime(gain, t + 0.04);
    out.gain.setValueAtTime(gain, t + len * 0.55);
    out.gain.exponentialRampToValueAtTime(1e-4, t + len);
    lp.connect(out).connect(this.master);
    for (const [freq, level] of [[196, 1], [233, 0.7]]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      g.gain.value = level * 0.5;
      osc.connect(g).connect(lp);
      osc.start(t);
      osc.stop(t + len + 0.05);
    }
  }

  tone(type, from, to, dur, gain, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, gain, freq, type = "highpass", delay = 0) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case "dribble": this.tone("sine", 140, 60, 0.07, 0.25); break;
      case "bounce": this.tone("sine", 120, 50, 0.08, 0.2); break;
      case "swish": this.noise(0.28, 0.35, 3000); this.cheer(0.8); break;
      case "rim": this.tone("square", 330, 300, 0.12, 0.12); this.tone("square", 495, 440, 0.1, 0.08); break;
      case "dunk": this.tone("sine", 110, 40, 0.35, 0.6); this.noise(0.3, 0.4, 400, "lowpass"); this.tone("square", 260, 240, 0.15, 0.1, 0.02); this.cheer(1.4); break;
      case "buzzer": this.horn(0.85, 0.16); break;
      case "shotclock": this.horn(0.45, 0.09); break;
      case "whistle": this.tone("sine", 2600, 2500, 0.22, 0.12); this.tone("sine", 2650, 2550, 0.22, 0.08, 0.25); break;
      case "block": this.tone("square", 180, 70, 0.18, 0.2); this.noise(0.12, 0.2, 800, "lowpass"); this.cheer(1); break;
      case "steal": this.tone("square", 600, 1200, 0.1, 0.12); this.tone("square", 900, 1800, 0.1, 0.1, 0.08); this.cheer(0.6); break;
      case "shove": this.noise(0.15, 0.35, 300, "lowpass"); this.tone("triangle", 200, 60, 0.18, 0.3); break;
      case "pass": this.noise(0.08, 0.12, 1500, "bandpass"); break;
      case "catch": this.tone("sine", 220, 120, 0.05, 0.15); break;
      case "shot": this.noise(0.1, 0.1, 2000, "bandpass"); break;
      case "fire":
        [523, 659, 784, 1047].forEach((f, i) => this.tone("square", f, f, 0.12, 0.1, i * 0.08));
        this.noise(0.8, 0.2, 600, "lowpass"); this.cheer(1.5);
        break;
      case "coin":
        [988, 1319, 1760].forEach((f, i) => this.tone("triangle", f, f, 0.09, 0.12, i * 0.055));
        this.tone("sine", 2637, 2637, 0.16, 0.06, 0.16);
        break;
      case "special": {
        // 必杀专用音效：能量蓄力 → 重击命中 → 高频尾音，配合 2 秒特写
        this.tone("triangle", 180, 760, 0.34, 0.16);
        this.tone("sine", 92, 360, 0.4, 0.12);
        this.noise(0.34, 0.16, 1200, "bandpass");
        this.tone("sine", 130, 38, 0.5, 0.55, 0.3);
        this.noise(0.38, 0.42, 420, "lowpass", 0.3);
        this.tone("square", 880, 880, 0.12, 0.09, 0.3);
        this.tone("triangle", 1320, 1320, 0.18, 0.07, 0.38);
        [523, 659, 784, 1047].forEach((f, i) => this.tone("square", f, f * 1.01, 0.1, 0.08, 0.48 + i * 0.06));
        this.cheer(1.6);
        break;
      }
    }
  }

  blip(strong = false) {
    this.tone("square", strong ? 880 : 660, strong ? 880 : 660, 0.06, 0.08);
  }

  start() {}
  setOn(v) { this.setMuted(!v); }
  stop() { this.stopCrowd(); }
}

export const gameAudio = new AudioController();

/** 首次用户手势统一解锁音频 + 启动菜单音乐 */
export function installAudioUnlock() {
  const unlock = () => gameAudio.unlock();
  for (const ev of ["pointerdown", "touchend", "click", "keydown"]) {
    window.addEventListener(ev, unlock, { passive: true });
  }
  // 所有普通按钮统一点击音效（比赛触屏操作有自己的音效，不重复叠加）
  window.addEventListener("click", (e) => {
    const target = e.target;
    const btn = target && target.closest ? target.closest("button") : null;
    if (!btn || btn.disabled) return;
    if (btn.closest(".game .touch") || btn.classList.contains("tb")) return;
    if (btn.dataset.clickSound === "off") return;
    if (!gameAudio.context) gameAudio.unlock();
    gameAudio.blip(false);
  }, true);
  gameAudio.setTrack("menu");
}

export { ANNOUNCER_KEY, MUSIC_KEY, SFX_KEY };
