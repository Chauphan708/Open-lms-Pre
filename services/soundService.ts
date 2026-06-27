const SOUNDS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav',
  incorrect: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav',
  victory: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav',
  defeat: 'https://assets.mixkit.co/active_storage/sfx/2503/2503-84.wav'
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
    const audio = new Audio(SOUNDS[type]);
    audio.volume = 0.4;
    audio.play().catch(err => {
      console.warn("Failed to play audio (likely browser user interaction restriction):", err);
    });
  } catch (e) {
    console.error("Audio playback error:", e);
  }
};
