import {create} from "zustand";
import {immer} from "zustand/middleware/immer";

interface VideoDurationLoaded {
  loaded: true;
  duration: number;
}

type VideoDuration = VideoDurationLoaded | {loaded: false};

type Video = {
  name: string;
  url: string;
} & VideoDuration;

interface VideoStore {
  videos: Video[];
  addVideos: (videos: VideoStore["videos"]) => void;
  setVideoDurations: (videoDurationsByUrl: {[url: Video["url"]]: VideoDurationLoaded}) => void;

  currentTime: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
}

export const useVideos = create<VideoStore>()(
  immer(set => ({
    videos: [],
    addVideos: (videos: VideoStore["videos"]) => set(state => ({videos: state.videos.concat(videos)})),
    setVideoDurations: videoDurationsByUrl =>
      set(state => {
        state.videos.forEach(video => {
          const videoDuration = videoDurationsByUrl[video.url];
          if (!videoDuration) {
            return;
          }
          Object.assign(video, videoDuration);
        });
      }),

    currentTime: 0,
    playing: false,
    play: () => set(() => ({playing: true})),
    pause: () => set(() => ({playing: false})),
    togglePlay: () => set(state => ({playing: !state.playing})),
  })),
);
