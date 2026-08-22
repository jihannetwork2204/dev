// ==========================================
// Dev Center Software by Dev.Center (Node.js)
// Complete Academic, Portal & Mark Management System
// ==========================================

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
// Optional .env support. If dotenv is not installed, environment variables still work.
try { require('dotenv').config(); } catch (_) {}

const app = express();
const PORT = process.env.PORT || 8787;

// Middleware for parsing form data and managing sessions
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'dev_center_software_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Admin Credentials & Cleared Lists
const ADMIN_USER = "admin";
const ADMIN_PASS = "dev";

let students_list = [];
let teachers_list = [];

let subjects_list = [
    {sl: "1", name: "Bangla-I", teacher: "TBA"},
    {sl: "2", name: "Bangla-II", teacher: "TBA"},
    {sl: "3", name: "English-I", teacher: "TBA"},
    {sl: "4", name: "English-II", teacher: "TBA"},
    {sl: "5", name: "Mathematics", teacher: "TBA"},
    {sl: "6", name: "ICT", teacher: "TBA"},
    {sl: "7", name: "Islam and Moral Education", teacher: "TBA"},
    {sl: "8", name: "Bangladesh and Global Studies", teacher: "TBA"},
    {sl: "9", name: "SCIENCE", teacher: "TBA"},
    {sl: "10", name: "Fine Arts & Crafts", teacher: "TBA"}
];

// Notice Board Database
let notice_board = [
    { id: 1, text: "২০২৬ সালের অর্ধবার্ষিক পরীক্ষার সিলেবাস ও রুটিন প্রকাশিত হয়েছে (ষষ্ঠ থেকে দশম শ্রেণি)।" },
    { id: 2, text: "নিয়মিত ক্লাস উপস্থিতি এবং শৃঙ্খলা বজায় রাখার সংক্রান্ত নির্দেশাবলি।" },
    { id: 3, text: "সহ-পাঠ্যক্রম কার্যক্রম এবং সাংস্কৃতিক প্রতিযোগিতার জন্য নিবন্ধন শুরু হয়েছে।" }
];

// Examination control and exam-wise marks/results
const EXAMS = [
    { id: 'tutorial1', title: '1st Tutorial Exam' },
    { id: 'half_yearly', title: 'Half Yearly Exam' },
    { id: 'tutorial2', title: '2nd Tutorial Exam' },
    { id: 'final', title: 'Final Exam' }
];

let exam_state = {};
EXAMS.forEach(exam => {
    exam_state[exam.id] = { active: false, startedAt: null, published: false, publishedAt: null };
});
let active_exam_id = null;
// Structure: marks_db[examId][room][subjectName][studentRoll] = { written, mcq, total, grade }
let marks_db = {};

function getExam(examId) {
    return EXAMS.find(e => e.id === examId) || null;
}
function getActiveExam() {
    return active_exam_id ? getExam(active_exam_id) : null;
}
function getExamMarks(examId, room, subject) {
    if (!examId) return {};
    if (!marks_db[examId]) marks_db[examId] = {};
    if (!marks_db[examId][room]) marks_db[examId][room] = {};
    if (!marks_db[examId][room][subject]) marks_db[examId][room][subject] = {};
    return marks_db[examId][room][subject];
}
function examTitle(examId) {
    const exam = getExam(examId);
    return exam ? exam.title : 'Examination';
}
function formatExamDate(dateValue) {
    if (!dateValue) return '—';
    return new Date(dateValue).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

let portal_settings = {
    school_name: "Dev.Center",
    tagline: "Software by NIGHT CLOUD",
    logo_type: "text", 
    logo_text: "DC",
    logo_url: "",
    bg_color: "#FAF6F0",       
    header_color: "#ffffff",   
    accent_color: "#007bff",   
    ai_prompt: "তুমি একজন বন্ধুভাবাপন্ন বাংলা এআই সহকারী (AI Assistant), যে একদম মানুষের মতো সাবলীল বাংলায় কথা বলতে পারো। জিয়াননেটওয়ার্ক (JihanNetwork) পোর্টালে আসা ব্যবহারকারীদের সব প্রশ্নের উত্তর বাংলায় সুন্দর করে বুঝিয়ে দেবে।",
    home_title: "Welcome to Dev.Center",
    home_description: "Software by NIGHT CLOUD. Use the menu above to login as a Student, Teacher or Admin.",
    home_feature_title: "Academic Features:",
    home_feature_1: "Classes ranging from Class One (1) to Class Ten (10).",
    home_feature_2: "Dedicated Teacher Portal and management features.",
    home_feature_3: "Admin panel to dynamically manage subjects, teachers, and student details."
};

// Persistent local storage: keeps students, teachers, subjects, notices,
// exam state, marks, and portal settings after Node.js restarts.
const DATA_FILE = path.join(__dirname, 'data', 'portal-data.json');

function savePersistentData() {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const data = {
            students_list,
            teachers_list,
            subjects_list,
            notice_board,
            exam_state,
            active_exam_id,
            marks_db,
            portal_settings
        };
        const tempFile = DATA_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tempFile, DATA_FILE);
    } catch (err) {
        console.error('[Storage Error] Could not save portal data:', err.message);
    }
}

function loadPersistentData() {
    try {
        if (!fs.existsSync(DATA_FILE)) return;
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (Array.isArray(data.students_list)) students_list = data.students_list;
        if (Array.isArray(data.teachers_list)) teachers_list = data.teachers_list;
        if (Array.isArray(data.subjects_list)) subjects_list = data.subjects_list;
        if (Array.isArray(data.notice_board)) notice_board = data.notice_board;
        if (data.exam_state && typeof data.exam_state === 'object') {
            EXAMS.forEach(exam => {
                if (data.exam_state[exam.id]) {
                    exam_state[exam.id] = { ...exam_state[exam.id], ...data.exam_state[exam.id] };
                }
            });
        }
        if (typeof data.active_exam_id === 'string' || data.active_exam_id === null) {
            active_exam_id = data.active_exam_id;
        }
        if (data.marks_db && typeof data.marks_db === 'object') marks_db = data.marks_db;
        if (data.portal_settings && typeof data.portal_settings === 'object') {
            portal_settings = { ...portal_settings, ...data.portal_settings };
        }
        console.log('[Storage] Saved portal data loaded successfully.');
    } catch (err) {
        console.error('[Storage Error] Could not load saved data:', err.message);
    }
}

loadPersistentData();

// Save every POST mutation after the response is finished.
app.use((req, res, next) => {
    if (req.method === 'POST') {
        res.on('finish', () => savePersistentData());
    }
    next();
});

const PRESET_THEMES = {
    light_cream: { name: "Light Cream (Default)", bg_color: "#FAF6F0", header_color: "#ffffff", accent_color: "#007bff" },
    dark_purple: { name: "Dark Purple", bg_color: "#12081c", header_color: "#1a0b2e", accent_color: "#7b1fa2" },
    white_clean: { name: "White Clean (Light Mode)", bg_color: "#f4f6f9", header_color: "#ffffff", accent_color: "#007bff" },
    emerald_green: { name: "Emerald Green (School Theme)", bg_color: "#0e2f24", header_color: "#114232", accent_color: "#0b5345" },
    cyberpunk_neon: { name: "Cyberpunk Neon", bg_color: "#050505", header_color: "#12001a", accent_color: "#ff007f" },
    ocean_blue: { name: "Ocean Blue", bg_color: "#0a192f", header_color: "#172a45", accent_color: "#64ffda" },
    sunset_orange: { name: "Sunset Orange", bg_color: "#1c0d08", header_color: "#2c150c", accent_color: "#e67e22" },
    ruby_red: { name: "Ruby Red", bg_color: "#1f0909", header_color: "#330d0d", accent_color: "#c0392b" },
    midnight_amber: { name: "Midnight Amber", bg_color: "#111111", header_color: "#1d1d1d", accent_color: "#f39c12" }
};

const HTML_HEADER = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>__SCHOOL_NAME__ - __TAGLINE__</title>
    <style>
        body { background-color: __BG_COLOR__; color: #111111; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; transition: background 0.3s; }
        .top-header { background-color: __HEADER_COLOR__; border-bottom: 3px solid __ACCENT_COLOR__; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; }
        .logo-area { display: flex; align-items: center; gap: 15px; }
        .logo-circle { width: 65px; height: 65px; background: linear-gradient(135deg, __ACCENT_COLOR__, #0056b3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; color: #fff; border: 2px solid __ACCENT_COLOR__; box-shadow: 0 0 10px rgba(0,123,255,0.4); overflow: hidden; }
        .logo-circle img { width: 100%; height: 100%; object-fit: cover; }
        .title-text h1 { margin: 0; font-size: 24px; color: #111111; letter-spacing: 0.5px; }
        .title-text h2 { margin: 3px 0 0; font-size: 13px; color: #555555; font-weight: normal; }
        .header-btn { background: __ACCENT_COLOR__; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; border: 1px solid rgba(0,0,0,0.1); transition: 0.2s; display: inline-block; }
        .header-btn:hover { opacity: 0.9; }
        .navbar { background-color: __HEADER_COLOR__; display: flex; justify-content: center; flex-wrap: wrap; border-bottom: 1px solid __ACCENT_COLOR__; box-shadow: 0 4px 6px rgba(0,0,0,0.1); position: relative; z-index: 100; }
        .nav-item { position: relative; }
        .navbar a { color: #333333; text-decoration: none; padding: 12px 18px; font-size: 14px; font-weight: 500; display: block; transition: background 0.2s, color 0.2s; }
        .navbar a:hover, .nav-item:hover > a { background-color: __ACCENT_COLOR__; color: #ffffff; }
        .dropdown-content { display: none; position: absolute; background-color: __HEADER_COLOR__; min-width: 230px; box-shadow: 0px 8px 16px rgba(0,0,0,0.2); z-index: 1; border: 1px solid __ACCENT_COLOR__; border-top: none; }
        .dropdown-content a { color: #333333; padding: 10px 15px; text-decoration: none; display: block; text-align: left; font-size: 13px; border-bottom: 1px dashed rgba(0,0,0,0.1); }
        .dropdown-content a:hover { background-color: __ACCENT_COLOR__; color: #ffffff; }
        .nav-item:hover .dropdown-content { display: block; }
        .main-container { max-width: 1100px; margin: 30px auto; padding: 0 15px; }
        .student-dashboard-wrapper { display: flex; gap: 20px; align-items: flex-start; }
        .sidebar-menu { width: 240px; background-color: __ACCENT_COLOR__; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .sidebar-item { display: flex; align-items: center; gap: 12px; padding: 12px 15px; color: white; text-decoration: none; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.1); transition: background 0.2s; }
        .sidebar-item:hover { background-color: rgba(0,0,0,0.1); }
        .profile-content-area { flex-grow: 1; background: #fff; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #ddd; color: #111111; }
        .student-id-banner { background-color: __ACCENT_COLOR__; color: white; text-align: center; padding: 8px; font-size: 15px; font-weight: bold; letter-spacing: 0.5px; }
        .class-section-row { display: flex; background: #566573; color: white; font-weight: bold; font-size: 14px; text-align: center; }
        .class-col, .section-col { padding: 8px; width: 50%; }
        .class-col { background: __ACCENT_COLOR__; border-right: 1px solid #fff; }
        .student-photo-container { display: flex; justify-content: center; padding: 20px 0; background: #fff; }
        .student-avatar { width: 110px; height: 110px; border-radius: 50%; border: 4px solid __ACCENT_COLOR__; overflow: hidden; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #555; }
        .student-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .student-name-banner { background-color: __ACCENT_COLOR__; color: white; text-align: center; padding: 10px; font-size: 18px; font-weight: bold; letter-spacing: 1px; }
        .feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #ddd; border-top: 1px solid #ddd; }
        .feature-box { background: white; padding: 25px 10px; text-align: center; text-decoration: none; color: #111111; display: flex; flex-direction: column; align-items: center; gap: 10px; transition: background 0.2s; }
        .feature-box:hover { background: #f9f9f9; }
        .feature-icon { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.15); }
        .feature-title { font-size: 12px; font-weight: bold; color: #111111; }
        .card { background-color: __HEADER_COLOR__; border: 1px solid #dddddd; border-radius: 8px; padding: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); color: #111111; }
        .card h3 { color: #111111; border-bottom: 2px solid __ACCENT_COLOR__; padding-bottom: 8px; margin-top: 0; }
        .notice-header { background: __ACCENT_COLOR__; color: white; padding: 8px 15px; font-weight: bold; font-size: 14px; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between; align-items: center; }
        .notice-body { background: __HEADER_COLOR__; border: 1px solid #dddddd; border-top: none; border-radius: 0 0 4px 4px; padding: 10px; max-height: 250px; overflow-y: auto; color: #111111; }
        .notice-item { padding: 10px; border-bottom: 1px dashed rgba(0,0,0,0.1); font-size: 13px; color: #333333; }
        .notice-item a { color: __ACCENT_COLOR__; text-decoration: none; font-weight: bold; display: block; margin-top: 3px; }
        .student-page-wrapper { display: flex; justify-content: center; align-items: center; padding: 50px 20px; }
        .login-box-custom { width: 100%; max-width: 480px; background: #fff; border-radius: 4px; box-shadow: 0 2px 15px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #ccc; color: #111111; }
        .card-top-header { padding: 15px 20px; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #eee; background: #fff; }
        .login-logo-circle { width: 45px; height: 45px; background: #e0f2f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; color: #00796b; border: 1px solid #b2dfdb; overflow: hidden; }
        .school-title h1 { margin: 0; font-size: 14px; color: #111111; font-weight: bold; }
        .school-title h2 { margin: 2px 0 0; font-size: 11px; color: #555555; letter-spacing: 0.5px; }
        .tab-title { background-color: __ACCENT_COLOR__; color: white; padding: 12px 20px; font-weight: bold; font-size: 14px; display: flex; align-items: center; gap: 8px; }
        .form-content { background-color: #fff; padding: 25px; }
        .form-content label { display: block; margin-bottom: 6px; color: #111111; font-size: 12px; font-weight: bold; }
        .form-content select, .form-content input[type="text"], .form-content input[type="password"] { width: 100%; padding: 10px 12px; margin-bottom: 15px; background: #fff; border: 1px solid #ccc; color: #111111; border-radius: 4px; box-sizing: border-box; font-size: 14px; }
        .checkbox-group { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 13px; color: #333333; }
        .checkbox-group input { width: auto; margin: 0; }
        .btn-container { display: flex; justify-content: flex-end; }
        .login-btn { background-color: __ACCENT_COLOR__; color: white; padding: 8px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .forgot-pass { display: inline-block; color: #b71c1c; text-decoration: none; font-size: 13px; font-weight: bold; margin-top: 5px; }
        .msg { color: #d32f2f; background: #ffcdd2; padding: 10px; border-radius: 4px; text-align: center; margin-bottom: 15px; font-size: 13px; }
        .admin-page-wrapper { display: flex; justify-content: center; align-items: center; padding: 50px 20px; background: radial-gradient(circle, rgba(0,123,255,0.05) 0%, __BG_COLOR__ 100%); }
        .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .dash-input { width: 100%; padding: 10px; margin-bottom: 15px; background: #ffffff; border: 1px solid #cccccc; color: #111111; border-radius: 4px; box-sizing: border-box; }
        .dash-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .dash-table th, .dash-table td { border: 1px solid #dddddd; padding: 10px; text-align: left; font-size: 14px; color: #111111; }
        .dash-table th { background-color: __ACCENT_COLOR__; color: #ffffff; }
        .del-btn { background-color: #d32f2f; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .site-footer { text-align: center; padding: 20px; color: #111111; font-size: 13px; border-top: 1px solid #dddddd; margin-top: 40px; background: __HEADER_COLOR__; }
        .site-footer a { color: #111111; text-decoration: none; font-weight: bold; }
        .site-footer a:hover { text-decoration: underline; }
        @media(max-width: 768px) { .student-dashboard-wrapper { flex-direction: column; } .sidebar-menu { width: 100%; } .feature-grid { grid-template-columns: repeat(2, 1fr); } .dashboard-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="top-header">
        <div class="logo-area">
            <div class="logo-circle">
                __LOGO_CONTENT__
            </div>
            <div class="title-text">
                <h1>__SCHOOL_NAME__</h1>
                <h2>__TAGLINE__</h2>
            </div>
        </div>
        <div>
            __HEADER_RIGHT_BUTTONS__
        </div>
    </div>

    <div class="navbar">
        <a href="/">Home</a>
        <div class="nav-item">
            <a href="#">Subjects ▾</a>
            <div class="dropdown-content">
                __SUBJECTS_DROPDOWN_LINKS__
            </div>
        </div>
        <div class="nav-item">
            <a href="#">Login ▾</a>
            <div class="dropdown-content">
                <a href="/login?type=student">Student Login</a>
                <a href="/login?type=teacher">Teacher Login</a>
                <a href="/login?type=admin">Admin Login</a>
            </div>
        </div>
        <a href="/">Contact</a>
        __ADMIN_NAV_LINK__
    </div>
`;

const HTML_FOOTER = `
    <div class="site-footer">
        <span>&copy; 2026 <a href="https://www.nbd.dpdns.org/" target="_blank" rel="noopener noreferrer" style="font-weight:700;">Dev.Center</a> | Software by <strong>NIGHT CLOUD</strong></span>
    </div>
</body>
</html>
`;

function renderTemplate(contentBody, req) {
    let logoContent = portal_settings.logo_type === 'image' && portal_settings.logo_url 
        ? `<img src="${portal_settings.logo_url}" alt="Logo">` 
        : portal_settings.logo_text;

    let rightButtons = '';
    if (req.session && req.session.admin_logged) {
        rightButtons = `<span style="color: #111111; margin-right: 15px; font-size: 14px; font-weight: bold;">Admin Logged In</span>
                        <a href="/dashboard" class="header-btn">Dashboard</a>
                        <a href="/logout" class="header-btn" style="background-color: #d32f2f;">Logout</a>`;
    } else if (req.session && req.session.student_logged) {
        rightButtons = `<a href="/student_portal" class="header-btn">My Dashboard</a>
                        <a href="/logout" class="header-btn" style="background-color: #d32f2f;">Logout</a>`;
    } else if (req.session && req.session.teacher_logged) {
        rightButtons = `<a href="/teacher_portal" class="header-btn">Teacher Portal</a>
                        <a href="/logout" class="header-btn" style="background-color: #d32f2f;">Logout</a>`;
    } else {
        rightButtons = `<a href="/login?type=student" class="header-btn">Login</a>`;
    }

    let subLinks = subjects_list.map(sub => `<a href="/student_portal?tab=subjects">${sub.name}</a>`).join('');
    let adminNavLink = (req.session && req.session.admin_logged) ? `<a href="/dashboard" style="color: #111111; font-weight: bold;">Dashboard</a>` : '';

    let html = HTML_HEADER
        .replace(/__SCHOOL_NAME__/g, portal_settings.school_name)
        .replace(/__TAGLINE__/g, portal_settings.tagline)
        .replace(/__BG_COLOR__/g, portal_settings.bg_color)
        .replace(/__HEADER_COLOR__/g, portal_settings.header_color)
        .replace(/__ACCENT_COLOR__/g, portal_settings.accent_color)
        .replace('__LOGO_CONTENT__', logoContent)
        .replace('__HEADER_RIGHT_BUTTONS__', rightButtons)
        .replace('__SUBJECTS_DROPDOWN_LINKS__', subLinks)
        .replace('__ADMIN_NAV_LINK__', adminNavLink);

    html += contentBody;
    html += HTML_FOOTER.replace(/__SCHOOL_NAME__/g, portal_settings.school_name);
    return html;
}

// Routes
app.get('/', (req, res) => {
    let noticeItemsHtml = notice_board.map(n => `
        <div class="notice-item">
            ${n.text}
            <a href="#">বিস্তারিত পড়ুন &raquo;</a>
        </div>
    `).join('');

    let body = `
    <div class="main-container" style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
        <div class="card">
            <h3>${portal_settings.home_title}</h3>
            <p style="color: #333333; line-height: 1.6; white-space: pre-line;">
                ${portal_settings.home_description}
            </p>
            <h4 style="color: #111111; margin-top: 20px;">${portal_settings.home_feature_title}</h4>
            <ul style="color: #333333; line-height: 1.8;">
                <li>${portal_settings.home_feature_1}</li>
                <li>${portal_settings.home_feature_2}</li>
                <li>${portal_settings.home_feature_3}</li>
            </ul>
        </div>
        <div>
            <div class="notice-header">
                <span>স্কুল নোটিশ বোর্ড</span>
                <span style="font-size: 12px; cursor: pointer;">সব দেখুন ...</span>
            </div>
            <div class="notice-body">
                ${noticeItemsHtml}
            </div>
        </div>
    </div>`;
    res.send(renderTemplate(body, req));
});

app.get('/login', (req, res) => {
    let loginType = req.query.type || 'student';
    let msg = req.query.msg || '';

    let logoContent = portal_settings.logo_type === 'image' && portal_settings.logo_url 
        ? `<img src="${portal_settings.logo_url}" alt="Logo">` 
        : portal_settings.logo_text;

    let body = '';
    if (loginType === 'student') {
        let roomOptions = '';
        for(let i=1; i<=10; i++) roomOptions += `<option value="Room ${i}">Room ${i}</option>`;

        body = `
        <div class="student-page-wrapper">
            <div class="login-box-custom">
                <div class="card-top-header">
                    <div class="login-logo-circle">${logoContent}</div>
                    <div class="school-title">
                        <h1>${portal_settings.school_name}</h1>
                        <h2>PORTAL LOGIN (CLASS 1 - 10)</h2>
                    </div>
                </div>
                <div class="tab-title"><span>👤</span> STUDENT / PARENT'S LOGIN</div>
                <div class="form-content" style="background-color: #ffffdd;">
                    ${msg ? `<div class="msg">${msg}</div>` : ''}
                    <form method="POST">
                        <label>ROOM NUMBER:</label>
                        <select name="room">${roomOptions}</select>
                        <label>USER ID OR STUDENT ID NO:</label>
                        <input type="text" name="username" placeholder="Enter User ID or Student ID No" required>
                        <label>PASSWORD:</label>
                        <input type="password" name="password" placeholder="Enter Password" required>
                        <div class="checkbox-group">
                            <input type="checkbox" id="show-pass" onclick="togglePassword()">
                            <label for="show-pass" style="display:inline; margin:0; font-weight:normal; text-transform:none;">Show Password 👁</label>
                        </div>
                        <div class="btn-container">
                            <button type="submit" class="login-btn">Log In</button>
                        </div>
                    </form>
                    <a href="#" class="forgot-pass">Forgot Password?</a>
                </div>
            </div>
        </div>
        <script>
            function togglePassword() {
                var passInput = document.querySelector('input[name="password"]');
                passInput.type = passInput.type === "password" ? "text" : "password";
            }
        </script>`;
    } else if (loginType === 'teacher') {
        body = `
        <div class="student-page-wrapper">
            <div class="login-box-custom">
                <div class="card-top-header">
                    <div class="login-logo-circle">${logoContent}</div>
                    <div class="school-title">
                        <h1>${portal_settings.school_name}</h1>
                        <h2>TEACHER PORTAL LOGIN</h2>
                    </div>
                </div>
                <div class="tab-title" style="background-color: #00796b;"><span>👨‍🏫</span> TEACHER ACCOUNT LOGIN</div>
                <div class="form-content" style="background-color: #e0f2f1;">
                    ${msg ? `<div class="msg">${msg}</div>` : ''}
                    <form method="POST">
                        <label>TEACHER USER ID:</label>
                        <input type="text" name="username" placeholder="Enter Teacher ID" required>
                        <label>PASSWORD:</label>
                        <input type="password" name="password" placeholder="Enter Password" required>
                        <div class="checkbox-group">
                            <input type="checkbox" id="show-pass" onclick="togglePassword()">
                            <label for="show-pass" style="display:inline; margin:0; font-weight:normal; text-transform:none;">Show Password 👁</label>
                        </div>
                        <div class="btn-container">
                            <button type="submit" class="login-btn" style="background-color: #00796b;">Teacher Log In</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <script>
            function togglePassword() {
                var passInput = document.querySelector('input[name="password"]');
                passInput.type = passInput.type === "password" ? "text" : "password";
            }
        </script>`;
    } else {
        body = `
        <div class="admin-page-wrapper">
            <div class="login-box-custom">
                <div class="card-top-header">
                    <div class="login-logo-circle">${logoContent}</div>
                    <div class="school-title">
                        <h1>${portal_settings.school_name}</h1>
                        <h2>ADMIN LOGIN</h2>
                    </div>
                </div>
                <div class="tab-title" style="background-color: ${portal_settings.accent_color};"><span>👤</span> ADMIN LOGIN PANEL</div>
                <div class="form-content">
                    ${msg ? `<div class="msg">${msg}</div>` : ''}
                    <form method="POST">
                        <label>Username:</label>
                        <input type="text" name="username" placeholder="Username" required style="background:#fff; color:#333; border:1px solid #ccc;">
                        <label>Password:</label>
                        <input type="password" name="password" placeholder="Password" required style="background:#fff; color:#333; border:1px solid #ccc;">
                        <div class="checkbox-group">
                            <input type="checkbox" id="show-pass" onclick="toggleAdminPassword()">
                            <label for="show-pass" style="display:inline; margin:0; font-weight:normal; text-transform:none;">Show Password 👁</label>
                        </div>
                        <div class="btn-container">
                            <button type="submit" class="login-btn">Log In</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <script>
            function toggleAdminPassword() {
                var passInput = document.querySelector('input[name="password"]');
                passInput.type = passInput.type === "password" ? "text" : "password";
            }
        </script>`;
    }
    res.send(renderTemplate(body, req));
});

app.post('/login', (req, res) => {
    let loginType = req.query.type || 'student';
    let { username, password, room } = req.body;
    let msg = '';

    if (loginType === 'admin') {
        if (username === ADMIN_USER && password === ADMIN_PASS) {
            req.session.admin_logged = true;
            return res.redirect('/dashboard');
        } else {
            msg = 'Invalid Username or Password!';
        }
    } else if (loginType === 'teacher') {
        let teacherFound = teachers_list.find(t => t.id === username && t.pass === password);
        if (teacherFound) {
            req.session.teacher_logged = teacherFound.id;
            return res.redirect('/teacher_portal');
        } else {
            msg = 'Incorrect Teacher ID or Password!';
        }
    } else {
        let studentFound = students_list.find(s => (s.id === username || s.student_no === username) && s.pass === password);
        if (studentFound) {
            if (studentFound.room === room) {
                req.session.student_logged = studentFound.id;
                return res.redirect('/student_portal');
            } else {
                msg = `Incorrect Room! This student belongs to ${studentFound.room}.`;
            }
        } else {
            msg = 'Incorrect User ID, Student ID Number, or Password!';
        }
    }
    res.redirect(`/login?type=${loginType}&msg=${encodeURIComponent(msg)}`);
});

// Teacher Portal
app.get('/teacher_portal', (req, res) => {
    if (!req.session.teacher_logged) return res.redirect('/login?type=teacher');
    let teacher = teachers_list.find(t => t.id === req.session.teacher_logged);
    if (!teacher) return res.redirect('/logout');

    let subTab = req.query.subtab || 'dashboard';
    let msg = req.query.msg || '';
    let body = '';

    if (subTab === 'upload_marks') {
        let selectedRoom = req.query.room || 'Room 1';
        let selectedSubject = req.query.subject || teacher.subject;
        let activeExam = getActiveExam();
        
        let roomOptions = '';
        for(let i=1; i<=10; i++) {
            let rName = `Room ${i}`;
            roomOptions += `<option value="${rName}" ${selectedRoom === rName ? 'selected' : ''}>${rName}</option>`;
        }

        // Get students sorted by roll number for the selected room
        let roomStudents = students_list
            .filter(s => s.room === selectedRoom)
            .sort((a, b) => parseInt(a.roll) - parseInt(b.roll));

        let studentMarkRows = '';
        if (roomStudents.length > 0) {
            roomStudents.forEach(st => {
                let examSubjectMarks = activeExam ? getExamMarks(activeExam.id, selectedRoom, selectedSubject) : {};
                let existingMark = examSubjectMarks[st.roll] || { written: '', mcq: '' };

                studentMarkRows += `
                <tr>
                    <td style="text-align:center; font-weight:bold;">${st.roll}</td>
                    <td style="font-weight:bold;">${st.name}</td>
                    <td>${st.student_no}</td>
                    <td><input type="number" name="marks_${st.roll}_written" value="${existingMark.written}" class="dash-input" style="margin-bottom:0;" placeholder="0-100" min="0" max="100"></td>
                    <td><input type="number" name="marks_${st.roll}_mcq" value="${existingMark.mcq}" class="dash-input" style="margin-bottom:0;" placeholder="0-50" min="0" max="50"></td>
                </tr>`;
            });
        } else {
            studentMarkRows = `<tr><td colspan="5" style="text-align:center; color:#555;">No students found registered in ${selectedRoom}.</td></tr>`;
        }

        body = `
        <div class="main-container">
            <div class="student-dashboard-wrapper">
                <div class="sidebar-menu" style="background-color: #00796b;">
                    <a href="/teacher_portal" class="sidebar-item">👨‍🏫 Teacher Dashboard</a>
                    <a href="/teacher_portal?subtab=upload_marks" class="sidebar-item" style="background: rgba(0,0,0,0.1); font-weight: bold;">📝 Upload Marks / Results</a>
                    <a href="#" class="sidebar-item">📋 Attendance Sheet</a>
                    <a href="#" class="sidebar-item">📢 Notice Board</a>
                </div>
                <div class="profile-content-area">
                    <div class="student-id-banner" style="background-color: #00796b;">${activeExam ? `${activeExam.title} - Upload Marks & Results` : 'Marks & Results'}</div>
                    ${activeExam ? `<div style="margin:0; padding:10px 15px; background:#e8f5e9; color:#1b5e20; font-weight:bold; text-align:center;">🟢 Active Exam: ${activeExam.title}</div>` : `<div style="margin:0; padding:10px 15px; background:#fff3cd; color:#856404; font-weight:bold; text-align:center;">⚠️ No examination is currently active. Admin must start an exam before marks can be uploaded.</div>`}
                    <div style="padding: 25px;">
                        ${msg ? `<div style="background:#d4edda; color:#155724; padding:10px; border-radius:4px; margin-bottom:15px; font-weight:bold;">${msg}</div>` : ''}
                        
                        <form method="GET" action="/teacher_portal" style="display: flex; gap: 15px; align-items: flex-end; margin-bottom: 25px; background: rgba(0,0,0,0.03); padding: 15px; border-radius: 6px;">
                            <input type="hidden" name="subtab" value="upload_marks">
                            <div style="flex-grow: 1;">
                                <label style="display:block; margin-bottom:5px; font-size:12px; font-weight:bold;">Select Room:</label>
                                <select name="room" class="dash-input" style="margin-bottom:0;" onchange="this.form.submit()">${roomOptions}</select>
                            </div>
                            <div style="flex-grow: 1;">
                                <label style="display:block; margin-bottom:5px; font-size:12px; font-weight:bold;">Select Subject:</label>
                                <input type="text" name="subject" class="dash-input" value="${selectedSubject}" readonly style="margin-bottom:0; background:#eee;">
                            </div>
                        </form>

                        <form method="POST" action="/teacher_portal/save_marks">
                            <input type="hidden" name="room" value="${selectedRoom}">
                            <input type="hidden" name="subject" value="${selectedSubject}">
                            <input type="hidden" name="exam_id" value="${activeExam ? activeExam.id : ''}">
                            
                            <table class="dash-table">
                                <tr>
                                    <th style="width: 70px; text-align: center;">Roll</th>
                                    <th>Student Name</th>
                                    <th>Student ID No</th>
                                    <th style="width: 130px;">Written Mark</th>
                                    <th style="width: 130px;">MCQ Mark</th>
                                </tr>
                                ${studentMarkRows}
                            </table>
                            ${roomStudents.length > 0 && activeExam ? `<button type="submit" class="header-btn" style="cursor:pointer; border:none; margin-top:20px; background-color:#00796b; padding: 12px 25px; font-size:14px;">Save Marks for ${selectedRoom} - ${activeExam.title}</button>` : ''}
                        </form>
                    </div>
                </div>
            </div>
        </div>`;
    } else {
        body = `
        <div class="main-container">
            <div class="student-dashboard-wrapper">
                <div class="sidebar-menu" style="background-color: #00796b;">
                    <a href="/teacher_portal" class="sidebar-item" style="background: rgba(0,0,0,0.1); font-weight: bold;">👨‍🏫 Teacher Dashboard</a>
                    <a href="/teacher_portal?subtab=upload_marks" class="sidebar-item">📝 Upload Marks / Results</a>
                    <a href="#" class="sidebar-item">📋 Attendance Sheet</a>
                    <a href="#" class="sidebar-item">📢 Notice Board</a>
                </div>
                <div class="profile-content-area">
                    <div class="student-id-banner" style="background-color: #00796b;">Teacher Portal ID # ${teacher.id}</div>
                    <div class="class-section-row">
                        <div class="class-col" style="background-color: #00897b;">Subject: ${teacher.subject}</div>
                        <div class="section-col" style="background: #00695c;">Phone: ${teacher.phone}</div>
                    </div>
                    <div class="student-photo-container">
                        <div class="student-avatar" style="border-color: #00796b; color: #00796b;">👨‍🏫</div>
                    </div>
                    <div class="student-name-banner" style="background-color: #00796b;">${teacher.name}</div>
                    <div style="padding: 25px; color: #111111;">
                        <h3 style="color: #00796b; margin-top:0;">Welcome, Professor ${teacher.name}!</h3>
                        <p style="font-size: 14px; line-height: 1.6;">
                            You are successfully logged into the official ${portal_settings.school_name} Teacher Management Portal. From here you can check your assigned subject (<strong>${teacher.subject}</strong>), select rooms, and upload student marks sequentially by roll number.
                        </p>
                        <a href="/teacher_portal?subtab=upload_marks" class="header-btn" style="background-color: #00796b; margin-top: 15px; display:inline-block;">Go to Mark Upload Panel &raquo;</a>
                    </div>
                </div>
            </div>
        </div>`;
    }
    res.send(renderTemplate(body, req));
});

app.post('/teacher_portal/save_marks', (req, res) => {
    if (!req.session.teacher_logged) return res.redirect('/login?type=teacher');
    let { room, subject, exam_id } = req.body;
    let activeExam = getActiveExam();
    if (!activeExam || exam_id !== activeExam.id) {
        return res.redirect('/teacher_portal?subtab=upload_marks&msg=' + encodeURIComponent('No active exam. Admin must start an exam before marks can be uploaded.'));
    }

    let subjectMarks = getExamMarks(activeExam.id, room, subject);

    let roomStudents = students_list.filter(s => s.room === room);
    roomStudents.forEach(st => {
        let written = parseFloat(req.body[`marks_${st.roll}_written`]) || 0;
        let mcq = parseFloat(req.body[`marks_${st.roll}_mcq`]) || 0;
        let total = written + mcq;
        let grade = "F";
        if (total >= 80) grade = "A+";
        else if (total >= 70) grade = "A";
        else if (total >= 60) grade = "A-";
        else if (total >= 50) grade = "B";
        else if (total >= 40) grade = "C";
        else if (total >= 33) grade = "D";

        subjectMarks[st.roll] = { written, mcq, total, grade };
    });

    res.redirect(`/teacher_portal?subtab=upload_marks&room=${encodeURIComponent(room)}&subject=${encodeURIComponent(subject)}&msg=${encodeURIComponent('Marks successfully uploaded and saved for ' + room + '!')}`);
});

// Student Portal
app.get('/student_portal', (req, res) => {
    if (!req.session.student_logged) return res.redirect('/login?type=student');
    let student = students_list.find(s => s.id === req.session.student_logged);
    if (!student) return res.redirect('/logout');

    let tab = req.query.tab || 'profile';
    let msg = req.query.msg || '';
    let body = '';

    if (tab === 'subjects') {
        let rows = subjects_list.map(sub => `
            <tr>
                <td style="text-align: center; font-weight: bold;">${sub.sl}</td>
                <td style="font-weight: bold; color: #111111;">${sub.name}</td>
                <td style="white-space: pre-line; font-size: 13px; color: #333333;">${sub.teacher}</td>
            </tr>`).join('');

        body = `
        <div class="main-container">
            <div class="student-dashboard-wrapper">
                <div class="sidebar-menu">
                    <a href="/student_portal?tab=profile" class="sidebar-item">🏠 Dashboard Profile</a>
                    <a href="/student_portal?tab=subjects" class="sidebar-item" style="background: rgba(0,0,0,0.1); font-weight: bold;">📚 My Subjects & Teachers</a>
                    <a href="/student_portal?tab=results" class="sidebar-item">📊 My Result & PDF Sheet</a>
                    <a href="/student_portal?tab=change_password" class="sidebar-item">🔐 Change Password</a>
                    <a href="#" class="sidebar-item">💵 Tuition Fees</a>
                    <a href="#" class="sidebar-item">🌐 Online Live Class</a>
                    <a href="#" class="sidebar-item">📝 Online Exam</a>
                    <a href="#" class="sidebar-item">💻 E-Learning</a>
                    <a href="#" class="sidebar-item">📋 Homeworks</a>
                    <a href="/student_portal?tab=admit_card" class="sidebar-item">💳 Admit Card</a>
                </div>
                <div class="profile-content-area">
                    <div class="student-id-banner">Subjects & Assigned Teachers (${portal_settings.school_name})</div>
                    <div style="padding: 20px;">
                        <table class="dash-table" style="color: #111111;">
                            <tr>
                                <th style="width: 60px; background-color: ${portal_settings.accent_color};">SI</th>
                                <th style="background-color: ${portal_settings.accent_color};">Subject Name</th>
                                <th style="background-color: ${portal_settings.accent_color};">Assigned Teacher & Contact</th>
                            </tr>
                            ${rows}
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
    } else if (tab === 'results') {
        const publishedExams = EXAMS.filter(exam => exam_state[exam.id].published);
        const activeExam = getActiveExam();
        let rows = publishedExams.map((exam, idx) => {
            const state = exam_state[exam.id];
            return `<tr>
                <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
                <td style="font-weight:bold;">${exam.title}</td>
                <td style="text-align:center; color:#1b8f3b; font-weight:bold;">☑ Published On: ${formatExamDate(state.publishedAt)}</td>
                <td style="text-align:center;"><a href="/student_portal/download_result_pdf?exam=${encodeURIComponent(exam.id)}" target="_blank" style="color:#d60000; font-weight:bold; text-decoration:none;">▧<br>Download</a></td>
                <td style="text-align:center;"><a href="/student_portal?tab=result_view&exam=${encodeURIComponent(exam.id)}" style="color:#174ea6; font-weight:bold; text-decoration:none;">⌕<br>View</a></td>
            </tr>`;
        }).join('');

        if (!rows) {
            rows = `<tr><td colspan="5" style="text-align:center; padding:35px; color:#777;">No examination result has been published yet.</td></tr>`;
        }

        body = `
        <div class="main-container" style="max-width:1100px;">
            <div class="student-dashboard-wrapper">
                <div class="sidebar-menu">
                    <a href="/student_portal?tab=profile" class="sidebar-item">🏠 Dashboard Profile</a>
                    <a href="/student_portal?tab=subjects" class="sidebar-item">📚 My Subjects & Teachers</a>
                    <a href="/student_portal?tab=results" class="sidebar-item" style="background: rgba(0,0,0,0.1); font-weight:bold;">📊 Result & Progress Report</a>
                    <a href="/student_portal?tab=admit_card" class="sidebar-item">💳 Admit Card</a>
                    <a href="/student_portal?tab=change_password" class="sidebar-item">🔐 Change Password</a>
                </div>
                <div class="profile-content-area">
                    <div style="padding:18px 12px 0;">
                        <h3 style="margin:0; border-bottom:2px solid ${portal_settings.accent_color}; padding-bottom:7px;">📊 Result & Progress Report</h3>
                        <div style="overflow-x:auto;">
                        <table class="dash-table" style="margin-top:8px;">
                            <tr><th style="width:55px; text-align:center;">SI</th><th>Exam Title</th><th style="width:230px;">Status</th><th style="width:90px; text-align:center;">PDF</th><th style="width:120px; text-align:center;">View Result</th></tr>
                            ${rows}
                        </table>
                        </div>
                        ${activeExam ? `<div style="margin-top:15px; padding:10px; background:#e8f5e9; color:#1b5e20; font-weight:bold;">Current Examination: ${activeExam.title}</div>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
    } else if (tab === 'result_view') {
        const examId = req.query.exam;
        const exam = getExam(examId);
        if (!exam || !exam_state[exam.id].published) {
            return res.redirect('/student_portal?tab=results');
        }
        const studentExamMarks = (marks_db[exam.id] && marks_db[exam.id][student.room]) ? marks_db[exam.id][student.room] : {};
        let resultRows = '';
        let totalMarksSum = 0;
        let countSubs = 0;
        subjects_list.forEach(sub => {
            const m = studentExamMarks[sub.name] && studentExamMarks[sub.name][student.roll] ? studentExamMarks[sub.name][student.roll] : null;
            if (m) { totalMarksSum += Number(m.total) || 0; }
            countSubs++;
            resultRows += `<tr><td style="font-weight:bold;">${sub.name}</td><td style="text-align:center;">${m ? m.written : '-'}</td><td style="text-align:center;">${m ? m.mcq : '-'}</td><td style="text-align:center;font-weight:bold;">${m ? m.total : '-'}</td><td style="text-align:center;font-weight:bold;">${m ? m.grade : '-'}</td></tr>`;
        });
        const avg = countSubs ? (totalMarksSum / countSubs).toFixed(2) : '0.00';
        body = `
        <div class="main-container">
            <div class="profile-content-area" style="max-width:920px;margin:0 auto;">
                <div style="padding:18px 12px 0;">
                    <h3 style="margin:0;border-bottom:2px solid ${portal_settings.accent_color};padding-bottom:7px;">📊 Result & Progress Report</h3>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;gap:10px;flex-wrap:wrap;">
                        <strong>${exam.title} - 2026</strong>
                        <a href="/student_portal?tab=results" class="header-btn">◀ Back</a>
                    </div>
                    <table class="dash-table"><tr><th>Subject Name</th><th style="text-align:center;">Written</th><th style="text-align:center;">MCQ</th><th style="text-align:center;">Total</th><th style="text-align:center;">Grade</th></tr>${resultRows}</table>
                    <p style="padding:10px;font-weight:bold;">Total: ${totalMarksSum} &nbsp; | &nbsp; Average: ${avg}</p>
                </div>
            </div>
        </div>`;
    } else if (tab === 'admit_card') {
        const activeExam = getActiveExam();
        if (!activeExam) {
            body = `<div class="main-container"><div class="profile-content-area" style="max-width:900px;margin:0 auto;padding:35px;text-align:center;"><h3>ADMIT CARD</h3><p style="color:#b71c1c;font-weight:bold;">No examination is currently active. Please check again after the administration starts an exam.</p></div></div>`;
        } else {
            const photoHtml = student.photo ? `<img src="${student.photo}" alt="Student Photo" style="width:100%;height:100%;object-fit:cover;">` : '👤';
            body = `<div class="main-container" style="max-width:900px;">
                <div class="profile-content-area" style="padding:0;">
                    <div style="padding:10px 12px 0;"><h3 style="margin:0;border-bottom:2px solid ${portal_settings.accent_color};padding-bottom:7px;">ADMIT CARD</h3></div>
                    <div style="padding:0 18px 25px;">
                        <div style="text-align:center;margin:0 0 8px;"><a href="/student_portal/download_admit_card" target="_blank" class="header-btn" style="background:#2e8b37;">Print Admit Card</a></div>
                        <div class="admit-card-print" style="width:460px;max-width:100%;margin:0 auto;border:2px solid #111;padding:6px;background:#fff;color:#111;box-sizing:border-box;">
                            <div style="text-align:center;border-bottom:1px solid #999;padding-bottom:7px;">
                                <div style="font-weight:bold;font-size:18px;color:#16853a;">${portal_settings.school_name}</div>
                                <div style="font-size:11px;font-weight:bold;color:#d00;">${portal_settings.tagline}</div>
                            </div>
                            <div style="text-align:center;padding:10px 0 5px;"><div style="width:58px;height:72px;border:1px solid #777;margin:0 auto 8px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:25px;">${photoHtml}</div><div style="font-size:16px;color:#0000aa;font-weight:bold;">ADMIT CARD</div><div style="font-size:14px;color:#0000aa;font-weight:bold;">${activeExam.title.toUpperCase()} - 2026</div></div>
                            <table style="width:100%;border-collapse:collapse;font-size:10px;"><tr><td style="border:1px solid #999;padding:4px;">Student's Name: <b>${student.name}</b></td><td style="border:1px solid #999;padding:4px;">Roll Number: <b>${student.roll}</b></td></tr><tr><td style="border:1px solid #999;padding:4px;">Student ID: <b>${student.student_no}</b></td><td style="border:1px solid #999;padding:4px;">Section: <b>${student.section || student.room}</b></td></tr><tr><td style="border:1px solid #999;padding:4px;">Class: <b>${student.class}</b></td><td style="border:1px solid #999;padding:4px;">Shift: <b>${student.shift || 'Day'}</b></td></tr></table>
                            <div style="text-align:right;padding:18px 12px 6px;font-size:9px;font-weight:bold;"><span>________________<br>Principal</span></div>
                            <div style="background:#000;color:#fff;text-align:center;padding:5px;font-weight:bold;font-size:13px;"><a href="https://www.nbd.dpdns.org/" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;">Dev.Center</a></div>
                        </div>
                    </div>
                </div>
            </div>`;
        }
    } else if (tab === 'change_password') {
        body = `
        <div class="main-container">
            <div class="student-dashboard-wrapper">
                <div class="sidebar-menu">
                    <a href="/student_portal?tab=profile" class="sidebar-item">🏠 Dashboard Profile</a>
                    <a href="/student_portal?tab=subjects" class="sidebar-item">📚 My Subjects & Teachers</a>
                    <a href="/student_portal?tab=results" class="sidebar-item">📊 My Result & PDF Sheet</a>
                    <a href="/student_portal?tab=change_password" class="sidebar-item" style="background: rgba(0,0,0,0.1); font-weight: bold;">🔐 Change Password</a>
                    <a href="#" class="sidebar-item">💵 Tuition Fees</a>
                    <a href="#" class="sidebar-item">🌐 Online Live Class</a>
                    <a href="#" class="sidebar-item">📝 Online Exam</a>
                    <a href="#" class="sidebar-item">💻 E-Learning</a>
                    <a href="#" class="sidebar-item">📋 Homeworks</a>
                    <a href="/student_portal?tab=admit_card" class="sidebar-item">💳 Admit Card</a>
                </div>
                <div class="profile-content-area">
                    <div class="student-id-banner">Change Portal Password</div>
                    <div style="padding: 30px;">
                        ${msg ? `<div class="${msg.includes('success') ? '' : 'msg'}" style="${msg.includes('success') ? 'background:#d4edda; color:#155724; padding:10px; border-radius:4px; margin-bottom:15px;' : ''}">${msg}</div>` : ''}
                        <form method="POST" action="/student_portal/change_password" style="max-width: 400px;">
                            <label style="display:block; margin-bottom:6px; font-weight:bold; font-size:13px;">Current Password:</label>
                            <input type="password" name="old_password" class="dash-input" placeholder="Enter current password" required>
                            
                            <label style="display:block; margin-bottom:6px; font-weight:bold; font-size:13px;">New Password:</label>
                            <input type="password" name="new_password" class="dash-input" placeholder="Enter new password" required>
                            
                            <label style="display:block; margin-bottom:6px; font-weight:bold; font-size:13px;">Confirm New Password:</label>
                            <input type="password" name="confirm_password" class="dash-input" placeholder="Confirm new password" required>

                            <button type="submit" class="header-btn" style="cursor:pointer; border:none; margin-top:10px; padding: 10px 20px;">Update Password</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;
    } else {
        let photoHtml = student.photo ? `<img src="${student.photo}" alt="Student Photo">` : '👤';
        body = `
        <div class="main-container">
            <div class="student-dashboard-wrapper">
                <div class="sidebar-menu">
                    <a href="/student_portal?tab=profile" class="sidebar-item" style="background: rgba(0,0,0,0.1); font-weight: bold;">🏠 Dashboard Profile</a>
                    <a href="/student_portal?tab=subjects" class="sidebar-item">📚 My Subjects & Teachers</a>
                    <a href="/student_portal?tab=results" class="sidebar-item">📊 My Result & PDF Sheet</a>
                    <a href="/student_portal?tab=change_password" class="sidebar-item">🔐 Change Password</a>
                    <a href="#" class="sidebar-item">💵 Tuition Fees</a>
                    <a href="#" class="sidebar-item">🌐 Online Live Class</a>
                    <a href="#" class="sidebar-item">📝 Online Exam</a>
                    <a href="#" class="sidebar-item">💻 E-Learning</a>
                    <a href="#" class="sidebar-item">📋 Homeworks</a>
                    <a href="/student_portal?tab=admit_card" class="sidebar-item">💳 Admit Card</a>
                </div>
                <div class="profile-content-area">
                    <div class="student-id-banner">Student ID # ${student.student_no}</div>
                    <div class="class-section-row">
                        <div class="class-col">Class: ${student.class}</div>
                        <div class="section-col">Room: ${student.room}</div>
                    </div>
                    <div class="student-photo-container">
                        <div class="student-avatar">${photoHtml}</div>
                    </div>
                    <div class="student-name-banner">${student.name}</div>
                    <div class="feature-grid">
                        <a href="/student_portal?tab=profile" class="feature-box">
                            <div class="feature-icon" style="background: #e67e22;">👤</div>
                            <div class="feature-title">My Profile</div>
                        </a>
                        <a href="/student_portal?tab=results" class="feature-box">
                            <div class="feature-icon" style="background: #27ae60;">📊</div>
                            <div class="feature-title">My Result</div>
                        </a>
                        <a href="/student_portal?tab=admit_card" class="feature-box">
                            <div class="feature-icon" style="background: #2e8b57;">💳</div>
                            <div class="feature-title">Admit Card</div>
                        </a>
                        <a href="/student_portal?tab=change_password" class="feature-box">
                            <div class="feature-icon" style="background: #c0392b;">🔐</div>
                            <div class="feature-title">Change Password</div>
                        </a>
                        <a href="/student_portal?tab=subjects" class="feature-box">
                            <div class="feature-icon" style="background: #2980b9;">📚</div>
                            <div class="feature-title">My Subjects & Teachers</div>
                        </a>
                        <a href="#" class="feature-box">
                            <div class="feature-icon" style="background: #16a085;">🌐</div>
                            <div class="feature-title">Online Live Class</div>
                        </a>
                        <a href="#" class="feature-box">
                            <div class="feature-icon" style="background: #8e44ad;">📝</div>
                            <div class="feature-title">Online Exam</div>
                        </a>
                        <a href="#" class="feature-box">
                            <div class="feature-icon" style="background: #d35400;">💻</div>
                            <div class="feature-title">E-Learning</div>
                        </a>
                        <a href="#" class="feature-box">
                            <div class="feature-icon" style="background: #27ae60;">📋</div>
                            <div class="feature-title">Homeworks</div>
                        </a>
                    </div>
                </div>
            </div>
        </div>`;
    }
    res.send(renderTemplate(body, req));
});

// Printable result sheet for a published exam
app.get('/student_portal/download_result_pdf', (req, res) => {
    if (!req.session.student_logged) return res.redirect('/login?type=student');
    let student = students_list.find(s => s.id === req.session.student_logged);
    if (!student) return res.redirect('/logout');
    const exam = getExam(req.query.exam);
    if (!exam || !exam_state[exam.id].published) return res.redirect('/student_portal?tab=results');

    let studentRoomMarks = (marks_db[exam.id] && marks_db[exam.id][student.room]) ? marks_db[exam.id][student.room] : {};
    let tableRows = '';
    let totalMarksSum = 0;
    let countSubs = 0;
    subjects_list.forEach(sub => {
        let m = (studentRoomMarks[sub.name] && studentRoomMarks[sub.name][student.roll]) ? studentRoomMarks[sub.name][student.roll] : { written: 0, mcq: 0, total: 0, grade: '-' };
        totalMarksSum += Number(m.total) || 0; countSubs++;
        tableRows += `<tr><td>${sub.name}</td><td style="text-align:center;">${m.written}</td><td style="text-align:center;">${m.mcq}</td><td style="text-align:center;font-weight:bold;">${m.total}</td><td style="text-align:center;font-weight:bold;">${m.grade}</td></tr>`;
    });
    const avg = countSubs ? (totalMarksSum / countSubs).toFixed(2) : '0.00';
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${exam.title} - Result - ${student.name}</title><style>body{font-family:Arial,sans-serif;padding:35px;color:#111}.header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px}.info{margin:18px 0;font-size:14px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:8px}th{background:#333;color:#fff}.footer{display:flex;justify-content:space-between;margin-top:70px;font-weight:bold}@media print{.no-print{display:none}}</style></head><body onload="window.print()"><div class="header"><h2 style="margin:0">${portal_settings.school_name}</h2><p style="margin:5px 0;color:#555">${portal_settings.tagline}</p><h3>${exam.title.toUpperCase()} - 2026</h3><strong>RESULT & PROGRESS REPORT</strong></div><div class="info"><b>Student Name:</b> ${student.name}<br><b>Roll Number:</b> ${student.roll} &nbsp; | &nbsp; <b>Student ID:</b> ${student.student_no}<br><b>Class:</b> ${student.class} &nbsp; | &nbsp; <b>Room:</b> ${student.room}</div><table><tr><th>Subject Name</th><th>Written</th><th>MCQ</th><th>Total</th><th>Grade</th></tr>${tableRows}</table><p><b>Total Aggregate Score:</b> ${totalMarksSum} &nbsp; | &nbsp; <b>Average:</b> ${avg}</p><div class="footer"><div>____________________<br>Class Teacher</div><div>____________________<br>Principal</div></div><p style="text-align:center;margin-top:35px;font-weight:bold;"><a href="https://www.nbd.dpdns.org/" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;">Dev.Center</a> | Software by <strong>NIGHT CLOUD</strong></p></body></html>`);
});

// Printable admit card for the currently active exam
app.get('/student_portal/download_admit_card', (req, res) => {
    if (!req.session.student_logged) return res.redirect('/login?type=student');
    let student = students_list.find(s => s.id === req.session.student_logged);
    const exam = getActiveExam();
    if (!student) return res.redirect('/logout');
    if (!exam) return res.redirect('/student_portal?tab=admit_card');
    const photoHtml = student.photo ? `<img src="${student.photo}" style="width:100%;height:100%;object-fit:cover;">` : '👤';
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admit Card - ${student.name}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111}.card{width:470px;max-width:100%;margin:0 auto;border:2px solid #111;padding:7px;box-sizing:border-box}.photo{width:58px;height:72px;border:1px solid #777;margin:0 auto 8px;overflow:hidden;display:flex;align-items:center;justify-content:center}.info{width:100%;border-collapse:collapse;font-size:11px}.info td{border:1px solid #999;padding:5px}.sign{display:flex;justify-content:space-between;margin-top:20px;font-size:10px;font-weight:bold}.brand{background:#000;color:#fff;text-align:center;padding:6px;font-weight:bold}@media print{.no-print{display:none}}</style></head><body onload="window.print()"><div class="no-print" style="text-align:center;margin-bottom:10px"><button onclick="window.print()">Print / Save PDF</button></div><div class="card"><div style="text-align:center;border-bottom:1px solid #999;padding-bottom:7px"><div style="font-weight:bold;font-size:18px;color:#16853a">${portal_settings.school_name}</div><div style="font-size:11px;color:#d00;font-weight:bold">${portal_settings.tagline}</div></div><div style="text-align:center;padding:10px 0 5px"><div class="photo">${photoHtml}</div><div style="font-size:16px;color:#0000aa;font-weight:bold">ADMIT CARD</div><div style="font-size:14px;color:#0000aa;font-weight:bold">${exam.title.toUpperCase()} - 2026</div></div><table class="info"><tr><td>Student's Name: <b>${student.name}</b></td><td>Roll Number: <b>${student.roll}</b></td></tr><tr><td>Student ID: <b>${student.student_no}</b></td><td>Section: <b>${student.section || student.room}</b></td></tr><tr><td>Class: <b>${student.class}</b></td><td>Shift: <b>${student.shift || 'Day'}</b></td></tr></table><div class="sign" style="justify-content:flex-end"><span>________________<br>Principal</span></div><div class="brand"><a href="https://www.nbd.dpdns.org/" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;">Dev.Center</a></div></div></body></html>`);
});

app.post('/student_portal/change_password', (req, res) => {
    if (!req.session.student_logged) return res.redirect('/login?type=student');
    let student = students_list.find(s => s.id === req.session.student_logged);
    if (!student) return res.redirect('/logout');

    let { old_password, new_password, confirm_password } = req.body;
    let msg = '';

    if (student.pass !== old_password) {
        msg = 'Incorrect current password!';
    } else if (new_password !== confirm_password) {
        msg = 'New password and confirm password do not match!';
    } else if (!new_password || new_password.length < 3) {
        msg = 'New password must be at least 3 characters long!';
    } else {
        student.pass = new_password;
        msg = 'Password changed successfully!';
    }

    res.redirect(`/student_portal?tab=change_password&msg=${encodeURIComponent(msg)}`);
});

// Admin Dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.admin_logged) return res.redirect('/login?type=admin');
    let successMsg = req.query.msg || '';
    let aiResponse = req.query.ai_response || '';

    let presetOptions = Object.keys(PRESET_THEMES).map(key => `<option value="${key}">${PRESET_THEMES[key].name}</option>`).join('');
    let teacherSelectOptions = teachers_list.length > 0 
        ? teachers_list.map(t => `<option value="${t.id}">${t.name} (${t.subject}) - Ph: ${t.phone}</option>`).join('')
        : '<option value="">-- No Teachers Available (Create one first) --</option>';
    let studentSelectOptions = students_list.length > 0 
        ? students_list.map(s => `<option value="${s.roll}">Roll: ${s.roll} - ${s.name} (Class: ${s.class})</option>`).join('')
        : '<option value="">-- No Students Available --</option>';

    let teachersRows = teachers_list.length > 0 ? teachers_list.map(t => `
        <tr>
            <td style="text-align: center;"><input type="checkbox" name="selected_teachers" value="${t.id}"></td>
            <td style="font-weight: bold;">${t.id}</td>
            <td>${t.pass}</td>
            <td style="font-weight: bold;">${t.name}</td>
            <td>${t.phone}</td>
            <td>${t.subject}</td>
            <td>
                <form method="POST" style="margin:0;">
                    <input type="hidden" name="action" value="delete_teacher">
                    <input type="hidden" name="teacher_id" value="${t.id}">
                    <button type="submit" class="del-btn" onclick="return confirm('Delete this teacher login account?')">Delete</button>
                </form>
            </td>
        </tr>`).join('') : `<tr><td colspan="7" style="text-align:center; color:#555;">No teacher accounts found. Create one below.</td></tr>`;

    let subjectsRows = subjects_list.map(sub => `
        <tr>
            <td style="text-align: center;"><input type="checkbox" name="selected_subjects" value="${sub.sl}"></td>
            <td style="text-align: center; font-weight: bold;">${sub.sl}</td>
            <td>
                <form method="POST" style="margin:0; display:inline;">
                    <input type="hidden" name="action" value="update_subject_teacher">
                    <input type="hidden" name="sub_sl" value="${sub.sl}">
                    <input type="text" name="new_sub_name" value="${sub.name}" class="dash-input" style="margin-bottom:0;" required>
            </td>
            <td style="white-space: pre-line; font-size: 13px;">${sub.teacher}</td>
            <td>
                <select name="teacher_id_select" class="dash-input" style="margin-bottom:0;" required>
                    <option value="">-- Change Teacher --</option>
                    ${teachers_list.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
            </td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button type="submit" class="header-btn" style="cursor:pointer; border:none; padding: 6px 10px; background-color: #2e7d32;">Update</button>
                </form>
                    <form method="POST" style="margin:0;">
                        <input type="hidden" name="action" value="delete_subject_teacher">
                        <input type="hidden" name="sub_sl" value="${sub.sl}">
                        <button type="submit" class="del-btn" onclick="return confirm('Delete this subject & teacher?')">Delete</button>
                    </form>
                </div>
            </td>
        </tr>`).join('');

    let noticeRows = notice_board.map(n => `
        <tr>
            <td style="text-align: center; font-weight: bold;">${n.id}</td>
            <td>
                <form method="POST" style="margin:0; display:flex; gap:10px;">
                    <input type="hidden" name="action" value="update_notice">
                    <input type="hidden" name="notice_id" value="${n.id}">
                    <input type="text" name="notice_text" value="${n.text}" class="dash-input" style="margin-bottom:0; flex-grow:1;" required>
                    <button type="submit" class="header-btn" style="cursor:pointer; border:none; padding:6px 12px; background-color:#2e7d32;">Save</button>
                </form>
            </td>
            <td style="text-align: center;">
                <form method="POST" style="margin:0;">
                    <input type="hidden" name="action" value="delete_notice">
                    <input type="hidden" name="notice_id" value="${n.id}">
                    <button type="submit" class="del-btn" onclick="return confirm('이 নোটিশটি মুছে ফেলতে চান?')">Delete</button>
                </form>
            </td>
        </tr>`).join('');

    const classOptionsForRow = current => { let out=''; for(let i=1;i<=10;i++){ const v=`Class ${i}`; out += `<option value="${v}" ${current===v?'selected':''}>${v}</option>`; } return out; };
    const roomOptionsForRow = current => { let out=''; for(let i=1;i<=10;i++){ const v=`Room ${i}`; out += `<option value="${v}" ${current===v?'selected':''}>${v}</option>`; } return out; };

    let studentsRows = students_list.length > 0 ? students_list.map(s => `
        <tr>
            <td style="text-align:center;"><input type="checkbox" name="selected_students" value="${s.roll}"></td>
            <td><input type="text" name="new_id" value="${s.id}" class="dash-input student-edit"></td>
            <td><input type="text" name="new_pass" value="${s.pass}" class="dash-input student-edit"></td>
            <td><input type="text" name="new_roll" value="${s.roll}" class="dash-input student-edit"></td>
            <td><input type="text" name="new_name" value="${s.name}" class="dash-input student-edit"></td>
            <td><select name="new_class" class="dash-input student-edit">${classOptionsForRow(s.class)}</select></td>
            <td><select name="new_room" class="dash-input student-edit">${roomOptionsForRow(s.room)}</select></td>
            <td><input type="text" name="new_student_no" value="${s.student_no}" class="dash-input student-edit"></td>
            <td style="white-space:nowrap;">
                <form method="POST" style="margin:0;display:inline;">
                    <input type="hidden" name="action" value="update_student_full">
                    <input type="hidden" name="target_student_id" value="${s.id}">
                    <input type="hidden" name="new_id" class="mirror-new-id">
                    <input type="hidden" name="new_pass" class="mirror-new-pass">
                    <input type="hidden" name="new_roll" class="mirror-new-roll">
                    <input type="hidden" name="new_name" class="mirror-new-name">
                    <input type="hidden" name="new_class" class="mirror-new-class">
                    <input type="hidden" name="new_room" class="mirror-new-room">
                    <input type="hidden" name="new_student_no" class="mirror-new-student-no">
                    <button type="submit" class="header-btn" style="border:none;cursor:pointer;background:#2e7d32;" onclick="return syncStudentEdit(this)">Update</button>
                </form>
                <form method="POST" style="margin:5px 0 0;display:inline;">
                    <input type="hidden" name="action" value="delete_student">
                    <input type="hidden" name="target_roll" value="${s.roll}">
                    <button type="submit" class="del-btn" onclick="return confirm('Are you sure you want to delete this student?')">Delete</button>
                </form>
            </td>
        </tr>`).join('') : `<tr><td colspan="9" style="text-align:center; color:#555;">No students found. Add a new student below.</td></tr>`;

    let roomOptions = '';
    for(let i=1; i<=10; i++) roomOptions += `<option value="Room ${i}">Room ${i}</option>`;

    // Class 1 to Class 10 options generator
    let classOptions = '';
    for(let i=1; i<=10; i++) {
        classOptions += `<option value="Class ${i}">Class ${i}</option>`;
    }

    let examControlRows = EXAMS.map((exam, idx) => {
        const st = exam_state[exam.id];
        const isActive = active_exam_id === exam.id && st.active;
        return `<tr>
            <td style="text-align:center;font-weight:bold;">${idx + 1}</td>
            <td style="font-weight:bold;">${exam.title}</td>
            <td style="text-align:center;">${isActive ? '<span style="color:#16853a;font-weight:bold;">🟢 ACTIVE</span>' : '<span style="color:#777;">Stopped</span>'}</td>
            <td style="text-align:center;">${st.published ? '<span style="color:#16853a;font-weight:bold;">Published</span>' : '<span style="color:#b71c1c;">Not Published</span>'}</td>
            <td style="text-align:center;white-space:nowrap;">${isActive ? `<form method="POST" style="display:inline"><input type="hidden" name="action" value="stop_exam"><input type="hidden" name="exam_id" value="${exam.id}"><button class="del-btn" type="submit">■ Stop Exam</button></form>` : `<form method="POST" style="display:inline"><input type="hidden" name="action" value="start_exam"><input type="hidden" name="exam_id" value="${exam.id}"><button class="header-btn" type="submit" style="border:none;cursor:pointer;background:#2e8b57;">▶ Start Exam</button></form>`}</td>
            <td style="text-align:center;white-space:nowrap;">${st.published ? `<form method="POST" style="display:inline"><input type="hidden" name="action" value="unpublish_exam"><input type="hidden" name="exam_id" value="${exam.id}"><button class="del-btn" type="submit">Unpublish</button></form>` : `<form method="POST" style="display:inline"><input type="hidden" name="action" value="publish_exam"><input type="hidden" name="exam_id" value="${exam.id}"><button class="header-btn" type="submit" style="border:none;cursor:pointer;">Publish Result</button></form>`}</td>
        </tr>`;
    }).join('');

    let body = `
    <div class="main-container" style="display: block;">
        <div class="card" style="margin-bottom: 20px;">
            <h3>⚙️ Admin Control Panel & Management Tools</h3>
            ${successMsg ? `<div style="background:#1b5e20; color:#fff; padding:10px; border-radius:4px; margin-bottom:15px;">${successMsg}</div>` : ''}
            
            <div style="background:rgba(0,0,0,0.03);border:1px solid #ddd;padding:18px;border-radius:6px;margin-bottom:25px;">
                <h4 style="margin:0 0 8px;color:#111;">🎓 Examination Control</h4>
                <p style="margin:0 0 12px;font-size:13px;color:#555;">Start/stop one of the four examinations. The active examination automatically controls the student Admit Card and the teacher Marks Upload panel.</p>
                <div style="overflow-x:auto;"><table class="dash-table"><tr><th>SI</th><th>Exam Name</th><th>Exam Status</th><th>Result</th><th>Start / Stop</th><th>Publish</th></tr>${examControlRows}</table></div>
                <div style="margin-top:10px;padding:10px;background:#e8f5e9;color:#1b5e20;font-weight:bold;">${getActiveExam() ? `Current Active Exam: ${getActiveExam().title}` : 'No Exam Active'}</div>
            </div>

            <div class="dashboard-grid">
                <div>
                    <h4 style="color:#111111;">1. Change Name, Tagline & Logo</h4>
                    <form method="POST">
                        <input type="hidden" name="action" value="update_settings">
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Portal/Brand Name:</label>
                        <input type="text" name="school_name" class="dash-input" value="${portal_settings.school_name}" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Subtitle / Tagline:</label>
                        <input type="text" name="tagline" class="dash-input" value="${portal_settings.tagline}" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Logo Type:</label>
                        <select name="logo_type" class="dash-input">
                            <option value="text" ${portal_settings.logo_type === 'text' ? 'selected' : ''}>Text Logo</option>
                            <option value="image" ${portal_settings.logo_type === 'image' ? 'selected' : ''}>Image URL Logo</option>
                        </select>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Logo Text:</label>
                        <input type="text" name="logo_text" class="dash-input" value="${portal_settings.logo_text}">
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Logo Image URL:</label>
                        <input type="text" name="logo_url" class="dash-input" value="${portal_settings.logo_url}" placeholder="https://example.com/logo.png">
                        <button type="submit" class="header-btn" style="cursor:pointer; border:none;">Update Logo & Name</button>
                    </form>
                </div>
                <div>
                    <h4 style="color:#111111;">2. Home Page Content Editor</h4>
                    <form method="POST" style="margin-bottom:20px;">
                        <input type="hidden" name="action" value="update_home_content">
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Home Page Title:</label>
                        <input type="text" name="home_title" class="dash-input" value="${portal_settings.home_title}" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Home Page Description:</label>
                        <textarea name="home_description" class="dash-input" rows="3" required style="resize:vertical;">${portal_settings.home_description}</textarea>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Feature Section Title:</label>
                        <input type="text" name="home_feature_title" class="dash-input" value="${portal_settings.home_feature_title}" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Feature 1:</label>
                        <input type="text" name="home_feature_1" class="dash-input" value="${portal_settings.home_feature_1}" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Feature 2:</label>
                        <input type="text" name="home_feature_2" class="dash-input" value="${portal_settings.home_feature_2}" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Feature 3:</label>
                        <input type="text" name="home_feature_3" class="dash-input" value="${portal_settings.home_feature_3}" required>
                        <button type="submit" class="header-btn" style="cursor:pointer;border:none;background:#00796b;">Save Home Page Content</button>
                    </form>

                    <h4 style="color:#111111;">3. One-Click Preset Themes & Custom Colors</h4>
                    <form method="POST" style="margin-bottom: 20px; background: rgba(0,0,0,0.03); padding: 15px; border-radius: 6px; border: 1px dashed ${portal_settings.accent_color};">
                        <input type="hidden" name="action" value="apply_preset_theme">
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111; font-weight:bold;">⚡ One-Click Preset Themes:</label>
                        <div style="display: flex; gap: 10px;">
                            <select name="preset_theme" class="dash-input" style="margin-bottom:0; flex-grow:1;" required>${presetOptions}</select>
                            <button type="submit" class="header-btn" style="cursor:pointer; border:none; background-color: #0088cc; white-space:nowrap;">Apply Theme</button>
                        </div>
                    </form>
                    <form method="POST">
                        <input type="hidden" name="action" value="update_theme">
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Body Background Color:</label>
                        <input type="text" name="bg_color" class="dash-input" value="${portal_settings.bg_color}">
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Header Background Color:</label>
                        <input type="text" name="header_color" class="dash-input" value="${portal_settings.header_color}">
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Accent/Border Color:</label>
                        <input type="text" name="accent_color" class="dash-input" value="${portal_settings.accent_color}">
                        <button type="submit" class="header-btn" style="cursor:pointer; border:none;">Save Custom Colors</button>
                    </form>
                </div>
            </div>

            <hr style="border-color: #dddddd; margin: 25px 0;">

            <div style="background: rgba(0,0,0,0.02); border: 1px dashed ${portal_settings.accent_color}; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                <h4 style="color: #111111; margin-top: 0;">📢 হোম পেজ নোটিশ বোর্ড ম্যানেজমেন্ট (Notice Board Editor)</h4>
                <form method="POST" style="margin-bottom: 20px;">
                    <input type="hidden" name="action" value="add_notice">
                    <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">নতুন নোটিশ যোগ করুন (বাংলায়):</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" name="notice_text" class="dash-input" placeholder="নোটিশের বিবরণ লিখুন..." required style="margin-bottom:0; flex-grow:1;">
                        <button type="submit" class="header-btn" style="cursor:pointer; border:none; background-color: #00796b; white-space:nowrap;">নোটিশ প্রকাশ করুন</button>
                    </div>
                </form>
                <h5 style="color: #111111; margin: 0 0 8px 0;">বর্তমান নোটিশসমূহ এডিট বা ডিলিট করুন:</h5>
                <table class="dash-table">
                    <tr>
                        <th style="width: 50px; text-align: center;">ID</th>
                        <th>নোটিশের বিবরণ (বাংলা)</th>
                        <th style="width: 100px; text-align: center;">Action</th>
                    </tr>
                    ${noticeRows}
                </table>
            </div>

            <hr style="border-color: #dddddd; margin: 25px 0;">

            <div style="background: rgba(0,0,0,0.02); border: 1px dashed ${portal_settings.accent_color}; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                <h4 style="color: #111111; margin-top: 0;">🤖 বাংলা এআই সহকারী (Bangla AI Assistant) কন্ট্রোল টুল</h4>
                <form method="POST" style="margin-bottom: 15px;">
                    <input type="hidden" name="action" value="update_ai_prompt">
                    <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">এআই সিস্টেম নির্দেশনা (AI Bangla Prompt):</label>
                    <textarea name="ai_prompt" class="dash-input" rows="3" required style="resize: vertical;">${portal_settings.ai_prompt}</textarea>
                    <button type="submit" class="header-btn" style="cursor:pointer; border:none;">প্রম্পট সেভ করুন</button>
                </form>
                <form method="POST">
                    <input type="hidden" name="action" value="ask_ai">
                    <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">এআই-এর সাথে বাংলায় কথা বলে টেস্ট করুন:</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" name="ai_query" class="dash-input" placeholder="যেমন: কেমন আছো?..." required style="margin-bottom:0; flex-grow:1;">
                        <button type="submit" class="header-btn" style="cursor:pointer; border:none; background-color: #0088cc;">বাংলায় কথা বলুন</button>
                    </div>
                </form>
                ${aiResponse ? `<div style="margin-top: 15px; background: #f4f6f9; border: 1px solid ${portal_settings.accent_color}; padding: 15px; border-radius: 4px; color: #111111; white-space: pre-wrap; font-size: 14px;"><strong>এআই আউটপুট:</strong><br>${aiResponse}</div>` : ''}
            </div>

            <hr style="border-color: #dddddd; margin: 25px 0;">

            <div style="background: rgba(0,0,0,0.02); border: 1px solid #dddddd; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                <h4 style="color: #111111; margin-top: 0;">👨‍🏫 Teacher Account Create & Login Access</h4>
                <form method="POST" style="margin-bottom: 20px;">
                    <input type="hidden" name="action" value="add_teacher">
                    <div class="dashboard-grid" style="margin-bottom: 0;">
                        <div>
                            <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Teacher Login ID:</label>
                            <input type="text" name="teacher_id" class="dash-input" placeholder="e.g. masuda" required>
                            <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Teacher Password:</label>
                            <input type="text" name="teacher_pass" class="dash-input" placeholder="e.g. 1234" required>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Teacher Full Name:</label>
                            <input type="text" name="teacher_name" class="dash-input" placeholder="e.g. MASUDA KHATUN" required>
                            <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Phone Number & Subject:</label>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" name="teacher_phone" class="dash-input" placeholder="01805992372" required style="margin-bottom:0;">
                                <select name="teacher_subject" class="dash-input" required style="margin-bottom:0;">
                                    <option value="">-- Select Subject --</option>
                                    <option value="Bangla-I">Bangla-I</option>
                                    <option value="Bangla-II">Bangla-II</option>
                                    <option value="English-I">English-I</option>
                                    <option value="English-II">English-II</option>
                                    <option value="Mathematics">Mathematics</option>
                                    <option value="ICT">ICT</option>
                                    <option value="Islam and Moral Education">Islam and Moral Education</option>
                                    <option value="Bangladesh and Global Studies">Bangladesh and Global Studies</option>
                                    <option value="SCIENCE">SCIENCE</option>
                                    <option value="Fine Arts & Crafts">Fine Arts & Crafts</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <button type="submit" class="header-btn" style="cursor:pointer; border:none; margin-top:15px; background-color: #00796b;">Create Teacher Account</button>
                </form>

                <form method="POST">
                    <input type="hidden" name="action" value="delete_selected_teachers">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h5 style="color: #111111; margin: 0;">Existing Teacher Accounts List:</h5>
                        <button type="submit" class="del-btn" onclick="return confirm('Delete selected teachers?')">🗑 Delete Selected</button>
                    </div>
                    <table class="dash-table">
                        <tr>
                            <th style="width: 40px; text-align: center;"><input type="checkbox" id="select_all_teachers" onclick="toggleAllCheckboxes(this, 'selected_teachers')"></th>
                            <th>Teacher ID</th><th>Password</th><th>Full Name</th><th>Phone Number</th><th>Subject</th><th>Action</th>
                        </tr>
                        ${teachersRows}
                    </table>
                </form>
            </div>

            <hr style="border-color: #dddddd; margin: 25px 0;">

            <div style="background: rgba(0,0,0,0.02); border: 1px solid #dddddd; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                <h4 style="color: #111111; margin-top: 0;">📚 Subject & Teacher Selection & Assignment</h4>
                <form method="POST" style="margin-bottom: 20px;">
                    <input type="hidden" name="action" value="add_subject_teacher">
                    <div class="dashboard-grid" style="margin-bottom: 0;">
                        <div>
                            <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Subject Name:</label>
                            <input type="text" name="sub_name" class="dash-input" placeholder="Type subject name" required>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Select Teacher:</label>
                            <select name="teacher_id_select" class="dash-input" required>
                                ${teacherSelectOptions}
                            </select>
                        </div>
                    </div>
                    <button type="submit" class="header-btn" style="cursor:pointer; border:none;">Add Subject & Assign Teacher</button>
                </form>

                <form method="POST">
                    <input type="hidden" name="action" value="delete_selected_subjects">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h5 style="color: #111111; margin: 0;">Existing Subjects & Teachers List:</h5>
                        <button type="submit" class="del-btn" onclick="return confirm('Delete selected subjects?')">🗑 Delete Selected</button>
                    </div>
                    <table class="dash-table">
                        <tr>
                            <th style="width: 40px; text-align: center;"><input type="checkbox" id="select_all_subjects" onclick="toggleAllCheckboxes(this, 'selected_subjects')"></th>
                            <th style="width: 40px;">SL</th><th>Subject Name</th><th>Current Assigned Teacher</th><th>Select New Teacher</th><th>Action</th>
                        </tr>
                        ${subjectsRows}
                    </table>
                </form>
            </div>

            <hr style="border-color: #dddddd; margin: 25px 0;">

            <div class="dashboard-grid">
                <div>
                    <h4 style="color:#111111;">3. Add Student (Custom Number / User ID)</h4>
                    <form method="POST">
                        <input type="hidden" name="action" value="add_student">
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Custom User ID / Number:</label>
                        <input type="text" name="student_id" class="dash-input" placeholder="e.g. jihan365" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Password:</label>
                        <input type="text" class="dash-input" value="Same as User ID" readonly>
                        <small style="display:block;color:#555;margin-top:4px;">Password automatically User ID-এর সমান হবে।</small>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Roll Number:</label>
                        <input type="text" name="roll" class="dash-input" placeholder="e.g. 365" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Name:</label>
                        <input type="text" name="name" class="dash-input" placeholder="e.g. JUBEYER" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Class:</label>
                        <select name="class" class="dash-input" required>${classOptions}</select>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Room Number:</label>
                        <select name="room" class="dash-input" required>${roomOptions}</select>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Student ID No:</label>
                        <input type="text" name="student_no" class="dash-input" placeholder="2620600196" required>
                        <button type="submit" class="header-btn" style="cursor:pointer; border:none; margin-top:10px;">Add Student</button>
                    </form>
                </div>
                <div style="margin-top:20px; padding:15px; border:1px solid #ddd; border-radius:10px; background:#f8fbff;">
                    <h4 style="color:#111111; margin-top:0;">3A. Bulk Create Students (User ID Range)</h4>
                    <p style="font-size:12px;color:#555;">User ID Start/End দাও। Password automatically User ID-এর মতোই হবে। Roll Start/End আলাদাভাবে দিতে পারবে; যেমন User ID 8100–8150 এবং Roll 1–51।</p>
                    <form method="POST">
                        <input type="hidden" name="action" value="bulk_add_students">
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Student Name (সব account-এ এই নাম যাবে):</label>
                        <input type="text" name="bulk_name" class="dash-input" placeholder="e.g. Student Name" required>
                        <label style="display:block; margin:10px 0 6px; font-size:12px; color:#111111;">User ID Start:</label>
                        <input type="number" name="bulk_id_start" class="dash-input" min="1" required placeholder="e.g. 8100">
                        <label style="display:block; margin:10px 0 6px; font-size:12px; color:#111111;">User ID End:</label>
                        <input type="number" name="bulk_id_end" class="dash-input" min="1" required placeholder="e.g. 8150">
                        <label style="display:block; margin:10px 0 6px; font-size:12px; color:#111111;">Roll Start:</label>
                        <input type="number" name="bulk_roll_start" class="dash-input" min="1" required placeholder="e.g. 1">
                        <label style="display:block; margin:10px 0 6px; font-size:12px; color:#111111;">Roll End:</label>
                        <input type="number" name="bulk_roll_end" class="dash-input" min="1" required placeholder="e.g. 51">
                        <label style="display:block; margin:10px 0 6px; font-size:12px; color:#111111;">Class:</label>
                        <select name="bulk_class" class="dash-input" required>${classOptions}</select>
                        <label style="display:block; margin:10px 0 6px; font-size:12px; color:#111111;">Room Number:</label>
                        <select name="bulk_room" class="dash-input" required>${roomOptions}</select>
                        <button type="submit" class="header-btn" style="cursor:pointer; border:none; margin-top:10px;" onclick="return confirm('আপনার দেওয়া User ID range এবং Roll range অনুযায়ী student account তৈরি করবেন? Password User ID-এর মতোই হবে।')">Create Students</button>
                    </form>
                </div>

                <div>
                    <h4 style="color:#111111;">4. Update Student Details</h4>
                    <form method="POST">
                        <input type="hidden" name="action" value="update_student_full">
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">Select Student (Roll):</label>
                        <select name="target_roll" class="dash-input" required>
                            ${studentSelectOptions}
                        </select>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">New Student Name:</label>
                        <input type="text" name="new_name" class="dash-input" placeholder="New name" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">New Roll Number:</label>
                        <input type="text" name="new_roll" class="dash-input" placeholder="New roll" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">New User ID:</label>
                        <input type="text" name="new_id" class="dash-input" placeholder="New ID" required>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">New Password:</label>
                        <input type="text" class="dash-input" value="Same as New User ID" readonly>
                        <small style="display:block;color:#555;margin-top:4px;">New User ID save হলে Password-ও একই হবে।</small>
                        <label style="display:block; margin-bottom:6px; font-size:12px; color:#111111;">New Room:</label>
                        <select name="new_room" class="dash-input" required>${roomOptions}</select>
                        <button type="submit" class="header-btn" style="cursor:pointer; border:none; margin-top: 10px;">Update Student Info</button>
                    </form>
                </div>
            </div>
        </div>

        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap;">
                <h4 style="color:#111111;margin:0;">5. Registered Students List</h4>
                <button type="button" class="del-btn" onclick="deleteSelectedStudents()">🗑 Delete Selected</button>
            </div>
            <p style="font-size:12px;color:#555;margin:0 0 10px;">নাম, User ID, Password, Roll, Class, Room এবং Student ID # সরাসরি এই table-এ edit করে <b>Update</b> চাপতে পারবে।</p>
            <table class="dash-table">
                <tr>
                    <th style="width:40px;text-align:center;"><input type="checkbox" id="select_all_students" onclick="toggleAllCheckboxes(this, 'selected_students')"></th>
                    <th>User ID</th><th>Password</th><th>Roll</th><th>Name</th><th>Class</th><th>Room</th><th>Student ID #</th><th>Action</th>
                </tr>
                ${studentsRows}
            </table>
            <form id="deleteSelectedForm" method="POST" style="display:none;"><input type="hidden" name="action" value="delete_selected_students"><div id="deleteSelectedInputs"></div></form>
        </div>
    </div>
    <script>
        function toggleAllCheckboxes(source, checkboxName) {
            let checkboxes = document.getElementsByName(checkboxName);
            for(let i=0, n=checkboxes.length; i<n; i++) checkboxes[i].checked = source.checked;
        }
        function syncStudentEdit(button) {
            const row = button.closest('tr');
            const form = button.closest('form');
            const names = ['new_id','new_pass','new_roll','new_name','new_class','new_room','new_student_no'];
            names.forEach(name => { const source = row.querySelector('[name="' + name + '"]'); const target = form.querySelector('.mirror-' + name.replace('new_','new-')); if(source && target) target.value = source.value; });
            return true;
        }
        function deleteSelectedStudents() {
            const selected = Array.from(document.querySelectorAll('input[name="selected_students"]:checked')).map(x => x.value);
            if (!selected.length) { alert('কমপক্ষে একজন student select করুন।'); return; }
            if (!confirm('Selected students delete করবেন?')) return;
            const box = document.getElementById('deleteSelectedInputs');
            box.innerHTML = '';
            selected.forEach(v => { const input = document.createElement('input'); input.type='hidden'; input.name='selected_students'; input.value=v; box.appendChild(input); });
            document.getElementById('deleteSelectedForm').submit();
        }
    </script>`;
    res.send(renderTemplate(body, req));
});

app.post('/dashboard', (req, res) => {
    if (!req.session.admin_logged) return res.redirect('/login?type=admin');
    let { action } = req.body;
    let successMsg = '';
    let aiResponse = '';

    if (action === 'start_exam') {
        const exam = getExam(req.body.exam_id);
        if (exam) {
            EXAMS.forEach(e => { exam_state[e.id].active = false; });
            active_exam_id = exam.id;
            exam_state[exam.id].active = true;
            exam_state[exam.id].startedAt = new Date().toISOString();
            successMsg = `${exam.title} started successfully. Admit Card and Marks Upload are now switched to this exam.`;
        }
    } else if (action === 'stop_exam') {
        const exam = getExam(req.body.exam_id);
        if (exam) {
            exam_state[exam.id].active = false;
            if (active_exam_id === exam.id) active_exam_id = null;
            successMsg = `${exam.title} stopped successfully.`;
        }
    } else if (action === 'publish_exam') {
        const exam = getExam(req.body.exam_id);
        if (exam) {
            exam_state[exam.id].published = true;
            exam_state[exam.id].publishedAt = new Date().toISOString();
            successMsg = `${exam.title} result published successfully.`;
        }
    } else if (action === 'unpublish_exam') {
        const exam = getExam(req.body.exam_id);
        if (exam) {
            exam_state[exam.id].published = false;
            exam_state[exam.id].publishedAt = null;
            successMsg = `${exam.title} result unpublished.`;
        }
    } else if (action === 'update_settings') {
        portal_settings.school_name = req.body.school_name;
        portal_settings.tagline = req.body.tagline;
        portal_settings.logo_type = req.body.logo_type;
        portal_settings.logo_text = req.body.logo_text;
        portal_settings.logo_url = req.body.logo_url;
        successMsg = 'Portal settings updated successfully!';
    } else if (action === 'update_home_content') {
        portal_settings.home_title = req.body.home_title || portal_settings.home_title;
        portal_settings.home_description = req.body.home_description || portal_settings.home_description;
        portal_settings.home_feature_title = req.body.home_feature_title || portal_settings.home_feature_title;
        portal_settings.home_feature_1 = req.body.home_feature_1 || portal_settings.home_feature_1;
        portal_settings.home_feature_2 = req.body.home_feature_2 || portal_settings.home_feature_2;
        portal_settings.home_feature_3 = req.body.home_feature_3 || portal_settings.home_feature_3;
        successMsg = 'Home page content updated successfully!';
    } else if (action === 'apply_preset_theme') {
        let t = PRESET_THEMES[req.body.preset_theme];
        if (t) {
            portal_settings.bg_color = t.bg_color;
            portal_settings.header_color = t.header_color;
            portal_settings.accent_color = t.accent_color;
            successMsg = `Theme applied successfully!`;
        }
    } else if (action === 'update_theme') {
        portal_settings.bg_color = req.body.bg_color;
        portal_settings.header_color = req.body.header_color;
        portal_settings.accent_color = req.body.accent_color;
        successMsg = 'Custom theme colors updated!';
    } else if (action === 'update_ai_prompt') {
        portal_settings.ai_prompt = req.body.ai_prompt;
        successMsg = 'AI prompt updated!';
    } else if (action === 'ask_ai') {
        let q = req.body.ai_query;
        aiResponse = `[নির্দেশনা কার্যকর]: ${portal_settings.ai_prompt}\n\n[উত্তর]: হ্যাঁ, আমি আপনার সাথে বাংলায় কথা বলছি! আপনি লিখেছেন: "${q}".`;
    } else if (action === 'add_notice') {
        let newNoticeText = req.body.notice_text;
        let newId = notice_board.length > 0 ? notice_board[notice_board.length - 1].id + 1 : 1;
        notice_board.push({ id: newId, text: newNoticeText });
        successMsg = 'নতুন নোটিশ সফলভাবে যোগ করা হয়েছে!';
    } else if (action === 'update_notice') {
        let nId = parseInt(req.body.notice_id);
        let noticeObj = notice_board.find(n => n.id === nId);
        if (noticeObj) {
            noticeObj.text = req.body.notice_text;
            successMsg = 'নোটিশ সফলভাবে আপডেট করা হয়েছে!';
        }
    } else if (action === 'delete_notice') {
        let nId = parseInt(req.body.notice_id);
        notice_board = notice_board.filter(n => n.id !== nId);
        successMsg = 'নোটিশ ডিলিট করা হয়েছে!';
    } else if (action === 'bulk_add_students') {
        const bulkName = String(req.body.bulk_name || '').trim();
        const bulkClass = req.body.bulk_class || 'Class 6';
        const bulkRoom = req.body.bulk_room || 'Room 1';
        const bulkIdStart = parseInt(req.body.bulk_id_start, 10);
        const bulkIdEnd = parseInt(req.body.bulk_id_end, 10);
        const bulkRollStart = parseInt(req.body.bulk_roll_start, 10);
        const bulkRollEnd = parseInt(req.body.bulk_roll_end, 10);
        const idCount = bulkIdEnd - bulkIdStart + 1;
        const rollCount = bulkRollEnd - bulkRollStart + 1;
        let created = 0;
        let skipped = 0;

        if (!bulkName) {
            successMsg = 'Student name is required!';
        } else if (
            !Number.isInteger(bulkIdStart) || !Number.isInteger(bulkIdEnd) ||
            !Number.isInteger(bulkRollStart) || !Number.isInteger(bulkRollEnd) ||
            bulkIdStart < 1 || bulkIdEnd < bulkIdStart ||
            bulkRollStart < 1 || bulkRollEnd < bulkRollStart ||
            idCount !== rollCount || idCount > 501
        ) {
            successMsg = 'Valid User ID Start/End এবং Roll Start/End দিন। User ID range এবং Roll range-এর student সংখ্যা একই হতে হবে (সর্বোচ্চ 501 জন)।';
        } else {
            for (let i = 0; i < idCount; i++) {
                const id = String(bulkIdStart + i);
                const roll = String(bulkRollStart + i);
                const exists = students_list.some(st =>
                    String(st.id) === id ||
                    String(st.student_no) === id ||
                    String(st.roll) === roll
                );

                if (exists) {
                    skipped++;
                    continue;
                }

                students_list.push({
                    id,
                    pass: id,
                    roll,
                    name: bulkName,
                    class: bulkClass,
                    room: bulkRoom,
                    student_no: id,
                    photo: ''
                });
                created++;
            }

            successMsg = `${created}টি student account তৈরি হয়েছে (User ID ${bulkIdStart}-${bulkIdEnd}, Roll ${bulkRollStart}-${bulkRollEnd}).${skipped ? ` ${skipped}টি আগে থেকেই ছিল, তাই বাদ দেওয়া হয়েছে।` : ''} Password User ID-এর মতোই সেট হয়েছে।`;
        }
    } else if (action === 'add_student') {
        students_list.push({
            id: req.body.student_id,
            pass: req.body.student_id,
            roll: req.body.roll,
            name: req.body.name,
            class: req.body.class || 'Class 6',
            room: req.body.room,
            student_no: req.body.student_no,
            photo: req.body.photo || ''
        });
        successMsg = 'Student added successfully!';
    } else if (action === 'update_student_full') {
        const targetId = String(req.body.target_student_id || '');
        const s = students_list.find(st => String(st.id) === targetId);
        const newId = String(req.body.new_id || '').trim();
        const newPass = newId;
        const newRoll = String(req.body.new_roll || '').trim();
        const newName = String(req.body.new_name || '').trim();
        const newStudentNo = String(req.body.new_student_no || '').trim();
        if (!s) {
            successMsg = 'Student not found!';
        } else if (!newId || !newPass || !newRoll || !newName || !newStudentNo) {
            successMsg = 'All student fields are required!';
        } else {
            const duplicate = students_list.some(st => st !== s && (String(st.id) === newId || String(st.student_no) === newStudentNo || String(st.roll) === newRoll));
            if (duplicate) {
                successMsg = 'User ID, Student ID or Roll already exists!';
            } else {
                s.id = newId; s.pass = newPass; s.roll = newRoll; s.name = newName;
                s.class = req.body.new_class || s.class; s.room = req.body.new_room || s.room; s.student_no = newStudentNo;
                successMsg = 'Student details updated successfully!';
            }
        }
    } else if (action === 'delete_student') {
        students_list = students_list.filter(s => s.roll !== req.body.target_roll);
        successMsg = 'Student deleted!';
    } else if (action === 'delete_selected_students') {
        let selected = req.body.selected_students || [];
        if (!Array.isArray(selected)) selected = [selected];
        students_list = students_list.filter(s => !selected.includes(s.roll));
        successMsg = 'Selected students deleted!';
    } else if (action === 'add_teacher') {
        teachers_list.push({
            id: req.body.teacher_id,
            pass: req.body.teacher_pass,
            name: req.body.teacher_name,
            phone: req.body.teacher_phone,
            subject: req.body.teacher_subject
        });
        successMsg = 'Teacher account created!';
    } else if (action === 'delete_teacher') {
        teachers_list = teachers_list.filter(t => t.id !== req.body.teacher_id);
        successMsg = 'Teacher deleted!';
    } else if (action === 'delete_selected_teachers') {
        let selected = req.body.selected_teachers || [];
        if (!Array.isArray(selected)) selected = [selected];
        teachers_list = teachers_list.filter(t => !selected.includes(t.id));
        successMsg = 'Selected teachers deleted!';
    } else if (action === 'add_subject_teacher') {
        let teacher = teachers_list.find(t => t.id === req.body.teacher_id_select);
        let teacherInfo = teacher ? `${teacher.name}\n${teacher.phone}` : 'TBA';
        subjects_list.push({
            sl: String(subjects_list.length + 1),
            name: req.body.sub_name,
            teacher: teacherInfo
        });
        successMsg = 'Subject added!';
    } else if (action === 'update_subject_teacher') {
        let sub = subjects_list.find(s => s.sl === req.body.sub_sl);
        let teacher = teachers_list.find(t => t.id === req.body.teacher_id_select);
        if (sub) {
            sub.name = req.body.new_sub_name;
            if (teacher) sub.teacher = `${teacher.name}\n${teacher.phone}`;
            successMsg = 'Subject updated!';
        }
    } else if (action === 'delete_subject_teacher') {
        subjects_list = subjects_list.filter(s => s.sl !== req.body.sub_sl);
        subjects_list.forEach((s, idx) => s.sl = String(idx + 1));
        successMsg = 'Subject deleted!';
    } else if (action === 'delete_selected_subjects') {
        let selected = req.body.selected_subjects || [];
        if (!Array.isArray(selected)) selected = [selected];
        subjects_list = subjects_list.filter(s => !selected.includes(s.sl));
        subjects_list.forEach((s, idx) => s.sl = String(idx + 1));
        successMsg = 'Selected subjects deleted!';
    }

    res.redirect(`/dashboard?msg=${encodeURIComponent(successMsg)}&ai_response=${encodeURIComponent(aiResponse)}`);
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login?type=student');
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
