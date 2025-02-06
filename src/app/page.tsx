import {cn} from "@/lib/utils";
import classes from "./page.module.css";
import {ThemeToggle} from "./components/theme/toggle";
import {Headphones, InspectionPanel, Play, Plus} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Video} from "./view/video/video";

export default function Home() {
  return (
    <div className={cn(classes.root, "p-4 h-full")}>
      <div className="absolute top-2 right-2">
        <ThemeToggle />
      </div>

      <div className={cn(classes.videoContainer, "flex relative")}>
        <Video />
      </div>

      <div className={cn(classes.videoEditorContainer, "pt-5 flex flex-col justify-between")}>
        <div className="flex items-center">
          <Button className="size-9 rounded-full mr-2" variant="ghost">
            <InspectionPanel size={20} />
          </Button>
          <Button className="size-9 rounded-full" variant="ghost">
            <Headphones size={20} />
          </Button>
          <Button className="absolute left-1/2 -translate-x-1/2 size-9 rounded-full" variant="ghost">
            <Play size={20} />
          </Button>
          <span className="ml-auto">0:00 / 0:05</span>
        </div>

        <div className="flex items-center">
          <Button className="absolute size-12" variant="default" size="icon">
            <Plus size={32} />
          </Button>
          <div className="flex justify-center mx-auto">
            <div>Video 1</div>
            <div>Video 2</div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="ghost">Cancel</Button>
          <Button variant="default">Save</Button>
        </div>
      </div>
    </div>
  );
}
