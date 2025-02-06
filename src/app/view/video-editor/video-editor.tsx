"use client";

import {cn} from "@/lib/utils";
import classes from "./video-editor.module.css";
import {Button} from "@/components/ui/button";
import {Headphones, InspectionPanel, Pause, Play, Plus} from "lucide-react";
import {useVideos} from "../video/store";
import {AddVideoButton} from "../video/add-video-button";

export function VideoEditor() {
  const {videos, playing, togglePlay} = useVideos();
  const PlayPause = playing ? Pause : Play;

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
        <span className="ml-auto">0:00 / 0:05</span>
      </div>

      <div className="flex items-center">
        <AddVideoButton className="absolute size-12" variant="default" size="icon">
          <Plus size={32} />
        </AddVideoButton>
        <div className="flex justify-center mx-auto gap-1">
          {videos.map(v => (
            <div key={v.url}>
              <video className="h-16 w-16 rounded-md object-cover" preload="metadata" src={v.url} controls={false} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost">Cancel</Button>
        <Button variant="default">Save</Button>
      </div>
    </div>
  );
}
