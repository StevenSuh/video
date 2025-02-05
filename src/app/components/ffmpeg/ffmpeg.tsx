"use client";

import {FFmpeg} from "@ffmpeg/ffmpeg";
import {toBlobURL} from "@ffmpeg/util";
import {ReactNode, useCallback, useEffect, useState} from "react";
import {create} from "zustand";

interface FfmpegStore {
  ffmpeg: FFmpeg;
}

export const useFfmpeg = create<FfmpegStore>()(() => ({
  ffmpeg: new FFmpeg(),
}));

export default function FfmpegLoader({children}: {children: ReactNode}) {
  const [loaded, setLoaded] = useState(false);
  const ffmpeg = useFfmpeg(state => state.ffmpeg);

  const load = useCallback(async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    setLoaded(true);
  }, [ffmpeg]);

  useEffect(() => {
    // load();
  }, [load]);

  if (!loaded) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
