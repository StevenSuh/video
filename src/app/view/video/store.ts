import {create} from "zustand";
import {immer} from "zustand/middleware/immer";

interface VideoDurationLoaded {
  loaded: true;
  duration: number;
  start: number;
  end: number;
}

type VideoDuration = VideoDurationLoaded | {loaded: false};

export type Video = {
  name: string;
  url: string;
} & VideoDuration;

type VideoLoaded = Video & VideoDurationLoaded;

export function assertVideoLoaded(video: Video): asserts video is VideoLoaded {
  if (!video.loaded) {
    throw new Error(`Video (${video.name}) is not loaded`);
  }
}

interface VideoStore {
  videos: Video[];
  addVideos: (videos: VideoStore["videos"]) => void;
  setVideoDuration: (videoUrl: Video["url"], videoDuration: VideoDurationLoaded["duration"]) => void;

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
    setVideoDuration: (videoUrl, videoDuration) =>
      set(state => {
        const video = state.videos.find(v => v.url === videoUrl);
        if (!video) {
          return;
        }
        Object.assign(video, {loaded: true, duration: videoDuration, start: 0, end: videoDuration});
      }),

    currentTime: 0,
    playing: false,
    play: () => set(() => ({playing: true})),
    pause: () => set(() => ({playing: false})),
    togglePlay: () => set(state => ({playing: !state.playing})),
  })),
);
