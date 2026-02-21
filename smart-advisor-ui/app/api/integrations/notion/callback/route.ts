import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { saveIntegrationToken, initPlannerTables } from "@/lib/database";

function getSemesterLabel(): string {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-indexed: Jan=1 ... Dec=12
    const year = now.getFullYear();

    // HTU semesters:
    //   First semester:  October – February
    //   Second semester: March – June
    //   Summer semester: July – September

    if (month >= 10) {
        // Oct–Dec → First Semester of year/year+1
        return `First Semester ${year}/${year + 1}`;
    }
    if (month <= 2) {
        // Jan–Feb → First Semester of (year-1)/year
        return `First Semester ${year - 1}/${year}`;
    }
    if (month <= 6) {
        // Mar–Jun → Second Semester of (year-1)/year
        return `Second Semester ${year - 1}/${year}`;
    }
    // Jul–Sep → Summer Semester of (year-1)/year
    return `Summer Semester ${year - 1}/${year}`;
}

// GET /api/integrations/notion/callback?code=...
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.redirect(new URL("/planner?error=unauthorized", req.url));
    }

    const studentId = (session.user as any).student_id || session.user.name;
    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");

    if (error || !code) {
        return NextResponse.redirect(new URL("/planner?error=notion_denied", req.url));
    }

    try {
        await initPlannerTables();

        // Exchange code for Notion access token
        const basicAuth = Buffer.from(
            `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
        ).toString("base64");

        const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${basicAuth}`,
            },
            body: JSON.stringify({
                grant_type: "authorization_code",
                code,
                redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/notion/callback`,
            }),
        });

        if (!tokenRes.ok) {
            console.error("Notion token exchange failed:", await tokenRes.text());
            return NextResponse.redirect(new URL("/planner?error=notion_token_failed", req.url));
        }

        const data = await tokenRes.json();
        const notionHeaders = {
            Authorization: `Bearer ${data.access_token}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        };

        // Find any accessible parent page — the user must share at least one page in the Notion prompt
        const searchRes = await fetch("https://api.notion.com/v1/search", {
            method: "POST",
            headers: notionHeaders,
            body: JSON.stringify({ page_size: 50 }),
        });

        let workspaceParentId: string | null = null;
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            const results = searchData.results || [];
            // Try pages first (prefer workspace-level)
            const pages = results.filter((r: any) => r.object === "page");
            const workspacePage = pages.find((p: any) => p.parent?.type === "workspace");
            workspaceParentId = workspacePage?.id || pages[0]?.id || null;
            // If no pages, try to get parent page from a database
            if (!workspaceParentId) {
                const db = results.find((r: any) => r.object === "database" && r.parent?.page_id);
                if (db) workspaceParentId = db.parent.page_id;
            }
        }

        if (!workspaceParentId) {
            // Save token anyway so user doesn't have to re-auth, just needs to share pages
            await saveIntegrationToken(
                studentId,
                "notion",
                data.access_token,
                null,
                undefined,
                JSON.stringify({ workspaceId: data.workspace_id })
            );
            return NextResponse.redirect(new URL("/planner?error=notion_no_pages", req.url));
        }

        // Create the "Study Plan YYYY/YYYY" page — this becomes the parent for the courses database
        const semester = getSemesterLabel();
        const pageTitle = `📚 Study Plan ${semester}`;
        let studyPlanPageId = workspaceParentId; // fallback

        try {
            const pageRes = await fetch("https://api.notion.com/v1/pages", {
                method: "POST",
                headers: notionHeaders,
                body: JSON.stringify({
                    parent: { page_id: workspaceParentId },
                    properties: {
                        title: { title: [{ text: { content: pageTitle } }] },
                    },
                }),
            });
            if (pageRes.ok) {
                const page = await pageRes.json();
                studyPlanPageId = page.id;
            }
        } catch {
            // Fall back to workspace parent
        }

        // Save token with the Study Plan page as parent (so the database goes inside it)
        await saveIntegrationToken(
            studentId,
            "notion",
            data.access_token,
            null,
            undefined,
            JSON.stringify({
                parentPageId: studyPlanPageId,
                workspaceId: data.workspace_id,
                semester,
            })
        );

        return NextResponse.redirect(new URL("/planner?connected=notion", req.url));
    } catch (e: unknown) {
        console.error("Notion callback error:", e);
        return NextResponse.redirect(new URL("/planner?error=notion_callback_error", req.url));
    }
}
