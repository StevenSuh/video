"use client";

import {cn, formatTimestamp, setAccurateIntervalInSecs} from "@/lib/utils";
import classes from "./video-editor.module.css";
import {Button} from "@/components/ui/button";
import {Headphones, InspectionPanel, Pause, Play, Plus} from "lucide-react";
import {getTotalDuration, useVideos} from "../video/store";
import {AddVideoButton} from "../video/add-video-button";
import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export function VideoEditor() {
  const {currentTime, videos, playing, togglePlay, pause, addCurrentTime} = useVideos();
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
    let initial = true;
    return setAccurateIntervalInSecs(
      () => {
        const timeDiff = initial ? 1 - (currentTime % 1) : 1;
        setCurrentDuration(prev => prev + timeDiff);
        initial = false;
      },
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

  const zoomRangeToUse = !zoomRange ? 1 : zoomRange;

  const getStartRange = useCallback(
    (time: number) => {
      return (projectRangeWidth / zoomRangeToUse) * time - projectRangeWidth / 2;
    },
    [projectRangeWidth, zoomRangeToUse],
  );

  const [startRange, setStartRange] = useState(getStartRange(currentTime));
  // update starting point whenever new videos are added
  useEffect(() => {
    setStartRange(getStartRange(currentTime));
    // can't have `currentTime` update + invoke this as it will make the animation janky
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStartRange, totalDuration]);

  /**
   * `projectRangeWidth` represents width of range in px
   * `zoomRangeToUse` represents how many seconds `projectRangeWidth` represents
   *   - `projectRangeWidth / zoomRangeToUse` = px per second
   * we subtract `projectRangeWidth / 2` to consider the range cursor is in the middle
   */
  const endRange = useMemo(
    () => (projectRangeWidth / zoomRangeToUse) * totalDuration - projectRangeWidth / 2,
    [projectRangeWidth, totalDuration, zoomRangeToUse],
  );

  const [rangeAnimationDuration, setRangeAnimationDuration] = useState(totalDuration);
  useEffect(() => {
    setRangeAnimationDuration(totalDuration);
  }, [totalDuration]);

  const retriggerAnimation = useCallback(() => {
    if (!videoRangeContainerRef.current) {
      return;
    }
    // trick to re-trigger animation by causing reflow
    videoRangeContainerRef.current.style.animation = "none";
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    videoRangeContainerRef.current.offsetWidth;
    videoRangeContainerRef.current.style.animation = "";

    // need to resupply these fields when causing reflow
    videoRangeContainerRef.current.style.animationDuration = `${rangeAnimationDuration}s`;
    videoRangeContainerRef.current.style.animationPlayState = playing ? "running" : "paused";
  }, [playing, rangeAnimationDuration]);

  const videoRangeContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // reset animation only when replaying the project
    if (!playing || currentTime !== 0) {
      return;
    }
    setRangeAnimationDuration(totalDuration);
    setStartRange(getStartRange(currentTime));
    retriggerAnimation();
  }, [currentTime, getStartRange, playing, retriggerAnimation, totalDuration]);

  const [dragging, setDragging] = useState(false);
  const [initX, setInitX] = useState(0);

  useEffect(() => {
    if (!dragging) {
      return;
    }
    setStartRange(getStartRange(currentTime));
  }, [currentTime, dragging, getStartRange]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
    setRangeAnimationDuration(totalDuration - currentTime);
  }, [currentTime, totalDuration]);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      if (event.pressure === 0) {
        onPointerUp();
        return;
      }

      const currX = event.clientX;
      const diff = -(currX - initX);
      if (Math.abs(diff) < 1) {
        return;
      }

      const newTime = (diff / projectRangeWidth) * zoomRangeToUse;
      addCurrentTime(newTime);
      setInitX(event.clientX);
    },
    [addCurrentTime, dragging, initX, onPointerUp, projectRangeWidth, zoomRangeToUse],
  );

  useEffect(() => {
    if (!dragging) {
      return;
    }
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging, onPointerMove, onPointerUp]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      setDragging(true);
      setInitX(event.clientX);

      pause();
      retriggerAnimation();
    },
    [pause, retriggerAnimation],
  );

  return (
    <div className={cn(classes.videoEditorContainer, "pt-5 flex flex-col justify-center")}>
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

      <div className="relative flex flex-1" ref={projectRangeContainerRef}>
        <AddVideoButton
          className="absolute size-12 z-10 shadow-sm border border-border/50 self-center"
          variant="default"
          size="icon"
        >
          <Plus size={32} />
        </AddVideoButton>

        <div className="relative flex items-center flex-1 overflow-hidden" onPointerDown={onPointerDown}>
          <div className="relative w-full flex overflow-hidden">
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
                const currentVideoDuration = v.loaded ? v.end - v.start : 0;
                const width = (projectRangeWidth / zoomRangeToUse) * currentVideoDuration - 6; // margin
                return (
                  <div className="rounded-md overflow-hidden mx-[3px] cursor-pointer" key={v.url} style={{width}}>
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
                "absolute w-1.5 bg-foreground rounded-full h-20",
                "left-1/2 -translate-x-1/2",
                "cursor-pointer",
              )}
            />
          ) : null}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost">Cancel</Button>
        <Button variant="default">Save</Button>
      </div>
    </div>
  );
}
