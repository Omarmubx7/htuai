import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function generateKey(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `resources/${timestamp}-${random}.${ext}`;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "You must be signed in to upload files." }, { status: 401 });
    }

    try {
        const { filename, contentType, fileSize } = await req.json();

        if (!filename || !contentType) {
            return NextResponse.json({ error: "Missing required fields: filename and contentType are both required." }, { status: 400 });
        }

        if (typeof fileSize === "number" && fileSize > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File "${filename}" is too large (${(fileSize / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 50 MB.` },
                { status: 413 }
            );
        }

        if (filename.length > 255) {
            return NextResponse.json({ error: "Filename is too long. Maximum 255 characters." }, { status: 400 });
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
            { error: "Failed to generate upload URL" },
            { status: 500 }
        );
    }
}
