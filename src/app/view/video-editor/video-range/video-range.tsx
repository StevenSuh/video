import {cn} from "@/lib/utils";
import classes from "./video-range.module.css";
import {Plus} from "lucide-react";
import {getTotalDuration, useVideos} from "../../video/store";
import {AddVideoButton} from "../../video/add-video-button";
import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export function VideoRange() {
  const {currentTime, videos, playing, pause, addCurrentTime} = useVideos();

  const totalDuration = useMemo(() => getTotalDuration(videos), [videos]);

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

  const resetAnimation = useCallback(() => {
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
    resetAnimation();
  }, [currentTime, getStartRange, playing, resetAnimation, totalDuration]);

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
      resetAnimation();
    },
    [pause, resetAnimation],
  );

  return (
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
  );
}
