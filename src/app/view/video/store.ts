import {create} from "zustand";
import {immer} from "zustand/middleware/immer";

interface VideoStore {
  videos: {name: string; url: string}[];
  addVideos: (videos: VideoStore["videos"]) => void;

  playing: boolean;
  play: () => void;
  pause: () => void;
}

export const useVideos = create<VideoStore>()(
  immer(set => ({
    videos: [],
    addVideos: (videos: VideoStore["videos"]) => set(state => ({videos: state.videos.concat(videos)})),

    playing: false,
    play: () => set(() => ({playing: true})),
    pause: () => set(() => ({playing: false})),
  })),
);
