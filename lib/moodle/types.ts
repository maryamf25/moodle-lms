export interface UserData {
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    email: string;
}

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
    fileurl: string; // Custom property for cover image
}

export interface Module {
    id: number;
    url: string;
    name: string;
    visible: number;
    modname: string;
    contents?: {
        fileurl: string;
        filename: string;
    }[];
    fileurl: string; // Custom convenience
    filename: string; // Custom convenience
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

export interface UserProfile {
    id: number;
    username: string;
    fullname: string;
    firstname: string;
    lastname: string;
    email: string;
    profileimageurlsmall: string;
    profileimageurl: string;
    role: 'admin' | 'teacher' | 'student';
}
