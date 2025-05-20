import { Calendar } from './core/Calendar.js';

// URL 파라미터 확인
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === '1';

// DOM이 로드된 후 캘린더 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    // 캘린더 초기화
    window.calendar = new Calendar(document.getElementById('calendar'));

    // 관리자 패널 설정
    if (isAdmin) {
        document.getElementById('loginPanel').style.display = 'block';
    }
});

// 관리자 로그인 처리
window.checkPassword = () => {
    const input = document.getElementById('adminPassword').value;
    if (window.calendar.checkPassword(input)) {
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('loginPanel').style.display = 'none';
    } else {
        alert('비밀번호가 틀렸습니다.');
    }
};

// 항목 관리 함수들
window.addItem = () => {
    const container = document.getElementById('itemsContainer');
    if (!container) return;

    const index = container.querySelectorAll('div').length;
    const itemHtml = `
        <div>
            이름: <input id="name_${index}">
            영업일: <input type="number" id="days_${index}">
            색상: <input type="color" id="color_${index}" value="#cccccc">
            <button onclick="removeItem(${index})">삭제</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', itemHtml);
};

window.removeItem = (index) => {
    window.calendar.removeItem(index);
    const div = document.querySelector(`#itemsContainer div:nth-child(${index + 1})`);
    if (div) div.remove();
};

window.saveItems = () => {
    const container = document.getElementById('itemsContainer');
    if (!container) return;

    try {
        const items = [];
        const divs = container.querySelectorAll('div');
        
        for (let i = 0; i < divs.length; i++) {
            const name = document.getElementById(`name_${i}`).value.trim();
            const days = parseInt(document.getElementById(`days_${i}`).value);
            const color = document.getElementById(`color_${i}`).value;

            if (!name) throw new Error("항목 이름을 입력해주세요.");
            if (isNaN(days) || days <= 0) throw new Error("유효한 영업일을 입력해주세요.");

            window.calendar.addItem(name, days, color);
        }

        alert("저장 완료!");
        window.calendar.render();
    } catch (error) {
        console.error("❌ 저장 실패:", error);
        alert("저장 실패: " + error.message);
    }
};

// 휴가 관리 함수들
window.addVacation = () => {
    const startDate = document.getElementById('vacationStart').value;
    const endDate = document.getElementById('vacationEnd').value;
    const desc = document.getElementById('vacationDesc').value;

    if (!startDate || !endDate || !desc) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    window.calendar.addVacation(startDate, endDate, desc);
    renderVacationList();
};

window.removeVacation = (id) => {
    window.calendar.removeVacation(id);
    renderVacationList();
};

function renderVacationList() {
    const container = document.getElementById('vacationList');
    if (!container) return;

    const vacations = window.calendar.getVacations();
    let html = '';
    
    vacations.forEach(([id, vacation]) => {
        html += `
            <div class="vacation-item">
                <span>${vacation.startDate} ~ ${vacation.endDate}: ${vacation.description}</span>
                <button onclick="removeVacation('${id}')">삭제</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    window.calendar.render();
} 