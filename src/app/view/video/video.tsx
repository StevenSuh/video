"use client";

import {cn} from "@/lib/utils";
import classes from "./video.module.css";
import {Upload} from "lucide-react";
import {useVideos} from "./store";
import {AddVideoButton} from "./add-video-button";

export function Video() {
  const {videos} = useVideos();
  return (
    <div className={cn(classes.root, "h-full w-full")}>
      {videos.length ? (
        <>
          <video className="h-full max-h-full m-auto bg-black rounded-xl" src={videos[0].url} controls={false} />
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
