import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Shared resource on MubxAI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TYPE_LABEL: Record<string, string> = {
    pdf: "PDF",
    video: "Video",
    link: "Link",
    image: "Image",
    folder: "Folder",
    other: "Resource",
};

function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).trimEnd()}…`;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const resourceId = parseInt(id, 10);

    let title = "Course resource";
    let course = "";
    let typeLabel = "Resource";

    if (!isNaN(resourceId)) {
        try {
            const resource = await prisma.resource.findUnique({
                where: { id: resourceId },
                select: { title: true, course_code: true, type: true },
            });
            if (resource) {
                title = resource.title;
                course = resource.course_code;
                typeLabel = TYPE_LABEL[resource.type] || "Resource";
            }
        } catch {
            // fall back to defaults
        }
    }

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: "#222d32",
                    padding: "72px",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "64px",
                            height: "64px",
                            borderRadius: "18px",
                            background: "#dc4835",
                            color: "#ffffff",
                            fontSize: "38px",
                            fontWeight: 900,
                        }}
                    >
                        M
                    </div>
                    <div style={{ display: "flex", fontSize: "30px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                        MubxAI — Student Resources
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                            style={{
                                display: "flex",
                                padding: "8px 18px",
                                borderRadius: "999px",
                                background: "#dc4835",
                                color: "#ffffff",
                                fontSize: "24px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            {typeLabel}
                        </div>
                        {course ? (
                            <div
                                style={{
                                    display: "flex",
                                    padding: "8px 18px",
                                    borderRadius: "999px",
                                    background: "rgba(255,255,255,0.12)",
                                    color: "#ffffff",
                                    fontSize: "24px",
                                    fontWeight: 700,
                                }}
                            >
                                {course}
                            </div>
                        ) : null}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: "66px",
                            fontWeight: 900,
                            color: "#ffffff",
                            lineHeight: 1.06,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {truncate(title, 90)}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", fontSize: "30px", fontWeight: 800, color: "#dc4835" }}>
                        Don't gatekeep. Help your classmates.
                    </div>
                    <div style={{ display: "flex", fontSize: "26px", fontWeight: 700, color: "#9aa5b1" }}>ai.mubx.dev</div>
                </div>
            </div>
        ),
        { ...size }
    );
}
