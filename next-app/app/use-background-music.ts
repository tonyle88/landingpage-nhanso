"use client";

import { useEffect } from "react";

const MUSIC_PREFERENCE_KEY = "clowcat-background-music-enabled";
const INTERACTION_EVENTS = [
  "pointerdown",
  "touchstart",
  "keydown",
  "scroll",
] as const;

function readMusicPreference() {
  try {
    return window.localStorage.getItem(MUSIC_PREFERENCE_KEY) !== "false";
  } catch {
    return true;
  }
}

function saveMusicPreference(isEnabled: boolean) {
  try {
    window.localStorage.setItem(
      MUSIC_PREFERENCE_KEY,
      isEnabled ? "true" : "false",
    );
  } catch {
    // The music control still works when storage is unavailable.
  }
}

export function useBackgroundMusic() {
  useEffect(() => {
    const backgroundMusic =
      document.querySelector<HTMLAudioElement>("#bg-music");
    const musicToggleButton =
      document.querySelector<HTMLButtonElement>("#musicToggleBtn");

    if (!backgroundMusic || !musicToggleButton) return;

    let shouldPlayMusic = readMusicPreference();
    let isWaitingForInteraction = false;

    const setMusicButtonState = (isPlaying: boolean) => {
      const icon = musicToggleButton.querySelector<HTMLElement>("i");
      if (icon) {
        icon.className = isPlaying
          ? "fa-solid fa-volume-high"
          : "fa-solid fa-volume-xmark";
      }
      musicToggleButton.classList.toggle("playing", isPlaying);
      musicToggleButton.setAttribute(
        "aria-label",
        isPlaying ? "Tắt nhạc" : "Bật nhạc",
      );
      musicToggleButton.setAttribute(
        "aria-pressed",
        isPlaying ? "true" : "false",
      );
    };

    const removeAutoplayListeners = () => {
      INTERACTION_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, handleFirstInteraction);
      });
      isWaitingForInteraction = false;
    };

    const addAutoplayListeners = () => {
      if (isWaitingForInteraction || !shouldPlayMusic) return;
      isWaitingForInteraction = true;
      INTERACTION_EVENTS.forEach((eventName) => {
        document.addEventListener(eventName, handleFirstInteraction, {
          passive: true,
        });
      });
    };

    const tryPlayMusic = async () => {
      if (!shouldPlayMusic) return;
      try {
        await backgroundMusic.play();
        setMusicButtonState(true);
        removeAutoplayListeners();
      } catch {
        setMusicButtonState(false);
        addAutoplayListeners();
      }
    };

    function handleFirstInteraction(event: Event) {
      if (
        event.target instanceof Node &&
        musicToggleButton?.contains(event.target)
      ) {
        return;
      }
      removeAutoplayListeners();
      void tryPlayMusic();
    }

    const handleMusicPlay = () => {
      setMusicButtonState(true);
      removeAutoplayListeners();
    };

    const handleMusicPause = () => {
      setMusicButtonState(false);
    };

    const toggleMusic = () => {
      if (backgroundMusic.paused) {
        shouldPlayMusic = true;
        saveMusicPreference(true);
        void tryPlayMusic();
        return;
      }

      shouldPlayMusic = false;
      saveMusicPreference(false);
      backgroundMusic.pause();
      removeAutoplayListeners();
      setMusicButtonState(false);
    };

    const syncMusicPreference = (event: StorageEvent) => {
      if (event.key !== MUSIC_PREFERENCE_KEY) return;
      shouldPlayMusic = event.newValue !== "false";
      if (shouldPlayMusic) {
        void tryPlayMusic();
      } else {
        backgroundMusic.pause();
        removeAutoplayListeners();
        setMusicButtonState(false);
      }
    };

    backgroundMusic.volume = 0.35;
    backgroundMusic.addEventListener("play", handleMusicPlay);
    backgroundMusic.addEventListener("pause", handleMusicPause);
    musicToggleButton.addEventListener("click", toggleMusic);
    window.addEventListener("storage", syncMusicPreference);

    if (shouldPlayMusic) {
      void tryPlayMusic();
    } else {
      backgroundMusic.pause();
      setMusicButtonState(false);
    }

    return () => {
      backgroundMusic.removeEventListener("play", handleMusicPlay);
      backgroundMusic.removeEventListener("pause", handleMusicPause);
      musicToggleButton.removeEventListener("click", toggleMusic);
      window.removeEventListener("storage", syncMusicPreference);
      removeAutoplayListeners();
    };
  }, []);
}
