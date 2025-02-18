import {clsx, type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function setAccurateIntervalInSecs(callback: () => void, interval = 1, initialInterval = interval): () => void {
  let prevTime = Date.now();
  let timeoutId: ReturnType<typeof setTimeout>;
  let isInitial = true;

  function timeout() {
    const nowTime = Date.now();
    const timeDiff = isInitial ? 0 : nowTime - prevTime - interval * 1000;

    timeoutId = setTimeout(timeout, interval * 1000 - timeDiff);

    isInitial = false;
    prevTime = nowTime;

    callback();
  }

  timeoutId = setTimeout(timeout, initialInterval * 1000);

  return () => clearTimeout(timeoutId);
}

function addZeroIfNeeded(n: number): string {
  const str = n.toString();
  return str.length < 2 ? `0${str}` : str;
}

export function formatTimestamp(time: number, baseTime?: string, trim = true): string {
  const hours = Math.floor(time / (60 * 60));
  const minutes = Math.floor((time % (60 * 60)) / 60);
  const seconds = trim ? Math.floor(time % 60) : time % 60;

  const baseTimeHasHours = (baseTime ?? "").length > 5;
  return `${hours || baseTimeHasHours ? `${addZeroIfNeeded(hours)}:` : ""}${addZeroIfNeeded(minutes)}:${addZeroIfNeeded(
    seconds,
  )}`;
}

export function assertValue<T>(value: T | null | undefined): asserts value is T {
  if (typeof value === "undefined" || value === null) {
    throw new Error(`Value (${value}) is undefined or null`);
  }
}

export function assertSwitchCase(value: never): never {
  throw new Error(`Unhandled switch case: ${value}`);
}

export function logIfDev(...messages: unknown[]) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  console.log(...messages);
}
