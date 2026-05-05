// scripts/register-risc.js
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// IMPORTANT: Replace this with your actual production deployment domain
// Example: "https://your-app.vercel.app"
const PRODUCTION_DOMAIN = "https://ai.mubx.dev"; 

async function registerRiscReceiver() {
    const keyPath = path.join(__dirname, '..', 'downloaded-key.json');
    if (!fs.existsSync(keyPath)) {
        console.error("❌ ERROR: Could not find 'downloaded-key.json' in the root directory.");
        console.error("Please place the JSON key file you downloaded from Google Cloud in the root folder of this project.");
        process.exit(1);
    }

    console.log("Found credentials... authenticating with Google...");

    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/risc.configuration.readwrite']
    });

    try {
        const client = await auth.getClient();
        const receiverUrl = `${PRODUCTION_DOMAIN}/api/webhooks/google-risc`;

        console.log(`Registering Webhook Receiver: ${receiverUrl}`);

        const url = 'https://risc.googleapis.com/v1beta/stream:update';
        
        const payload = {
            delivery: {
                delivery_method: "https://schemas.openid.net/secevent/risc/delivery-method/push",
                url: receiverUrl
            },
            events_requested: [
                "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
                "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
                "https://schemas.openid.net/secevent/risc/event-type/account-enabled",
                "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
                "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked"
            ]
        };

        const res = await client.request({
            url: url,
            method: 'POST',
            data: payload
        });

        console.log("✅ SUCCESS! Receiver registered successfully.");
        console.log("Google will now send Cross-Account Protection events to your Next.js application.");
        
    } catch (error) {
        console.error("❌ ERROR registering receiver:");
        if (error.response && error.response.data) {
            console.error(error.response.data.error.message);
        } else {
             console.error(error.message);
        }
    }
}

registerRiscReceiver();
