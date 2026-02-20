const { createClient } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

// Database connection string from environment variable
const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
    console.error("Error: POSTGRES_URL environment variable is not set.");
    process.exit(1);
}

async function run() {
    const client = createClient({ connectionString: POSTGRES_URL });
    await client.connect();

    const studentId = "123456";
    const password = "password123";
    const major = "electrical_engineering";

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        console.log(`Creating test user: ${studentId}...`);

        // 1. Create User
        const userRes = await client.sql`
            INSERT INTO users (student_id, password_hash, name)
            VALUES (${studentId}, ${passwordHash}, 'Test Student')
            ON CONFLICT (student_id) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                name = EXCLUDED.name
            RETURNING id
        `;

        const userId = userRes.rows[0].id;
        console.log(`User ID in database: ${userId}`);

        // 2. Create Profile (links student_id to major)
        await client.sql`
            INSERT INTO student_profile (student_id, major, updated_at)
            VALUES (${studentId}, ${major}, (EXTRACT(EPOCH FROM NOW())::bigint))
            ON CONFLICT (student_id) DO UPDATE SET
                major = EXCLUDED.major,
                updated_at = EXCLUDED.updated_at
        `;

        console.log("Success! Test user created.");
        console.log(`Login ID: ${studentId}`);
        console.log(`Password: ${password}`);
        console.log(`Major: ${major}`);

    } catch (e) {
        console.error("Error creating test user:", e);
    } finally {
        await client.end();
    }
}

run();
