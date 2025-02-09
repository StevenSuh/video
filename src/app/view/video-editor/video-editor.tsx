"use client";

import {cn, formatTimestamp, setAccurateIntervalInSecs} from "@/lib/utils";
import classes from "./video-editor.module.css";
import {Button} from "@/components/ui/button";
import {Headphones, InspectionPanel, Pause, Play, Plus} from "lucide-react";
import {getTotalDuration, useVideos} from "../video/store";
import {AddVideoButton} from "../video/add-video-button";
import {CSSProperties, useCallback, useEffect, useMemo, useRef, useState} from "react";

export function VideoEditor() {
  const {currentTime, videos, playing, togglePlay} = useVideos();
  const PlayPause = playing ? Pause : Play;

  const totalDuration = useMemo(() => getTotalDuration(videos), [videos]);
  const totalDurationStr = useMemo(() => formatTimestamp(totalDuration), [totalDuration]);

  const [currentDuration, setCurrentDuration] = useState(currentTime);
  const currentDurationStr = useMemo(
    () => formatTimestamp(currentDuration, totalDurationStr),
    [currentDuration, totalDurationStr],
  );

  // reset `currentDuration` when `currentTime` is updated
  useEffect(() => {
    setCurrentDuration(currentTime);
  }, [currentTime]);

  // to simulate current duration going up by 1 sec when video is playing
  useEffect(() => {
    if (!playing) {
      return;
    }
    return setAccurateIntervalInSecs(
      () => setCurrentDuration(prevDuration => prevDuration + 1),
      1,
      1 - (currentTime % 1), // less than 1 sec in case current time is a decimal
    );
  }, [currentTime, playing]);

  const projectRangeContainerRef = useRef<HTMLDivElement>(null);
  const projectRangeWidth = projectRangeContainerRef.current?.clientWidth ?? 0;

  const [zoomRange, setZoomRange] = useState(0); // in seconds
  useEffect(() => {
    if (!videos.length) {
      return;
    }
    setZoomRange(Math.min(60 * 10, Math.max(10, totalDuration)));
  }, [totalDuration, videos.length]);
  const zoomRangeRatio = !zoomRange ? 0 : totalDuration / zoomRange;

  const getStartRange = useCallback(() => {
    const currentTimeRatio = !totalDuration ? 0 : currentTime / totalDuration;
    return zoomRangeRatio * currentTimeRatio * projectRangeWidth - (zoomRangeRatio * projectRangeWidth) / 2;
  }, [currentTime, projectRangeWidth, totalDuration, zoomRangeRatio]);

  const [startRange, setStartRange] = useState(getStartRange);
  // update starting point whenever new videos are added
  useEffect(() => {
    setStartRange(getStartRange());
    // can't have `currentTime` update + invoke this as it will make the animation janky
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalDuration]);

  const endRange = useMemo(() => (zoomRangeRatio * projectRangeWidth) / 2, [projectRangeWidth, zoomRangeRatio]);

  const [rangeAnimationDuration, setRangeAnimationDuration] = useState(totalDuration);
  useEffect(() => {
    setRangeAnimationDuration(totalDuration);
  }, [totalDuration]);

  const videoRangeContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // reset animation only when replaying the project
    if (!playing || !videoRangeContainerRef.current || currentTime !== 0) {
      return;
    }
    // trick to re-trigger animation by causing reflow
    videoRangeContainerRef.current.style.animation = "none";
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    videoRangeContainerRef.current.offsetWidth;
    videoRangeContainerRef.current.style.animation = "";

    // need to resupply these fields when causing reflow
    videoRangeContainerRef.current.style.animationDuration = `${rangeAnimationDuration}s`;
    videoRangeContainerRef.current.style.animationPlayState = "running";
  }, [currentTime, playing, rangeAnimationDuration]);

  return (
    <div className={cn(classes.videoEditorContainer, "pt-5 flex flex-col justify-between")}>
      <div className="flex items-center">
        <Button className="size-9 rounded-full mr-2" variant="ghost">
          <InspectionPanel size={20} />
        </Button>
        <Button className="size-9 rounded-full" variant="ghost">
          <Headphones size={20} />
        </Button>
        <Button className="absolute left-1/2 -translate-x-1/2 size-9 rounded-full" variant="ghost" onClick={togglePlay}>
          <PlayPause size={20} />
        </Button>
        <span className="ml-auto">
          {currentDurationStr} / {totalDurationStr}
        </span>
      </div>

      <div className="relative flex items-center" ref={projectRangeContainerRef}>
        <AddVideoButton
          className="absolute size-12 z-10 shadow-sm border border-border/50"
          variant="default"
          size="icon"
        >
          <Plus size={32} />
        </AddVideoButton>

        <div className="relative w-full flex justify-center overflow-hidden">
          <div
            className={cn(classes.videoRangeContainer, "relative flex")}
            ref={videoRangeContainerRef}
            style={
              {
                animationDuration: `${rangeAnimationDuration}s`,
                animationPlayState: playing ? "running" : "paused",
                "--start-range": `${-startRange}px`,
                "--end-range": `${-endRange}px`,
              } as CSSProperties
            }
          >
            {videos.map(v => {
              const currentVideoRatio = !totalDuration ? 0 : (v.loaded ? v.end - v.start : 0) / totalDuration;
              const width = zoomRangeRatio * currentVideoRatio * projectRangeWidth - 4; // margin
              return (
                <div className="rounded-md overflow-hidden mx-0.5" key={v.url} style={{width}}>
                  <video className="h-16 w-full object-cover" preload="metadata" controls={false}>
                    <source src={`${v.url}#t=0`} />
                  </video>
                </div>
              );
            })}
          </div>
        </div>

        {videos.length ? (
          <div
            className={cn(
              classes.cursor,
              "absolute w-1.5 bg-foreground rounded-full",
              "left-1/2 -translate-x-1/2",
              "cursor-pointer",
            )}
          />
        ) : null}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost">Cancel</Button>
        <Button variant="default">Save</Button>
      </div>
    </div>
  );
}
