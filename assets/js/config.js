// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyAmXQeQW8Yq_wTBddR7smgsVdQU_TgWVW0",
    authDomain: "onedental-calendar.firebaseapp.com",
    projectId: "onedental-calendar",
    storageBucket: "onedental-calendar.firebasestorage.app",
    messagingSenderId: "668196249825",
    appId: "1:668196249825:web:298c052c05e8d8c02617a0",
    measurementId: "G-957Z4V4NCN"
};

// 공휴일 API 설정
const HOLIDAY_API_CONFIG = {
    key: "Odn5P4fvXa%2Fhed175UJOP2MxbRubv5HMTtXmg2D3Nr1emNh5fuVKfs3%2FCaqBt2D%2F9zu1J7w1KFOf9u%2BIsRkbOQ%3D%3D",
    url: "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo"
};

// 관리자 비밀번호 (실제 운영시에는 서버에서 관리하는 것이 좋습니다)
const ADMIN_PASSWORD = "make1234";

// 공휴일 설정
const HOLIDAYS_2024 = [
    { date: "2024-01-01", name: "신정" },
    { date: "2024-02-09", name: "설날" },
    { date: "2024-02-10", name: "설날" },
    { date: "2024-02-11", name: "설날" },
    { date: "2024-02-12", name: "대체공휴일" },
    { date: "2024-03-01", name: "삼일절" },
    { date: "2024-05-05", name: "어린이날" },
    { date: "2024-05-15", name: "부처님오신날" },
    { date: "2024-06-06", name: "현충일" },
    { date: "2024-08-15", name: "광복절" },
    { date: "2024-09-16", name: "추석" },
    { date: "2024-09-17", name: "추석" },
    { date: "2024-09-18", name: "추석" },
    { date: "2024-10-03", name: "개천절" },
    { date: "2024-10-09", name: "한글날" },
    { date: "2024-12-25", name: "성탄절" }
]; 