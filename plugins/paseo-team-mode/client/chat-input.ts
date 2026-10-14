import type { NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";
import type { ChatAttachment } from "../shared/contracts.js";

/** React Native's key-press payload plus the modifier flag react-native-web adds. */
export interface WebKeyPressData extends TextInputKeyPressEventData {
  shiftKey?: boolean;
}

/** The web paste event, as it reaches a React Native `View` (clipboardData may sit on nativeEvent). */
export interface PasteEventLike {
  clipboardData?: DataTransfer | null;
  nativeEvent?: { clipboardData?: DataTransfer | null };
}

export function imageFilesFromPaste(event: PasteEventLike): File[] {
  const items = (event.clipboardData ?? event.nativeEvent?.clipboardData)?.items;
  if (!items) return [];
  const files: File[] = [];
  for (const item of Array.from(items)) {
    if (!item.type.includes("image")) continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}

function readAsDataUrl(file: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve(typeof reader.result === "string" && reader.result ? reader.result : null);
    });
    reader.addEventListener("error", () => resolve(null));
    reader.readAsDataURL(file);
  });
}

/** Reads image files into attachments; files that are not images or fail to read are skipped. */
export async function readImageAttachments(
  files: readonly File[],
  unnamedPrefix: string,
  existingCount: number,
): Promise<ChatAttachment[]> {
  const images = files.filter((file) => file.type.startsWith("image/"));
  const dataUrls = await Promise.all(images.map(readAsDataUrl));
  const attachments: ChatAttachment[] = [];
  images.forEach((file, index) => {
    const dataUrl = dataUrls[index];
    if (!dataUrl) return;
    attachments.push({
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: "image",
      name: file.name || `${unnamedPrefix} ${existingCount + attachments.length + 1}`,
      dataUrl,
    });
  });
  return attachments;
}

/** Enter without Shift submits the message instead of inserting a newline. */
export function isSubmitKeyPress(event: NativeSyntheticEvent<WebKeyPressData>): boolean {
  return event.nativeEvent.key === "Enter" && !event.nativeEvent.shiftKey;
}
