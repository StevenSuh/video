import {assertVideoLoaded, Video, VideoMetadata} from "@/app/view/video/store";
import {FFmpeg} from "@ffmpeg/ffmpeg";
import {fetchFile} from "@ffmpeg/util";
import {assertSwitchCase, logIfDev} from "./utils";

// ffmpeg
// https://github.com/ffmpegwasm/ffmpeg.wasm/issues/530#issuecomment-2191708567
const threads = ["-threads", "4"];

export const ffmpegInputTs = ["-f", "mpegts"];

// chatgpt this shit
const ffmpegInputPresets = [
  ...(process.env.NODE_ENV === "production" ? ["-v", "quiet"] : []),
  ...["-preset", "veryfast"],
  ...ffmpegInputTs,
  ...threads,
];

const defaultVideoCodec = "h264";
const defaultVideoCodecForEncoding = "libx264";
const defaultVideoFormat = "yuv420p";
const defaultAudioCodec = "aac";

const ffmpegOutputPresets = [...["-c", "copy"], ...threads];

const inputFileExtension = ".ts";
function getInputFileName(_video: Video, index: number): string {
  return `input-${index}`;
}

export async function initializeForProcessing(ffmpeg: FFmpeg, videos: Video[]) {
  await Promise.all(
    videos.map(async (video, i) => {
      const fileName = getInputFileName(video, i);
      await ffmpeg.writeFile(fileName, await fetchFile(video.url));
    }),
  );
}

export async function getVideoMetadatas(ffmpeg: FFmpeg, videos: Video[]) {
  // get metadata so we can choose whether to re-encode or not
  const videoMetadatasByUrl: {[url: string]: VideoMetadata} = {};
  const targetVideoMetadata: VideoMetadata = {
    audioSamplingFrequency: 0,
    frameRate: 0,
    rotation: 0,
    videoCodec: defaultVideoCodec,
    videoFormat: defaultVideoFormat,
    audioCodec: defaultAudioCodec,
  };

  await Promise.all(
    videos.map(async (video, i) => {
      assertVideoLoaded(video);
      const fileName = getInputFileName(video, i);

      const {frameRate, videoCodec, videoFormat} = await getVideoMetadata(ffmpeg, fileName);
      const {audioCodec, audioSamplingFrequency} = await getAudioMetadata(ffmpeg, fileName);
      const rotation = await getVideoRotation(ffmpeg, fileName);

      videoMetadatasByUrl[video.url] = {
        frameRate,
        videoCodec,
        videoFormat,
        audioCodec,
        audioSamplingFrequency,
        rotation,
      };

      const videoMetadata = videoMetadatasByUrl[video.url];
      Object.keys(targetVideoMetadata).forEach(key => {
        const typedKey = key as keyof VideoMetadata;

        switch (typedKey) {
          case "audioCodec":
          case "videoCodec":
          case "videoFormat":
          case "rotation":
            // do nothing
            break;
          case "audioSamplingFrequency":
          case "frameRate":
            targetVideoMetadata[typedKey] = Math.max(targetVideoMetadata[typedKey], videoMetadata[typedKey]);
            break;
          default:
            assertSwitchCase(typedKey);
        }
      });
    }),
  );

  return {videoMetadatasByUrl, targetVideoMetadata};
}

export async function processInputVideos(
  ffmpeg: FFmpeg,
  videos: Video[],
  {videoMetadatasByUrl, targetVideoMetadata}: Awaited<ReturnType<typeof getVideoMetadatas>>,
  {width, height}: {width: number; height: number},
) {
  await Promise.all(
    videos.map(async (video, i) => {
      assertVideoLoaded(video);
      const fileName = getInputFileName(video, i);
      const videoMetadata = videoMetadatasByUrl[video.url];

      let reason = "";

      const isWidthDiff = video.actualWidth !== width;
      if (isWidthDiff) {
        reason = `width - target (${width}) / actual (${video.actualWidth})`;
      }
      const isHeightDiff = video.actualHeight !== height;
      if (isHeightDiff) {
        reason = `height - target (${height}) / actual (${video.actualHeight})`;
      }
      const isMetadataDiff = Object.keys(targetVideoMetadata).some(key => {
        const typedKey = key as keyof VideoMetadata;
        if (targetVideoMetadata[typedKey] !== videoMetadata[typedKey]) {
          reason = `${typedKey} - target (${targetVideoMetadata[typedKey]}) / actual (${videoMetadata[typedKey]})`;
        }
        return targetVideoMetadata[typedKey] !== videoMetadata[typedKey];
      });

      const shouldReencode = isWidthDiff || isHeightDiff || isMetadataDiff;
      logIfDev(video.name, shouldReencode, `[${reason}]`);
      const now = Date.now();

      if (!shouldReencode) {
        await ffmpeg.exec([
          ...["-ss", `${video.start}`],
          ...["-to", `${video.end}`],
          ...["-i", fileName],
          ...["-c", "copy"],
          ...ffmpegInputTs,
          fileName + inputFileExtension,
        ]);
      } else {
        const isFrameRateDiff = videoMetadata.frameRate !== targetVideoMetadata.frameRate;
        const isAudioSamplingFrequencyDiff =
          videoMetadata.audioSamplingFrequency !== targetVideoMetadata.audioSamplingFrequency;

        const videoFilters: string[] = [];
        if (isWidthDiff || isHeightDiff) {
          videoFilters.push(`scale=${width}:${height}:force_original_aspect_ratio=1`);
          videoFilters.push(`pad=${width}:${height}:-1:-1:black`);
        }
        if (isFrameRateDiff) {
          videoFilters.push(`fps=${targetVideoMetadata.frameRate}`);
        }

        const isVideoCodecDiff = videoMetadata.videoCodec !== targetVideoMetadata.videoCodec;
        const isVideoFormatDiff = videoMetadata.videoFormat !== targetVideoMetadata.videoFormat;
        const isAudioCodecDiff = videoMetadata.audioCodec !== targetVideoMetadata.audioCodec;

        const reencodingVideoCodec = isVideoCodecDiff || isVideoFormatDiff || Boolean(videoFilters.length);
        const reencodingAudioCodec = isAudioCodecDiff || isAudioSamplingFrequencyDiff;

        const input = [
          ...["-ss", `${video.start}`],
          ...["-to", `${video.end}`],
          ...["-i", fileName],
          ...(isVideoFormatDiff ? ["-pix_fmt", defaultVideoFormat] : []),
          ...(videoFilters.length ? ["-vf", videoFilters.join(",")] : []),
          ...["-c:v", reencodingVideoCodec ? defaultVideoCodecForEncoding : "copy"],
          ...["-c:a", reencodingAudioCodec ? defaultAudioCodec : "copy"],
          ...(isAudioSamplingFrequencyDiff ? ["-ar", `${targetVideoMetadata.audioSamplingFrequency}`] : []),
          ...ffmpegInputPresets,
          fileName + inputFileExtension,
        ];
        logIfDev(input);

        // chatgpt this shit
        await ffmpeg.exec(input);
      }

      const later = Date.now();
      logIfDev(`Took ${(later - now) / 1000} seconds`);

      await ffmpeg.deleteFile(fileName);
    }),
  );
}

const concatFileTxt = "concat.txt";

export async function generateOutputVideo(ffmpeg: FFmpeg, videos: Video[], outputName: string) {
  const inputs: string[] = [];
  await ffmpeg.writeFile(
    "concat.txt",
    videos.map((v, i) => `file ${getInputFileName(v, i)}${inputFileExtension}`).join("\n"),
  );
  inputs.push("-f", "concat", "-safe", "0", "-i", concatFileTxt);

  inputs.push(...ffmpegOutputPresets);
  inputs.push(outputName);

  logIfDev(inputs);
  await ffmpeg.exec(inputs);
}

export async function cleanupVideos(ffmpeg: FFmpeg, videos: Video[]) {
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    await ffmpeg.deleteFile(`${getInputFileName(video, i)}${inputFileExtension}`);
  }
  await ffmpeg.deleteFile(concatFileTxt);
}

// ffprobe
const ffprobeOutputSuffix = "-ffprobe.txt";
const commonFfprobeFlags = [
  ...(process.env.NODE_ENV === "production" ? ["-v", "quiet"] : []),
  ...["-of", "default=noprint_wrappers=1:nokey=1"],
];

const ffprobeVideo = [
  ...["-select_streams", "v"],
  ...["-show_entries", "stream=r_frame_rate,codec_name,pix_fmt"],
  ...commonFfprobeFlags,
];

function getFfprobeVideoArgs(input: string, output: string): string[] {
  return [...ffprobeVideo, input, "-o", output];
}

export async function getVideoMetadata(
  ffmpeg: FFmpeg,
  input: string,
): Promise<Pick<VideoMetadata, "frameRate" | "videoCodec" | "videoFormat">> {
  const outputTxt = `${input}-${ffprobeOutputSuffix}`;

  await ffmpeg.ffprobe(getFfprobeVideoArgs(input, outputTxt));
  const data = (await ffmpeg.readFile(outputTxt)) as Uint8Array;
  const dataStr = new TextDecoder().decode(data);
  await ffmpeg.deleteFile(outputTxt);

  const strs = dataStr.split("\n");
  const [videoCodec, videoFormat, frameRateStr] = strs;

  const [str1, str2] = frameRateStr.split("/");
  const frameRate = Math.round(parseInt(str1, 10) / parseInt(str2, 10));

  return {videoCodec, videoFormat, frameRate};
}

const ffprobeVideoRotation = [
  ...["-select_streams", "v"],
  ...["-read_intervals", "%+#0"],
  ...["-show_entries", "side_data=rotation"],
  ...commonFfprobeFlags,
];

function getFfprobeVideoRotationArgs(input: string, output: string): string[] {
  return [...ffprobeVideoRotation, input, "-o", output];
}

export async function getVideoRotation(ffmpeg: FFmpeg, input: string): Promise<number> {
  const outputTxt = `${input}-${ffprobeOutputSuffix}`;

  await ffmpeg.ffprobe(getFfprobeVideoRotationArgs(input, outputTxt));
  const data = (await ffmpeg.readFile(outputTxt)) as Uint8Array;
  const dataStr = new TextDecoder().decode(data);

  await ffmpeg.deleteFile(outputTxt);
  return dataStr ? parseInt(dataStr, 10) : 0;
}

const ffprobeAudio = [
  ...["-select_streams", "a"],
  ...["-show_entries", "stream=sample_rate,codec_name"],
  ...commonFfprobeFlags,
];

function getFfprobeAudioArgs(input: string, output: string): string[] {
  return [...ffprobeAudio, input, "-o", output];
}

export async function getAudioMetadata(
  ffmpeg: FFmpeg,
  input: string,
): Promise<Pick<VideoMetadata, "audioCodec" | "audioSamplingFrequency">> {
  const outputTxt = `${input}-${ffprobeOutputSuffix}`;

  await ffmpeg.ffprobe(getFfprobeAudioArgs(input, outputTxt));
  const data = (await ffmpeg.readFile(outputTxt)) as Uint8Array;
  const dataStr = new TextDecoder().decode(data);
  await ffmpeg.deleteFile(outputTxt);

  const strs = dataStr.split("\n");
  const [audioCodec, audioSamplingFrequencyStr] = strs;
  const audioSamplingFrequency = parseInt(audioSamplingFrequencyStr, 10);

  return {audioCodec, audioSamplingFrequency};
}
