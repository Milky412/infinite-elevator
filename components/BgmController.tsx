// スタート画面用MP3 BGMの再生/停止と音量状態を管理する。
'use client';

import { useEffect, useRef } from 'react';

const MENU_VOLUME = 0.58;

type MenuBgmEvent = CustomEvent<{ enabled?: boolean }>;

export default function BgmController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabledRef = useRef(true);

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const audio = new Audio(`${basePath}/start-menu-bgm-v146.mp3`);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = MENU_VOLUME;
    audioRef.current = audio;

    const startBgm = async () => {
      if (!enabledRef.current) return;
      audio.volume = MENU_VOLUME;
      try {
        await audio.play();
      } catch {
        // Browser autoplay restrictions: retry on the next user gesture.
      }
    };

    // Match the always-mounted controller strategy used by the comparison app.
    void startBgm();

    const firstGesture = () => { void startBgm(); };
    const delegatedClick = () => { void startBgm(); };
    const keydown = () => { void startBgm(); };
    const touch = () => { void startBgm(); };
    const onMenuBgm = (event: Event) => {
      const detail = (event as MenuBgmEvent).detail;
      const enabled = detail?.enabled !== false;
      enabledRef.current = enabled;
      if (enabled) {
        void startBgm();
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    };

    window.addEventListener('pointerdown', firstGesture, { once: true });
    window.addEventListener('touchstart', touch, { passive: true });
    window.addEventListener('keydown', keydown);
    document.addEventListener('click', delegatedClick, true);
    window.addEventListener('infinite-elevator-menu-bgm', onMenuBgm as EventListener);

    return () => {
      window.removeEventListener('pointerdown', firstGesture);
      window.removeEventListener('touchstart', touch);
      window.removeEventListener('keydown', keydown);
      document.removeEventListener('click', delegatedClick, true);
      window.removeEventListener('infinite-elevator-menu-bgm', onMenuBgm as EventListener);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  return null;
}
