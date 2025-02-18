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
  enableProgress,
  enableMultiThreading,
}: {
  enableLog?: boolean;
  enableProgress?: boolean;
  enableMultiThreading?: boolean;
}) {
  const {ffmpeg, setFfmpeg} = useFfmpeg();

  const load = useCallback(async () => {
    const ffmpeg = new FFmpeg();

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
  }, [enableMultiThreading, setFfmpeg]);

  const logMessages = useCallback(({message}: {message: string}) => {
    console.log(message);
  }, []);

  useEffect(() => {
    if (!ffmpeg) {
      return;
    }
    if (enableLog) {
      ffmpeg.on("log", logMessages);
    } else {
      ffmpeg.off("log", logMessages);
    }
  }, [enableLog, ffmpeg, logMessages]);

  const logProgress = useCallback((...args: unknown[]) => {
    console.log(...args);
  }, []);

  useEffect(() => {
    if (!ffmpeg) {
      return;
    }
    if (enableProgress) {
      ffmpeg.on("progress", logProgress);
    } else {
      ffmpeg.off("progress", logProgress);
    }
  }, [enableProgress, ffmpeg, logProgress]);

  useEffect(() => {
    load();
  }, [load]);

  return null;
}
