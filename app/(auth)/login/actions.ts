// app/(auth)/login/actions.ts

'use server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function getUserId(token: string) {
    const endpoint = `${process.env.NEXT_PUBLIC_MOODLE_URL}/webservice/rest/server.php`;

    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_webservice_get_site_info',
        moodlewsrestformat: 'json'
    });

    const res = await fetch(`${endpoint}?${params.toString()}`);
    const data = await res.json();

    if (!data.userid) throw new Error('Unable to fetch user ID');
    return data.userid;
}

export async function getAutoLoginUrlAction(token: string, privateToken: string) {
    const endpoint = `${process.env.NEXT_PUBLIC_MOODLE_URL}/webservice/rest/server.php`;

    // 1. Params mein se 'userid' hata diya gaya hai (Ye Invalid Parameter error theek karega)
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'tool_mobile_get_autologin_key',
        moodlewsrestformat: 'json',
        privatetoken: privateToken,
    });

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'User-Agent': 'MoodleMobile/4.4.0 (Linux; Android 14)',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });

        const data = await res.json();

        // 2. Hum ab 'key' bhi return kar rahe hain taake URL manually bana saken
        if (data.key) {
            return { key: data.key, url: data.autologinurl };
        }

        if (data.exception) return { error: `Moodle Error: ${data.message}` };
        return { error: 'No auto-login key returned' };

    } catch (error: any) {
        return { error: error.message || 'Network error' };
    }
}