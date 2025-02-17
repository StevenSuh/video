import {assertVideoLoaded, Video, VideoMetadata} from "@/app/view/video/store";
import {FFmpeg} from "@ffmpeg/ffmpeg";
import {fetchFile} from "@ffmpeg/util";

// ffmpeg
// https://github.com/ffmpegwasm/ffmpeg.wasm/issues/530#issuecomment-2191708567
const threads = ["-threads", "4"];

export const ffmpegInputTs = ["-f", "mpegts"];

// chatgpt this shit
export const ffmpegInputPresets = [
  ...["-c:v", "libx264"],
  ...["-crf", "23"],
  ...["-preset", "veryfast"],
  ...["-c:a", "aac"],
  ...ffmpegInputTs,
  ...threads,
];
export const ffmpegOutputPresets = [...["-c", "copy"], ...["-muxdelay", "0"], ...["-muxpreload", "0"], ...threads];

export async function getVideoMetadatas(ffmpeg: FFmpeg, videos: Video[]) {
  // get metadata so we can choose whether to re-encode or not
  const videoMetadatasByUrl: {[url: string]: VideoMetadata} = {};
  const targetVideoMetadata: VideoMetadata = {audioSamplingFrequency: 0, frameRate: 0};

  await Promise.all(
    videos.map(async (video, i) => {
      assertVideoLoaded(video);
      const fileName = `input-${i}`;
      await ffmpeg.writeFile(fileName, await fetchFile(video.url));

      const frameRate = await getVideoFrameRate(ffmpeg, fileName);
      const audioSamplingFrequency = await getAudioSamplingFrequency(ffmpeg, fileName);

      videoMetadatasByUrl[video.url] = {
        frameRate,
        audioSamplingFrequency,
      };

      const videoMetadata = videoMetadatasByUrl[video.url];
      Object.keys(targetVideoMetadata).forEach(key => {
        const typedKey = key as keyof VideoMetadata;
        targetVideoMetadata[typedKey] = Math.max(targetVideoMetadata[typedKey], videoMetadata[typedKey]);
      });
    }),
  );

  return {videoMetadatasByUrl, targetVideoMetadata};
}

export async function processInputVideo({
  ffmpeg,
  video,
  fileName,
  videoMetadata,
  targetVideoMetadata,
  width,
  height,
}: {
  ffmpeg: FFmpeg;
  video: Video;
  fileName: string;
  videoMetadata: VideoMetadata;
  targetVideoMetadata: Awaited<ReturnType<typeof getVideoMetadatas>>["targetVideoMetadata"];
  width: number;
  height: number;
}) {
  assertVideoLoaded(video);

  const shouldReencode =
    Object.keys(targetVideoMetadata).some(key => {
      const typedKey = key as keyof VideoMetadata;
      return targetVideoMetadata[typedKey] !== videoMetadata[typedKey];
    }) ||
    video.actualWidth !== width ||
    video.actualHeight !== height;

  if (!shouldReencode) {
    await ffmpeg.exec([
      ...["-ss", `${video.start}`],
      ...["-to", `${video.end}`],
      ...["-i", fileName],
      ...["-c", "copy"],
      ...ffmpegInputTs,
      fileName + ".ts",
    ]);
    return;
  }

  // chatgpt this shit
  await ffmpeg.exec([
    ...["-ss", `${video.start}`],
    ...["-to", `${video.end}`],
    ...["-i", fileName],
    ...[
      "-vf",
      [
        `scale=${width}:${height}:force_original_aspect_ratio=1`,
        `pad=${width}:${height}:-1:-1:black`,
        `fps=${targetVideoMetadata.frameRate}`,
      ].join(","),
    ],
    ...ffmpegInputPresets,
    ...["-ar", "48000"],
    fileName + ".ts",
  ]);

  await ffmpeg.deleteFile(fileName);
}

// ffprobe
const ffprobeOutput = "ffprobe.txt";
const commonFfprobeFlags = [
  ...["-v", "error"],
  ...["-of", "default=noprint_wrappers=1:nokey=1"],
  ...["-o", ffprobeOutput],
];

const ffprobeVideo = [...["-select_streams", "v"], ...["-show_entries", "stream=r_frame_rate"], ...commonFfprobeFlags];

const ffprobeAudio = [...["-select_streams", "a"], ...["-show_entries", "stream=sample_rate"], ...commonFfprobeFlags];

function getFfprobeVideoArgs(input: string): string[] {
  return [...["-i", input], ...ffprobeVideo];
}

function getFfprobeAudioArgs(input: string): string[] {
  return [...["-i", input], ...ffprobeAudio];
}

export async function getVideoFrameRate(ffmpeg: FFmpeg, input: string): Promise<number> {
  await ffmpeg.ffprobe(getFfprobeVideoArgs(input));
  const data = (await ffmpeg.readFile(ffprobeOutput)) as Uint8Array;
  const dataStr = new TextDecoder().decode(data);
  const [str1, str2] = dataStr.split("/");
  return Math.round(parseInt(str1, 10) / parseInt(str2, 10));
}

export async function getAudioSamplingFrequency(ffmpeg: FFmpeg, input: string): Promise<number> {
  await ffmpeg.ffprobe(getFfprobeAudioArgs(input));
  const data = (await ffmpeg.readFile(ffprobeOutput)) as Uint8Array;
  const dataStr = new TextDecoder().decode(data);
  return parseInt(dataStr, 10);
}
