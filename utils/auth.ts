import Cookies from 'js-cookie';

export const setToken = (token: string) => {
    // Save token for 7 days
    Cookies.set('moodle_token', token, { expires: 7 });
};

export const getToken = () => {
    return Cookies.get('moodle_token');
};

export const logout = () => {
    Cookies.remove('moodle_token');
    window.location.href = '/login';
};
