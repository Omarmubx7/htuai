/**
 * Shared upload policy for the Resources directory.
 *
 * Imported by both client components (UploadDialog) and server routes
 * (presign / resources). Keep this module free of Node-only imports.
 */

/** Maximum size for a single file (50 MB). */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Maximum number of files that can be attached in a single upload batch. */
export const MAX_FILES_PER_BATCH = 10;

/** Maximum number of resources a signed-in user may create per calendar day. */
export const MAX_UPLOADS_PER_DAY = 25;

/** Maximum number of active resources a signed-in user may own in total. */
export const MAX_TOTAL_RESOURCES = 250;

/** Publicly hidden once a resource collects this many reports. */
export const REPORT_HIDE_THRESHOLD = 5;

/** Safety cap on how many resources the public list endpoint returns. */
export const LIST_LIMIT = 500;

/**
 * File extensions we accept, mapped to a safe Content-Type.
 * Anything not listed here is rejected — notably HTML, SVG, scripts and
 * executables, which must never be served as active content from our bucket.
 */
export const MIME_BY_EXTENSION: Record<string, string> = {
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    rtf: "application/rtf",
    odt: "application/vnd.oasis.opendocument.text",
    odp: "application/vnd.oasis.opendocument.presentation",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    csv: "text/csv",
    // Images
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    // Archives
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
};

export const ALLOWED_EXTENSIONS = Object.keys(MIME_BY_EXTENSION);

/** Extensions that most likely represent a student's *personal* work. */
export const PERSONAL_DOC_EXTENSIONS = ["doc", "docx"];

/** Comma-separated list for the file input `accept` attribute. */
export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export function getExtension(filename: string): string {
    return filename.split(".").pop()?.toLowerCase() || "";
}

export function isAllowedExtension(filename: string): boolean {
    return ALLOWED_EXTENSIONS.includes(getExtension(filename));
}

/** Server-authoritative content type derived from the extension (never trust the client). */
export function safeContentType(filename: string): string {
    return MIME_BY_EXTENSION[getExtension(filename)] || "application/octet-stream";
}

/** True when the file looks like a personal Word document (used for the soft warning). */
export function isPersonalDoc(filename: string): boolean {
    return PERSONAL_DOC_EXTENSIONS.includes(getExtension(filename));
}

/** Maps an extension to the resource "type" bucket stored in the DB. */
export function detectTypeFromExtension(filename: string): string {
    const ext = getExtension(filename);
    if (ext === "pdf") return "pdf";
    if (["mp4", "webm", "mov", "m4v"].includes(ext)) return "video";
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
    if (["zip", "rar", "7z"].includes(ext)) return "folder";
    if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return "other";
    if (!ext) return "other";
    return "pdf";
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
