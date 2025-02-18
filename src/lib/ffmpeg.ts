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
  const targetVideoMetadata: VideoMetadata = {audioSamplingFrequency: 0, frameRate: 0};

  await Promise.all(
    videos.map(async (video, i) => {
      assertVideoLoaded(video);
      const fileName = getInputFileName(video, i);

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
      const shouldReencode =
        video.actualWidth !== width ||
        video.actualHeight !== height ||
        Object.keys(targetVideoMetadata).some(key => {
          const typedKey = key as keyof VideoMetadata;
          if (targetVideoMetadata[typedKey] !== videoMetadata[typedKey]) {
            reason = `${typedKey} - target (${targetVideoMetadata[typedKey]}) / actual (${videoMetadata[typedKey]})`;
          }
          return targetVideoMetadata[typedKey] !== videoMetadata[typedKey];
        });

      if (video.actualWidth !== width) {
        reason = `width - target (${width}) / actual (${video.actualWidth})`;
      }
      if (video.actualHeight !== height) {
        reason = `height - target (${height}) / actual (${video.actualHeight})`;
      }

      console.log(video.name, shouldReencode, reason);
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
          ...["-ar", `${targetVideoMetadata.audioSamplingFrequency}`],
          fileName + inputFileExtension,
        ]);
      }

      const later = Date.now();
      console.log(`Took ${(later - now) / 1000} seconds`);

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
const commonFfprobeFlags = [...["-of", "default=noprint_wrappers=1:nokey=1"]];

const ffprobeVideo = [...["-select_streams", "v"], ...["-show_entries", "stream=r_frame_rate"], ...commonFfprobeFlags];

const ffprobeAudio = [...["-select_streams", "a"], ...["-show_entries", "stream=sample_rate"], ...commonFfprobeFlags];

function getFfprobeVideoArgs(input: string, output: string): string[] {
  return [...ffprobeVideo, input, "-o", output];
}

function getFfprobeAudioArgs(input: string, output: string): string[] {
  return [...ffprobeAudio, input, "-o", output];
}

export async function getVideoFrameRate(ffmpeg: FFmpeg, input: string): Promise<number> {
  const outputTxt = `${input}-${ffprobeOutputSuffix}`;

  await ffmpeg.ffprobe(getFfprobeVideoArgs(input, outputTxt));
  const data = (await ffmpeg.readFile(outputTxt)) as Uint8Array;
  const dataStr = new TextDecoder().decode(data);
  const [str1, str2] = dataStr.split("/");

  await ffmpeg.deleteFile(outputTxt);
  return Math.round(parseInt(str1, 10) / parseInt(str2, 10));
}

export async function getAudioSamplingFrequency(ffmpeg: FFmpeg, input: string): Promise<number> {
  const outputTxt = `${input}-${ffprobeOutputSuffix}`;

  await ffmpeg.ffprobe(getFfprobeAudioArgs(input, outputTxt));
  const data = (await ffmpeg.readFile(outputTxt)) as Uint8Array;
  const dataStr = new TextDecoder().decode(data);

  await ffmpeg.deleteFile(outputTxt);
  return parseInt(dataStr, 10);
}
