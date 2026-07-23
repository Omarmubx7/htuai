import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2";

const ALLOWED_EXTENSIONS: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    txt: "text/plain",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function generateKey(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `resources/${timestamp}-${random}.${ext}`;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { filename, contentType } = await req.json();

        if (!filename || !contentType) {
            return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
        }

        const ext = filename.split(".").pop()?.toLowerCase() || "";
        if (!ALLOWED_EXTENSIONS[ext]) {
            return NextResponse.json({ error: `File type .${ext} is not allowed` }, { status: 400 });
        }

        const key = generateKey(filename);
        const s3 = getR2Client();

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
        const publicUrl = `${R2_PUBLIC_URL}/${key}`;

        return NextResponse.json({ uploadUrl, key, publicUrl });
    } catch (error) {
        console.error("[directory] Presign error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate upload URL" },
            { status: 500 }
        );
    }
}
