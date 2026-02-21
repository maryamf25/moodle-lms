
import { getUserCourses } from './lib/moodle/courses';
import { getUserByEmail } from './lib/moodle/user';

async function check() {
    const adminToken = process.env.MOODLE_ADMIN_TOKEN!;
    const email = 'bulkstudent1@example.com';

    console.log('--- Debugging Enrollment for', email, '---');

    const users = await getUserByEmail(email);
    if (!users || users.length === 0) {
        console.log('User not found in Moodle');
        return;
    }

    const user = users[0];
    console.log('User ID:', user.id);
    console.log('Username in Moodle:', user.username);
    console.log('Email in Moodle:', user.email);

    const courses = await getUserCourses(adminToken, user.id);
    console.log('Enrolled Courses:', courses.length);
    courses.forEach(c => console.log(`- ${c.fullname} (ID: ${c.id})`));
}

check();
