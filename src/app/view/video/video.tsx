"use client";

import {cn} from "@/lib/utils";
import classes from "./video.module.css";
import {Upload} from "lucide-react";
import {useVideos, Video} from "./store";
import {AddVideoButton} from "./add-video-button";
import {createRef, RefObject, useCallback, useEffect, useState} from "react";

type VideoRefs = {[videoUrl: string]: RefObject<HTMLVideoElement>};

export function VideoPlayer() {
  const {videos, playing, pause, setVideoDurations} = useVideos();
  const [videoRefs, setVideoRefs] = useState<VideoRefs>({});

  useEffect(() => {
    setVideoRefs(currRefs =>
      videos.reduce((accum, v) => {
        accum[v.url] = currRefs[v.url] ?? createRef();
        return accum;
      }, {} as VideoRefs),
    );
  }, [videos]);

  useEffect(() => {
    // TODO: figure out how to play videos in a row
    const video = videoRefs[videos[0]?.url]?.current;
    if (playing) {
      video?.play();
    } else if (!video?.paused) {
      video?.pause();
    }
  }, [playing, videoRefs, videos]);

  const createOnVideoLoadedMetadata = useCallback(
    (videoUrl: Video["url"]) => () => {
      setVideoDurations({[videoUrl]: videoRefs[videoUrl].current.duration});
    },
    [setVideoDurations, videoRefs],
  );

  return (
    <div className={cn(classes.root, "h-full w-full")}>
      {videos.length ? (
        <>
          {videos.map((v, i) => (
            <video
              className={cn("h-full max-h-full m-auto bg-black rounded-xl", {hidden: i !== 0})}
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
