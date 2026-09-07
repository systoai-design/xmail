/**
 * What xmail accepts as an attachment.
 *
 * A strict allowlist, not a blocklist. The server can never inspect these files
 * -- they arrive encrypted -- so there is no scanner downstream to catch a bad
 * one. The only place a judgement can be made is here, before encryption, which
 * means the list has to be conservative by default.
 *
 * Deliberately excluded, and why:
 *   .exe .msi .bat .cmd .ps1 .sh .vbs .jar .apk .dll .scr .hta .lnk .reg
 *       executable on arrival; nothing legitimate needs to travel this way
 *   .svg
 *       renders inline as an image but can carry script when opened directly
 *       from disk, which is exactly what a recipient does after downloading
 *   .html .htm
 *       same problem, minus the ambiguity
 */

export interface FileKind {
  label: string;
  extensions: string[];
}

export const ACCEPTED_FILE_KINDS: FileKind[] = [
  {
    label: "Documents",
    extensions: ["pdf", "md", "markdown", "txt", "rtf", "doc", "docx", "odt", "epub"],
  },
  {
    label: "Spreadsheets",
    extensions: ["csv", "tsv", "xls", "xlsx", "ods"],
  },
  {
    label: "Presentations",
    extensions: ["ppt", "pptx", "odp", "key"],
  },
  {
    label: "Images",
    extensions: ["png", "jpg", "jpeg", "gif", "webp", "avif", "heic", "heif", "bmp", "tif", "tiff"],
  },
  {
    label: "Audio",
    extensions: ["mp3", "wav", "m4a", "aac", "ogg", "oga", "opus", "flac", "aiff"],
  },
  {
    label: "Video",
    extensions: ["mp4", "m4v", "mov", "webm", "mkv", "avi"],
  },
  {
    label: "Data",
    extensions: ["json", "xml", "yaml", "yml", "log", "ics", "vcf"],
  },
  {
    label: "Archives",
    extensions: ["zip", "7z", "tar", "gz", "tgz", "bz2", "rar"],
  },
  {
    label: "Design",
    extensions: ["fig", "sketch", "psd", "ai", "indd", "xd", "afdesign", "afphoto"],
  },
];

const ALLOWED = new Set(ACCEPTED_FILE_KINDS.flatMap((k) => k.extensions));

/** The `accept` attribute, so the OS picker filters before a file is even chosen. */
export const ACCEPT_ATTRIBUTE = [...ALLOWED].map((e) => `.${e}`).join(",");

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

export function isAllowedFile(fileName: string): boolean {
  return ALLOWED.has(extensionOf(fileName));
}

/** Short human summary for the UI, e.g. "PDF, images, audio, video and more". */
export const ACCEPTED_SUMMARY = "PDF, docs, sheets, images, audio, video, archives";
