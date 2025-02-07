import {cn} from "@/lib/utils";
import classes from "./page.module.css";
import {ThemeToggle} from "./components/theme/toggle";
import {VideoPlayer} from "./view/video/video";
import {VideoEditor} from "./view/video-editor/video-editor";

export default function Home() {
  return (
    <div className={cn("p-4 h-full")}>
      <div className="absolute top-2 right-2">
        <ThemeToggle />
      </div>

      <div className={cn(classes.videoContainer, "flex relative")}>
        <VideoPlayer />
      </div>

      <VideoEditor />
    </div>
  );
}
