const BASE_URL = process.env.NEXT_PUBLIC_MOODLE_URL;
const SERVICE = process.env.NEXT_PUBLIC_MOODLE_SERVICE;

export interface UserData {
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    email: string;
}

// --- 1. LOGIN FUNCTION ---
export const loginUser = async (username: string, password: string): Promise<{ token: string, privatetoken?: string, error?: string }> => {
    const endpoint = `${BASE_URL}/login/token.php`;

    const params = new URLSearchParams({
        username: username,
        password: password,
        service: SERVICE || '',
    });

    try {
        const res = await fetch(`${endpoint}?${params}`, { method: 'POST' });
        const data = await res.json();

        if (data.error) {
            throw new Error(data.error);
        }
        return data; // returns { token: "...", privatetoken: "..." }
    } catch (error) {
        throw error;
    }
};

// --- Helper: Get Auto-Login Key for Seamless Redirect ---
// src/lib/moodle.ts

// Update function signature to accept privateToken
export const getAutoLoginUrl = async (token: string, privateToken: string): Promise<{ url?: string, error?: string }> => {
    const endpoint = `${process.env.NEXT_PUBLIC_MOODLE_URL}/webservice/rest/server.php`;

    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'tool_mobile_get_autologin_key',
        moodlewsrestformat: 'json',
        privatetoken: privateToken // <--- YE LINE ZAROORI HAI
    });

    try {
        // Use POST method and send privatetoken in the body, not as GET parameter
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });
        const data = await res.json();

        if (data.autologinurl) {
            return { url: data.autologinurl };
        }
        if (data.exception) {
            return { error: `Moodle Error: ${data.message} (${data.errorcode})` };
        }
        return { error: 'No auto-login URL returned by Moodle' };
    } catch (error: any) {
        console.error("Auto-login failed", error);
        return { error: error.message || 'Network error checking auto-login' };
    }
};

// --- 2. REGISTER FUNCTION ---
export const registerUser = async (userData: UserData) => {
    const endpoint = `${BASE_URL}/webservice/rest/server.php`;
    // Use Admin Token for user creation usually
    const adminToken = process.env.MOODLE_TOKEN;

    const params = new URLSearchParams({
        wstoken: adminToken || '',
        wsfunction: 'core_user_create_users',
        moodlewsrestformat: 'json',
    });

    const bodyParams = new URLSearchParams();
    bodyParams.append('users[0][username]', userData.username);
    bodyParams.append('users[0][password]', userData.password);
    bodyParams.append('users[0][firstname]', userData.firstname);
    bodyParams.append('users[0][lastname]', userData.lastname);
    bodyParams.append('users[0][email]', userData.email);
    bodyParams.append('users[0][auth]', 'manual');

    try {
        const res = await fetch(`${endpoint}?${params.toString()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams
        });
        const data = await res.json();

        if (data.exception) throw new Error(data.message);
        if (data.debuginfo) throw new Error(data.message); // Sometimes error comes like this

        // Success returns array of Created Users
        return data[0];
    } catch (error) {
        console.error("Registration failed:", error);
        throw error;
    }
};

// --- Check User By Email (Helper) ---
export const getUserByEmail = async (email: string) => {
    const endpoint = `${BASE_URL}/webservice/rest/server.php`;
    const token = process.env.MOODLE_TOKEN;

    const params = new URLSearchParams({
        wstoken: token || '',
        wsfunction: 'core_user_get_users',
        moodlewsrestformat: 'json',
        'criteria[0][key]': 'email',
        'criteria[0][value]': email
    });

    try {
        const res = await fetch(`${endpoint}?${params.toString()}`);
        const data = await res.json();
        if (data.users && data.users.length > 0) return data.users[0];
        return null;
    } catch (e) {
        return null; // Assume not found or error
    }
};

// --- Enroll User Function ---
export const enrolUser = async (userId: number, courseId: number) => {
    const endpoint = `${BASE_URL}/webservice/rest/server.php`;
    const token = process.env.MOODLE_TOKEN;

    const params = new URLSearchParams({
        wstoken: token || '',
        wsfunction: 'enrol_manual_enrol_users',
        moodlewsrestformat: 'json',
    });

    const bodyParams = new URLSearchParams();
    bodyParams.append('enrolments[0][roleid]', '5'); // 5 = Student
    bodyParams.append('enrolments[0][userid]', userId.toString());
    bodyParams.append('enrolments[0][courseid]', courseId.toString());

    try {
        const res = await fetch(`${endpoint}?${params.toString()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams
        });
        const data = await res.json();

        // Null response usually means success for void functions in Moodle API
        if (data && data.exception) throw new Error(data.message);
        return true;
    } catch (error) {
        console.error("Enrollment failed:", error);
        throw error;
    }
};

export interface EnrolledCourse {
    id: number;
    shortname: string;
    fullname: string;
    displayname: string;
    enrolledusercount: number;
    idnumber: string;
    visible: number;
    summary: string;
    summaryformat: number;
    format: string;
    showgrades: boolean;
    lang: string;
    enablecompletion: boolean;
    completionhascriteria: boolean;
    completionusertracked: boolean;
    category: number;
    progress: number;
    completed: boolean;
    startdate: number;
    enddate: number;
    marker: number;
    lastaccess: number;
    isfavourite: boolean;
    hidden: boolean;
    overviewfiles: { fileurl: string }[];
}

export interface CourseContent {
    id: number;
    name: string;
    visible: number;
    summary: string;
    summaryformat: number;
    section: number;
    hiddenbynumsections?: number;
    uservisible?: boolean;
    modules: Module[];
}

export interface Module {
    id: number;
    url: string;
    name: string;
    visible: number;
    modname: string;
    contents?: { fileurl: string, filename: string }[];
}

// --- 3. FETCH USER COURSES ---
export const getUserCourses = async (token: string, userid: number) => {
    const endpoint = `${BASE_URL}/webservice/rest/server.php`;
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_enrol_get_users_courses',
        moodlewsrestformat: 'json',
        userid: userid.toString(),
    });

    try {
        const res = await fetch(`${endpoint}?${params}`);
        const data = await res.json();

        if (data.exception) {
            console.error("Moodle API Exception (getUserCourses):", data);
            throw new Error(data.message);
        }

        return data as EnrolledCourse[];
    } catch (error) {
        console.error("Error fetching user courses:", error);
        throw error;
    }
};

// --- 4. FETCH COURSE CONTENTS ---
export const getCourseContents = async (token: string, courseid: number) => {
    const endpoint = `${BASE_URL}/webservice/rest/server.php`;
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_course_get_contents',
        moodlewsrestformat: 'json',
        courseid: courseid.toString(),
    });

    try {
        const res = await fetch(`${endpoint}?${params}`);
        const data = await res.json();

        if (data.exception) {
            console.error("Moodle API Exception (getCourseContents):", data);
            throw new Error(data.message);
        }

        return data as CourseContent[];
    } catch (error) {
        console.error("Error fetching course contents:", error);
        throw error;
    }
};

export interface UserProfile {
    id: number;
    username: string;
    fullname: string;
    firstname: string;
    lastname: string;
    email: string;
    profileimageurlsmall: string;
    profileimageurl: string;
}

// --- 5. FETCH USER PROFILE ---
export const getUserProfile = async (token: string): Promise<UserProfile> => {
    const endpoint = `${BASE_URL}/webservice/rest/server.php`;

    // First we usually need the userid to fetch profile, but site info gives us userid and fullname/avatar often
    // Let's use core_webservice_get_site_info as it returns user details as well
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_webservice_get_site_info',
        moodlewsrestformat: 'json',
    });

    try {
        const res = await fetch(`${endpoint}?${params}`);
        const data = await res.json();

        if (data.exception) {
            console.error("Moodle API Exception (getUserProfile):", data);
            throw new Error(data.message);
        }

        // Only mapping basic fields
        return {
            id: data.userid,
            username: data.username,
            fullname: data.fullname,
            firstname: data.firstname,
            lastname: data.lastname,
            email: '', // site info usually doesn't give email, require core_user_get_users_by_id if needed
            profileimageurlsmall: data.userpictureurl,
            profileimageurl: data.userpictureurl, // Moodle sometimes gives different sizes
        };
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
};
