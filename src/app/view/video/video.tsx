"use client";

import {cn} from "@/lib/utils";
import classes from "./video.module.css";
import {Upload} from "lucide-react";
import {assertVideoLoaded, useVideos, Video} from "./store";
import {AddVideoButton} from "./add-video-button";
import {createRef, RefObject, useCallback, useEffect, useMemo, useState} from "react";

type VideoRefs = {[videoUrl: string]: RefObject<HTMLVideoElement>};

export function VideoPlayer() {
  const {currentTime, videos, playing, pause, setVideoDuration} = useVideos();
  const [videoRefs, setVideoRefs] = useState<VideoRefs>({});

  // calculates which video to show
  const currVideoIdx = useMemo(() => {
    let accumTime = 0;
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      assertVideoLoaded(video);
      accumTime += video.end - video.start;

      if (accumTime >= currentTime) {
        return i;
      }
    }
    return videos.length;
  }, [currentTime, videos]);

  // mapping video elements to refs map
  useEffect(() => {
    setVideoRefs(currRefs =>
      videos.reduce((accum, v) => {
        accum[v.url] = currRefs[v.url] ?? createRef();
        return accum;
      }, {} as VideoRefs),
    );
  }, [videos]);

  // playing/pausing the correct video at current time
  useEffect(() => {
    const video = videoRefs[videos[currVideoIdx]?.url]?.current;
    if (playing) {
      video?.play();
    } else {
      video?.pause();
    }
  }, [currVideoIdx, playing, videoRefs, videos]);

  const createOnVideoLoadedMetadata = useCallback(
    (videoUrl: Video["url"]) => () => {
      setVideoDuration(videoUrl, videoRefs[videoUrl].current.duration);
    },
    [setVideoDuration, videoRefs],
  );

  return (
    <div className={cn(classes.root, "h-full w-full")}>
      {videos.length ? (
        <>
          {videos.map((v, i) => (
            <video
              className={cn("h-full max-h-full m-auto bg-black rounded-xl", {hidden: i !== currVideoIdx})}
              key={`${v.url}${v.loaded ? "#t=8,10" : ""}`}
              ref={videoRefs[v.url]}
              controls={false}
              onPause={pause}
              onLoadedMetadata={createOnVideoLoadedMetadata(v.url)}
            >
              {/* Media Fragment URI - https://stackoverflow.com/a/16992434 */}
              <source src={`${v.url}${v.loaded ? "#t=8,10" : ""}`} />
            </video>
          ))}
          <div className={cn(classes.videoBgContainer)}>
            <div className={cn(classes.videoBg)} />
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center">
          <AddVideoButton className="relative rounded-full text-base h-[52px] px-6">
            <div className="flex items-center gap-3">
              <Upload size={20} /> Add a video
            </div>
            <div className={cn(classes.addVideoBgContainer)}>
              <div className={cn(classes.addVideoBg)} />
            </div>
          </AddVideoButton>
        </div>
      )}
    </div>
  );
}
