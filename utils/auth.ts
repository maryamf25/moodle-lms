import Cookies from 'js-cookie';
import { MoodleRole } from '@/lib/auth/roles';

export const setToken = (token: string) => {
    // Save token for 7 days
    Cookies.set('moodle_token', token, { expires: 7 });
};

export const setUserRole = (role: MoodleRole) => {
    Cookies.set('moodle_role', role, { expires: 7 });
};

export const setSession = (token: string, role: MoodleRole) => {
    setToken(token);
    setUserRole(role);
};

export const getToken = () => {
    return Cookies.get('moodle_token');
};

export const logout = () => {
    Cookies.remove('moodle_token');
    Cookies.remove('moodle_role');
    window.location.href = '/login';
};
