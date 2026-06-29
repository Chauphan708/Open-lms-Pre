const SOUNDS = {
  correct: 'correct',
  incorrect: 'incorrect',
  victory: 'victory',
  defeat: 'defeat'
};

export const isSoundEnabled = (): boolean => {
  const stored = localStorage.getItem('arena_sound_enabled');
  return stored !== 'false'; // defaults to true
};

export const setSoundEnabled = (enabled: boolean) => {
  localStorage.setItem('arena_sound_enabled', String(enabled));
};

export const playArenaSound = (type: keyof typeof SOUNDS) => {
  if (!isSoundEnabled()) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'correct') {
      // Sweet double-tone retro chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(783.99, now + 0.08); // G5
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'incorrect') {
      // Short buzzer sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.2);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'victory') {
      // Triumphant arpeggio
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.03);
      gain.gain.setValueAtTime(0.3, now + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.75);
    } else if (type === 'defeat') {
      // Descending sad slide
      osc.type = 'sine';
      osc.frequency.setValueAtTime(293.66, now); // D4
      osc.frequency.linearRampToValueAtTime(146.83, now + 0.45); // D3
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (e) {
    console.error("Audio playback error:", e);
  }
};
