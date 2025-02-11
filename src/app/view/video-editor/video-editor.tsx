"use client";

import {cn, formatTimestamp, setAccurateIntervalInSecs} from "@/lib/utils";
import classes from "./video-editor.module.css";
import {Button} from "@/components/ui/button";
import {Headphones, InspectionPanel, Pause, Play} from "lucide-react";
import {getTotalDuration, useVideos} from "../video/store";
import {useEffect, useMemo, useState} from "react";
import {VideoRange} from "./video-range/video-range";

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

      <VideoRange />

      <div className="flex justify-between">
        <Button variant="ghost">Cancel</Button>
        <Button variant="default">Save</Button>
      </div>
    </div>
  );
}
