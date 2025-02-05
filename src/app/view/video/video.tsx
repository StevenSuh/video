import {cn} from "@/lib/utils";
import classes from "./video.module.css";

export function Video() {
  return (
    <div className={cn(classes.root, "h-full w-full")}>
      <video className="h-full max-h-full m-auto rounded-xl" src="/test.mp4" controls={false} />
      <div className={cn(classes.videoBgContainer)}>
        <div className={cn(classes.videoBg)} />
      </div>
    </div>
  );
}
