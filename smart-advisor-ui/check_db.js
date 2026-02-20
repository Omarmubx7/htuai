
const { createClient } = require('@vercel/postgres');
require('dotenv').config({ path: '.venv/.env.local' });

async function check() {
    const client = createClient({
        connectionString: process.env.POSTGRES_URL
    });
    await client.connect();
    try {
        const { rows } = await client.sql`SELECT student_id, major FROM student_progress LIMIT 10`;
        console.log("--- Student IDs ---");
        rows.forEach(r => console.log(r));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

check();
