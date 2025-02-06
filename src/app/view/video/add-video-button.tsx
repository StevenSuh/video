import {Button, ButtonProps} from "@/components/ui/button";
import * as Slot from "@radix-ui/react-slot";
import {ChangeEvent, useCallback, useRef} from "react";
import {useVideos} from "./store";

export function AddVideoButton({asChild, ...props}: ButtonProps) {
  const {addVideos} = useVideos();
  const addVideosInputRef = useRef<HTMLInputElement>(null);

  const onClickAddVideos = useCallback(() => {
    addVideosInputRef.current?.click();
  }, []);

  const onAddVideos = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const videos = Array.from(event.target.files ?? []);
      if (!videos.length) {
        return;
      }
      addVideos(videos.map(v => ({name: v.name, url: URL.createObjectURL(v), loaded: false})));
    },
    [addVideos],
  );

  const Comp = asChild ? Slot.Root : Button;
  return (
    <>
      <input
        className="hidden"
        id="video-upload"
        type="file"
        accept="video/*"
        multiple
        onChange={onAddVideos}
        ref={addVideosInputRef}
      />
      <Comp onClick={onClickAddVideos} {...props} />
    </>
  );
}
