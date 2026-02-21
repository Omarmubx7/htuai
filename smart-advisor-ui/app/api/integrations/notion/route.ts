import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getIntegrationToken } from "@/lib/database";

// POST /api/integrations/notion — Sync courses as a Notion database
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as any).student_id || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    const token = await getIntegrationToken(studentId, "notion");
    if (!token) {
        return NextResponse.json({ error: "Notion not connected. Click Connect first." }, { status: 400 });
    }

    const { courses, semesterName, createNewPage } = await req.json();
    if (!Array.isArray(courses)) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const headers = {
        Authorization: `Bearer ${token.accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    };

    // Find parent page from metadata or search
    const metadata = token.metadata ? JSON.parse(token.metadata) : {};
    let parentPageId = metadata.parentPageId || null;

    if (!parentPageId) {
        const searchRes = await fetch("https://api.notion.com/v1/search", {
            method: "POST",
            headers,
            body: JSON.stringify({ page_size: 20 }),
        });
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            const pages = searchData.results?.filter((r: any) => r.object === "page") || [];
            const workspacePage = pages.find((p: any) => p.parent?.type === "workspace");
            parentPageId = workspacePage?.id || pages[0]?.id || null;
        }
    }

    if (!parentPageId) {
        return NextResponse.json({
            error: "No accessible Notion page found. Reconnect Notion and make sure to select pages to share when prompted.",
        }, { status: 400 });
    }

    // Determine semester label from metadata
    const semester = semesterName || metadata.semester || "Courses";

    // If user requested a new page, create a fresh Study Plan page
    if (createNewPage && parentPageId) {
        const pageTitle = `📚 Study Plan ${semester}`;
        try {
            const pageRes = await fetch("https://api.notion.com/v1/pages", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    parent: { page_id: parentPageId },
                    properties: {
                        title: { title: [{ text: { content: pageTitle } }] },
                    },
                }),
            });
            if (pageRes.ok) {
                const page = await pageRes.json();
                parentPageId = page.id;
            }
        } catch {
            // Fall back to existing parent
        }
    }

    try {
        // Create a database under the Study Plan page
        const dbRes = await fetch("https://api.notion.com/v1/databases", {
            method: "POST",
            headers,
            body: JSON.stringify({
                parent: { page_id: parentPageId },
                title: [{ text: { content: semester } }],
                properties: {
                    "Course": { title: {} },
                    "Code": { rich_text: {} },
                    "Credits": { number: {} },
                    "Grade": { select: { options: [
                        { name: "D", color: "green" },
                        { name: "M", color: "blue" },
                        { name: "P", color: "yellow" },
                        { name: "U", color: "red" },
                        { name: "—", color: "gray" },
                    ]}},
                    "Status": { select: { options: [
                        { name: "Completed", color: "green" },
                        { name: "In Progress", color: "blue" },
                        { name: "Planned", color: "gray" },
                    ]}},
                    "Midterm Date": { date: {} },
                    "Final Date": { date: {} },
                },
            }),
        });

        if (!dbRes.ok) {
            const err = await dbRes.text();
            console.error("Notion DB creation failed:", err);
            return NextResponse.json({ error: "Failed to create Notion database" }, { status: 500 });
        }

        const db = await dbRes.json();
        let successCount = 0;

        // Add each course as a row
        for (const course of courses) {
            const grade = course.grade || "—";
            const status = grade !== "—" ? "Completed" : "In Progress";

            const properties: any = {
                "Course": { title: [{ text: { content: course.name || "Unknown" } }] },
                "Code": { rich_text: [{ text: { content: course.code || course.id || "" } }] },
                "Credits": { number: course.credits || 0 },
                "Grade": { select: { name: grade } },
                "Status": { select: { name: status } },
            };

            if (course.midtermDate) {
                properties["Midterm Date"] = { date: { start: course.midtermDate } };
            }
            if (course.finalDate) {
                properties["Final Date"] = { date: { start: course.finalDate } };
            }

            try {
                const pageRes = await fetch("https://api.notion.com/v1/pages", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        parent: { database_id: db.id },
                        properties,
                    }),
                });
                if (pageRes.ok) successCount++;
            } catch {
                // Continue with other courses
            }
        }

        return NextResponse.json({ successCount, totalCount: courses.length, databaseId: db.id });
    } catch (e: any) {
        console.error("Notion sync error:", e);
        return NextResponse.json({ error: "Notion sync failed" }, { status: 500 });
    }
}
