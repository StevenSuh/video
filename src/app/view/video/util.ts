import {Video} from "./store";

export function getTotalDuration(videos: Video[]): number {
  return videos.reduce((accum, v) => {
    return accum + (v.loaded ? v.end - v.start : 0);
  }, 0);
}

export function getCurrentVideoIdx(currentTime: number, videos: Video[]): number {
  let accumTime = 0;
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    // this means video was just added and player is at 0
    if (!video.loaded) {
      return i;
    }

    accumTime += video.end - video.start;
    if (accumTime > currentTime) {
      return i;
    }
  }
  return videos.length - 1;
}
