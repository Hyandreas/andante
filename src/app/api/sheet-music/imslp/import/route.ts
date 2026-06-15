import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SheetMusicFileKind, SheetMusicFileRow, SheetMusicRow } from "@/lib/supabase/types";

export const runtime = "nodejs";

const ALLOWED_RIGHTS = new Set(["public-domain", "open-license", "creative-commons"]);
const ALLOWED_FILE_KINDS = new Set<SheetMusicFileKind>(["pdf", "image", "musicxml"]);

interface ImportPayload {
  title?: string;
  composer?: string;
  pageId?: number;
  sourceUrl?: string;
  fileUrl?: string;
  fileKind?: SheetMusicFileKind;
  license?: string;
  attribution?: string;
  rightsStatus?: string;
  pieceId?: string | null;
}

function isImslpUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname === "imslp.org" || url.hostname.endsWith(".imslp.org");
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to import sheet music." }, { status: 401 });
  }

  const body = await req.json() as ImportPayload;
  const title = body.title?.trim();
  const sourceUrl = body.sourceUrl?.trim();
  const rightsStatus = body.rightsStatus?.trim().toLowerCase();

  if (!title || !sourceUrl || !isImslpUrl(sourceUrl)) {
    return NextResponse.json({ error: "Choose a valid IMSLP work page." }, { status: 400 });
  }

  if (!rightsStatus || !ALLOWED_RIGHTS.has(rightsStatus)) {
    return NextResponse.json({
      error: "IMSLP imports require an explicit public-domain or open-license confirmation.",
    }, { status: 400 });
  }

  const musicId = crypto.randomUUID();
  const { data: sheetMusic, error } = await supabase
    .from("sheet_music")
    .insert({
      id: musicId,
      user_id: user.id,
      piece_id: body.pieceId || null,
      title,
      composer: body.composer?.trim() || null,
      origin: "imslp",
      source_name: body.pageId ? `IMSLP #${body.pageId}` : "IMSLP",
      source_url: sourceUrl,
      license: body.license?.trim() || rightsStatus,
      attribution: body.attribution?.trim() || "Imported from IMSLP. Verify jurisdiction-specific copyright before use.",
      is_public: false,
    } as never)
    .select("*")
    .single();

  if (error || !sheetMusic) {
    return NextResponse.json({ error: error?.message ?? "Could not import IMSLP metadata." }, { status: 500 });
  }

  let files: SheetMusicFileRow[] = [];
  if (body.fileUrl && isImslpUrl(body.fileUrl) && body.fileKind && ALLOWED_FILE_KINDS.has(body.fileKind)) {
    const { data: insertedFiles, error: fileError } = await supabase
      .from("sheet_music_files")
      .insert({
        sheet_music_id: musicId,
        kind: body.fileKind,
        external_url: body.fileUrl,
        content_type: body.fileKind === "pdf" ? "application/pdf" : null,
        display_order: 0,
      } as never)
      .select("*");
    if (fileError) {
      return NextResponse.json({ error: fileError.message }, { status: 500 });
    }
    files = (insertedFiles ?? []) as SheetMusicFileRow[];
  }

  return NextResponse.json({
    sheetMusic: sheetMusic as SheetMusicRow,
    files,
  });
}
