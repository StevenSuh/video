"use client";

import {cn, formatTimestamp, setAccurateIntervalInSecs} from "@/lib/utils";
import classes from "./video-editor.module.css";
import {Button} from "@/components/ui/button";
import {Headphones, InspectionPanel, LoaderCircle, Pause, Play} from "lucide-react";
import {getTotalDuration, useVideos} from "../video/store";
import {useCallback, useEffect, useMemo, useState} from "react";
import {VideoRange} from "./video-range/video-range";
import {useFfmpeg} from "@/app/components/ffmpeg/ffmpeg";
import {
  cleanupVideos,
  generateOutputVideo,
  getVideoMetadatas,
  initializeForProcessing,
  processInputVideos,
} from "@/lib/ffmpeg";

export function VideoEditor() {
  const {ffmpeg} = useFfmpeg();
  const ffmpegLoaded = ffmpeg?.loaded;
  const [processing, setProcessing] = useState(false);

  const {currentTime, videos, playing, togglePlay, clearVideos} = useVideos();
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

  const onSaveVideos = useCallback(async () => {
    if (!ffmpegLoaded || !videos.length) {
      return;
    }
    const outputName = "output.mp4";

    // TODO: add resolution selects
    const width = 1080;
    const height = 1920;

    const now = Date.now();
    setProcessing(true);

    // cleanup output if there is any
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {}

    await initializeForProcessing(ffmpeg, videos);
    const videoMetadatas = await getVideoMetadatas(ffmpeg, videos);
    await processInputVideos(ffmpeg, videos, videoMetadatas, {width, height});
    await generateOutputVideo(ffmpeg, videos, outputName);
    await cleanupVideos(ffmpeg, videos);

    const later = Date.now();
    console.log(`Took ${(later - now) / 1000} seconds`);
    setProcessing(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await ffmpeg.readFile(outputName)) as any;

    const link = document.createElement("a");
    link.className = "hidden";
    link.href = URL.createObjectURL(new Blob([data.buffer], {type: "video/mp4"}));
    link.download = `output-${Date.now()}.mp4`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [ffmpeg, ffmpegLoaded, videos]);

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
        <Button variant="ghost" onClick={clearVideos}>
          Cancel
        </Button>
        <Button
          disabled={!ffmpegLoaded || processing}
          variant="default"
          onClick={ffmpegLoaded ? onSaveVideos : undefined}
        >
          <span className={cn({"text-transparent": !ffmpegLoaded || processing})}>Save</span>
          <span className={cn("absolute animate-spin", {hidden: ffmpegLoaded && !processing})}>
            <LoaderCircle size={20} />
          </span>
        </Button>
      </div>
    </div>
  );
}
