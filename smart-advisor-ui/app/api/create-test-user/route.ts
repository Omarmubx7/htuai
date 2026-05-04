import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({ error: "Route disabled for security reasons." }, { status: 404 });
}
