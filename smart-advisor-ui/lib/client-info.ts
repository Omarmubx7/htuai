import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';
import { VisitorLog } from './database';

export async function getClientInfo(): Promise<VisitorLog> {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = headersList.get('user-agent') || '';

    // Parse User Agent
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
        ip_address: ip,
        user_agent: userAgent,
        device_vendor: result.device.vendor,
        device_model: result.device.model,
        os_name: result.os.name,
        os_version: result.os.version,
        browser_name: result.browser.name
    };
}
