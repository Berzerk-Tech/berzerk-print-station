import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type DownloadProgress = {
  downloaded: number;
  total: number | null;
};

export type AvailableUpdate = {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
  install: (onProgress?: (p: DownloadProgress) => void) => Promise<void>;
};

export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  const update = await check();
  if (!update) return null;
  return {
    version: update.version,
    currentVersion: update.currentVersion,
    date: update.date,
    body: update.body,
    install: async (onProgress) => {
      await downloadAndInstall(update, onProgress);
      await relaunch();
    },
  };
}

async function downloadAndInstall(
  update: Update,
  onProgress?: (p: DownloadProgress) => void,
) {
  let downloaded = 0;
  let total: number | null = null;
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? null;
        downloaded = 0;
        onProgress?.({ downloaded, total });
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        onProgress?.({ downloaded, total });
        break;
      case "Finished":
        onProgress?.({ downloaded: total ?? downloaded, total });
        break;
    }
  });
}
