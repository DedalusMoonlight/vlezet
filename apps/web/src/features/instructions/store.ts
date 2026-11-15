import { create } from "zustand";
import type { PlaybackState } from "./playback";
export const usePlayback = create<{
  playback: PlaybackState | null;
  setPlayback: (p: PlaybackState | null) => void;
}>((set) => ({ playback: null, setPlayback: (playback) => set({ playback }) }));
