import type {
  SheetMusicFileKind,
  SheetMusicFileRow,
  SheetMusicOrigin,
  SheetMusicRow,
} from "@/lib/supabase/types";

export const SHEET_MUSIC_BUCKET = "sheet-music";

export interface SheetMusicFileView {
  id: string;
  kind: SheetMusicFileKind;
  storageBucket: string | null;
  storagePath: string | null;
  externalUrl: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  displayOrder: number;
}

export interface SheetMusicView {
  id: string;
  title: string;
  composer: string | null;
  origin: SheetMusicOrigin;
  pieceId: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  license: string | null;
  attribution: string | null;
  files: SheetMusicFileView[];
}

export function fileKindForMimeType(mimeType: string, fileName = ""): SheetMusicFileKind {
  const lower = fileName.toLowerCase();
  if (mimeType.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (mimeType.includes("xml") || lower.endsWith(".musicxml") || lower.endsWith(".xml") || lower.endsWith(".mxl")) return "musicxml";
  if (mimeType.includes("midi") || lower.endsWith(".mid") || lower.endsWith(".midi")) return "midi";
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(lower)) return "image";
  if (mimeType.startsWith("audio/")) return "audio-source";
  return "pdf";
}

export function extensionForSheetMusicFile(file: File) {
  const namePart = file.name.split(".").pop();
  if (namePart && namePart !== file.name) return namePart.toLowerCase();
  const kind = fileKindForMimeType(file.type, file.name);
  if (kind === "musicxml") return "musicxml";
  if (kind === "image") return "png";
  if (kind === "midi") return "mid";
  if (kind === "audio-source") return "webm";
  return "pdf";
}

export function sanitizeStorageName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "sheet-music";
}

export function toSheetMusicView(row: SheetMusicRow, files: SheetMusicFileRow[] = []): SheetMusicView {
  return {
    id: row.id,
    title: row.title,
    composer: row.composer,
    origin: row.origin,
    pieceId: row.piece_id,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    license: row.license,
    attribution: row.attribution,
    files: files
      .filter((file) => file.sheet_music_id === row.id)
      .sort((a, b) => a.display_order - b.display_order)
      .map((file) => ({
        id: file.id,
        kind: file.kind,
        storageBucket: file.storage_bucket,
        storagePath: file.storage_path,
        externalUrl: file.external_url,
        contentType: file.content_type,
        sizeBytes: file.size_bytes,
        displayOrder: file.display_order,
      })),
  };
}
