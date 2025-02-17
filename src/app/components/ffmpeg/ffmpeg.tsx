"use client";

import {FFmpeg} from "@ffmpeg/ffmpeg";
import {toBlobURL} from "@ffmpeg/util";
import {useCallback, useEffect} from "react";
import {create} from "zustand";
import {immer} from "zustand/middleware/immer";

interface FfmpegStore {
  ffmpeg: FFmpeg | null;
  setFfmpeg: (ffmpeg: FFmpeg) => void;
}

export const useFfmpeg = create<FfmpegStore>()(
  immer(set => ({
    ffmpeg: null,
    setFfmpeg: ffmpeg => set(() => ({ffmpeg})),
  })),
);

export function assertFfmpegLoaded(ffmpeg: FfmpegStore["ffmpeg"]): asserts ffmpeg is FFmpeg {
  if (!ffmpeg?.loaded) {
    throw new Error("Ffmpeg is not loaded");
  }
}

export default function FfmpegLoader({
  enableLog,
  enableMultiThreading,
}: {
  enableLog?: boolean;
  enableMultiThreading?: boolean;
}) {
  const {setFfmpeg} = useFfmpeg();

  const load = useCallback(async () => {
    const ffmpeg = new FFmpeg();
    if (enableLog) {
      ffmpeg.on("log", ({message}) => {
        console.log(message);
      });
    }

    const baseURL = enableMultiThreading
      ? "https://unpkg.com/@ffmpeg/core-mt@0.12.9/dist/umd"
      : "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      workerURL: enableMultiThreading
        ? await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript")
        : undefined,
    });
    setFfmpeg(ffmpeg);
  }, [enableLog, enableMultiThreading, setFfmpeg]);

  useEffect(() => {
    load();
  }, [load]);

  return null;
}
