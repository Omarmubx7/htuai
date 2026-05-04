import { z } from "zod";
import { NextResponse } from "next/server";

export function validationErrorResponse(errors: z.ZodIssue[] | string[]) {
    return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
    );
}
