import {create} from "zustand";
import {immer} from "zustand/middleware/immer";
import {getTotalDuration} from "./util";

export interface VideoMetadata {
  videoCodec: string;
  videoFormat: string;
  frameRate: number;

  audioCodec: string;
  audioSamplingFrequency: number;

  rotation: number;
}

interface VideoDurationLoadedInput {
  duration: number;
  actualWidth: number;
  actualHeight: number;
}

type VideoDurationLoaded = VideoDurationLoadedInput & {
  loaded: true;
  start: number;
  end: number;
};

type VideoDuration = VideoDurationLoaded | {loaded: false};

export type Video = {
  name: string;
  url: string;
  size: number;
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
  clearVideos: () => void;
  setVideoLoaded: (videoUrl: Video["url"], videoData: VideoDurationLoadedInput) => void;

  currentTime: number; // in seconds
  setCurrentTime: (time: number) => void;
  addCurrentTime: (time: number) => void;

  playing: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
}

export const useVideos = create<VideoStore>()(
  immer(set => ({
    videos: [],
    addVideos: (videos: VideoStore["videos"]) => set(state => ({videos: state.videos.concat(videos)})),
    clearVideos: () => set(() => ({videos: [], currentTime: 0, playing: false})),
    setVideoLoaded: (videoUrl, videoData) =>
      set(state => {
        const video = state.videos.find(v => v.url === videoUrl);
        if (!video) {
          return;
        }
        Object.assign(video, {
          ...videoData,
          loaded: true,
          start: 0,
          end: videoData.duration,
        });
      }),

    currentTime: 0,
    setCurrentTime: newTime => set(() => ({currentTime: newTime})),
    addCurrentTime: addTime =>
      set(state => {
        const newTime = Math.max(
          Math.min(
            state.currentTime + addTime,
            getTotalDuration(state.videos), // should not exceed max
          ),
          0, // should not go below 0
        );
        if (newTime === state.currentTime) {
          return;
        }
        return {currentTime: newTime};
      }),

    playing: false,
    play: () => set(() => ({playing: true})),
    pause: () => set(() => ({playing: false})),
    togglePlay: () =>
      set(state => {
        if (!state.videos.length) {
          return;
        }
        // user is clicking play when project has reached the end of all videos.
        // rewind to the beginning of very first video
        const totalDuration = getTotalDuration(state.videos);
        if (!state.playing && state.currentTime >= totalDuration) {
          return {playing: true, currentTime: 0};
        }
        return {playing: !state.playing};
      }),
  })),
);
