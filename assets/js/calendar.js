const PASSWORD = "make1234";
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === '1';

let calendar;
let holidays = [];

// Firebase 컬렉션 참조
let itemsCollection;
let holidaysCollection;
let db;

// Firebase 초기화
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    itemsCollection = db.collection('items');
    holidaysCollection = db.collection('holidays');
    console.log("✅ Firebase 초기화 성공");
} catch (error) {
    console.error("❌ Firebase 초기화 실패:", error);
    alert("Firebase 연결에 실패했습니다. 페이지를 새로고침해주세요.");
}

// 공휴일 초기화 함수
async function initializeHolidays() {
    try {
        // 기존 공휴일 데이터 확인
        const snapshot = await holidaysCollection.get();
        if (snapshot.empty) {
            // 공휴일 데이터가 없으면 추가
            const batch = db.batch();
            for (const holiday of HOLIDAYS_2024) {
                const docRef = holidaysCollection.doc();
                batch.set(docRef, holiday);
            }
            await batch.commit();
            console.log("✅ 공휴일 데이터 초기화 완료");
        }
    } catch (error) {
        console.error("❌ 공휴일 초기화 실패:", error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log("📅 시작됨");

    if (isAdmin) {
        document.getElementById("loginPanel").style.display = 'block';
    }

    try {
        showLoading();
        // 공휴일 데이터 초기화
        await initializeHolidays();
        
        // 공휴일 데이터 로드
        await loadHolidays();
        
        // 캘린더 초기화
        await initializeCalendar();
        
        // Firebase에서 실시간으로 항목 변경 감지
        subscribeToItems();
        hideLoading();
    } catch (error) {
        console.error("❌ 초기화 실패:", error);
        hideLoading();
        alert("초기화에 실패했습니다. 페이지를 새로고침해주세요.");
    }
});

// 로딩 표시 함수
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// 캘린더 초기화
async function initializeCalendar() {
    try {
        showLoading();
        const calendarEl = document.getElementById('calendar');
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: window.innerWidth < 768 ? 'dayGridMonth' : 'dayGridMonth',
            locale: 'ko',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: window.innerWidth < 768 ? 'dayGridMonth' : 'dayGridMonth,timeGridWeek'
            },
            dateClick: handleDateClick,
            eventClick: handleEventClick,
            events: await generateEvents(new Date()),
            height: 'auto',
            contentHeight: 'auto',
            aspectRatio: window.innerWidth < 768 ? 1 : 1.35,
            eventTimeFormat: {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }
        });
        
        calendar.render();
        hideLoading();
    } catch (error) {
        console.error("❌ 캘린더 초기화 실패:", error);
        hideLoading();
        alert("캘린더 초기화에 실패했습니다. 페이지를 새로고침해주세요.");
    }
}

// 날짜 클릭 처리
async function handleDateClick(info) {
    if (!calendar) return;
    
    try {
        showLoading();
        const result = await calculateProduction(info.date);
        
        // 기존의 생성된 이벤트 제거
        calendar.getEvents().forEach(e => {
            if (e.extendedProps.generated) e.remove();
        });
        
        // 새로운 이벤트 추가
        result.forEach(item => {
            calendar.addEvent({
                title: `[${item.name}] 제작일`,
                start: item.date,
                display: 'block',
                backgroundColor: item.color || '#e0e0e0',
                borderColor: '#888',
                textColor: '#000',
                extendedProps: { generated: true }
            });
        });
        hideLoading();
    } catch (error) {
        console.error("❌ 날짜 클릭 처리 실패:", error);
        hideLoading();
        alert("일정 생성에 실패했습니다. 다시 시도해주세요.");
    }
}

// 이벤트 클릭 처리
async function handleEventClick(info) {
    if (isAdmin) {
        const event = info.event;
        if (confirm(`"${event.title}" 일정을 삭제하시겠습니까?`)) {
            try {
                event.remove();
                // Firestore에서도 삭제
                if (event.extendedProps.firestoreId) {
                    await db.collection('events').doc(event.extendedProps.firestoreId).delete();
                }
            } catch (error) {
                console.error("❌ 이벤트 삭제 실패:", error);
            }
        }
    }
}

// Firebase에서 항목 실시간 구독
function subscribeToItems() {
    try {
        return itemsCollection.onSnapshot(snapshot => {
            const items = [];
            snapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
            });
            console.log("✅ 항목 업데이트됨:", items);
            if (isAdmin) {
                updateItemsContainer(items);
            }
        }, error => {
            console.error("❌ 항목 구독 오류:", error);
        });
    } catch (error) {
        console.error("❌ 구독 설정 실패:", error);
    }
}

// 관리자 패널의 항목 컨테이너 업데이트
function updateItemsContainer(items) {
    try {
        const container = document.getElementById("itemsContainer");
        container.innerHTML = '';
        items.forEach((item, index) => {
            container.innerHTML += `
                <div>
                    이름: <input value="${item.name}" id="name_${index}">
                    영업일: <input type="number" value="${item.days}" id="days_${index}">
                    색상: <input type="color" value="${item.color}" id="color_${index}">
                    <button onclick="removeItem('${item.id}')">삭제</button>
                </div>
            `;
        });
    } catch (error) {
        console.error("❌ 항목 컨테이너 업데이트 실패:", error);
    }
}

// 새 항목 추가
function addItem() {
    try {
        const container = document.getElementById("itemsContainer");
        const index = document.querySelectorAll("#itemsContainer div").length;
        container.innerHTML += `
            <div>
                이름: <input id="name_${index}">
                영업일: <input type="number" id="days_${index}">
                색상: <input type="color" id="color_${index}" value="#cccccc">
                <button onclick="removeItem(null, ${index})">삭제</button>
            </div>
        `;
    } catch (error) {
        console.error("❌ 새 항목 추가 실패:", error);
    }
}

// 항목 삭제
async function removeItem(id, index) {
    try {
        if (id) {
            // Firestore에서 삭제
            await itemsCollection.doc(id).delete();
        } else {
            // 새로 추가된 항목은 그냥 DOM에서만 제거
            const divs = document.querySelectorAll("#itemsContainer div");
            if (divs[index]) divs[index].remove();
        }
    } catch (error) {
        console.error("❌ 항목 삭제 실패:", error);
        alert("삭제 실패: " + error.message);
    }
}

// 항목 저장
async function saveItems() {
    try {
        showLoading();
        // 입력값 검증
        const divs = document.querySelectorAll("#itemsContainer div");
        const items = [];
        
        for (let i = 0; i < divs.length; i++) {
            const name = document.getElementById(`name_${i}`).value.trim();
            const days = parseInt(document.getElementById(`days_${i}`).value);
            const color = document.getElementById(`color_${i}`).value;
            
            if (!name) {
                throw new Error("항목 이름을 입력해주세요.");
            }
            if (isNaN(days) || days <= 0) {
                throw new Error("유효한 영업일을 입력해주세요.");
            }
            
            items.push({ name, days, color });
        }

        // 기존 항목 모두 삭제
        const snapshot = await itemsCollection.get();
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // 새 항목 추가
        const addBatch = db.batch();
        for (const item of items) {
            const docRef = itemsCollection.doc();
            addBatch.set(docRef, {
                ...item,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await addBatch.commit();
        
        hideLoading();
        alert("저장 완료!");
        // 캘린더 새로고침
        if (calendar) calendar.refetchEvents();
    } catch (error) {
        console.error("❌ 저장 실패:", error);
        hideLoading();
        alert("저장 실패: " + error.message);
    }
}

// 공휴일 체크
function isHolidayOrWeekend(date) {
    try {
        const iso = date.toISOString().slice(0, 10);
        const day = date.getDay();
        return holidays.includes(iso) || day === 0 || day === 6;
    } catch (error) {
        console.error("❌ 공휴일 체크 실패:", error);
        return false;
    }
}

// 공휴일 로드
async function loadHolidays() {
    try {
        // 캐시된 공휴일 데이터 확인
        const cachedHolidays = localStorage.getItem('holidays');
        const lastUpdate = localStorage.getItem('holidaysLastUpdate');
        const now = new Date().getTime();

        // 캐시가 24시간 이내인 경우 사용
        if (cachedHolidays && lastUpdate && (now - parseInt(lastUpdate)) < 24 * 60 * 60 * 1000) {
            this.holidays = new Set(JSON.parse(cachedHolidays));
            this.renderHolidayList();
            return;
        }

        // 현재 연도의 공휴일 데이터 가져오기
        const year = new Date().getFullYear();
        const holidays = await this.fetchHolidays(year);
        
        if (holidays && holidays.length > 0) {
            this.holidays = new Set(holidays.map(h => h.date));
            
            // 캐시 저장
            localStorage.setItem('holidays', JSON.stringify([...this.holidays]));
            localStorage.setItem('holidaysLastUpdate', now.toString());
            
            // 공휴일 목록 업데이트
            this.renderHolidayList();
        } else {
            // API 호출 실패시 기본 데이터 사용
            console.warn("API 호출 실패, 기본 공휴일 데이터 사용");
            this.holidays = new Set(HOLIDAYS_2024.map(h => h.date));
        }

    } catch (error) {
        console.error("❌ 공휴일 데이터 로드 실패:", error);
        // 오류 시 기본 공휴일 데이터 사용
        this.holidays = new Set(HOLIDAYS_2024.map(h => h.date));
    }
    this.render();
}

async fetchHolidays(year) {
    try {
        const params = new URLSearchParams({
            ServiceKey: HOLIDAY_API_CONFIG.key,
            solYear: year,
            _type: 'json',
            numOfRows: 100
        });

        const response = await fetch(`${HOLIDAY_API_CONFIG.url}?${params}`);
        const data = await response.json();

        if (data.response.body.items.item) {
            return data.response.body.items.item.map(item => ({
                date: `${item.locdate}`.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
                name: item.dateName
            }));
        }
        return null;
    } catch (error) {
        console.error("❌ 공휴일 API 호출 실패:", error);
        return null;
    }
}

renderHolidayList() {
    const container = document.getElementById('holidayList');
    if (!container) return;

    const sortedHolidays = [...this.holidays].sort();
    let html = '';
    
    // API에서 가져온 공휴일 데이터 표시
    sortedHolidays.forEach(date => {
        const holiday = HOLIDAYS_2024.find(h => h.date === date);
        html += `
            <div class="holiday-item">
                <span>${date}</span>
                <span>${holiday ? holiday.name : '공휴일'}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 제작일 계산
async function calculateProduction(baseDate) {
    try {
        const snapshot = await itemsCollection.get();
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));
        
        const result = [];
        for (const item of items) {
            let count = 0;
            let tempDate = new Date(baseDate);
            while (count < item.days) {
                tempDate.setDate(tempDate.getDate() + 1);
                if (!isHolidayOrWeekend(tempDate)) count++;
            }
            result.push({
                name: item.name,
                date: tempDate.toISOString().slice(0, 10),
                color: item.color
            });
        }
        return result;
    } catch (error) {
        console.error("❌ 제작일 계산 실패:", error);
        return [];
    }
}

// 이벤트 생성
async function generateEvents(baseDate) {
    try {
        const events = [];
        
        // 항목별 제작일 이벤트
        const result = await calculateProduction(baseDate);
        result.forEach(item => {
            events.push({
                title: item.name,
                start: item.date,
                color: item.color
            });
        });
        
        // 공휴일 이벤트
        holidays.forEach(h => {
            events.push({
                title: "공휴일",
                start: h,
                display: 'background',
                className: "holiday"
            });
        });
        
        return events;
    } catch (error) {
        console.error("❌ 이벤트 생성 실패:", error);
        return [];
    }
}

// 비밀번호 체크
function checkPassword() {
    try {
        const input = document.getElementById("adminPassword").value;
        if (input === ADMIN_PASSWORD) {
            document.getElementById("adminPanel").style.display = 'block';
            document.getElementById("loginPanel").style.display = 'none';
        } else {
            alert("비밀번호가 틀렸습니다.");
        }
    } catch (error) {
        console.error("❌ 비밀번호 체크 실패:", error);
    }
}

// 항목 백업 다운로드
async function downloadItems() {
    try {
        const snapshot = await itemsCollection.get();
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));
        
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'items_backup.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("❌ 백업 다운로드 실패:", error);
        alert("백업 실패: " + error.message);
    }
}

// Calendar 클래스 정의
class Calendar {
    constructor(container) {
        this.container = container;
        this.date = new Date();
        this.events = new Map();
        this.holidays = new Set();
        this.vacations = new Map();
        this.memos = new Map();
        this.selectedDate = new Date();
        this.items = [];
        
        // 로컬 데이터 로드
        this.loadLocalData();
        
        // 공휴일 API 데이터 로드
        this.loadHolidays();
        
        this.render();
        this.setupEventListeners();
    }

    loadLocalData() {
        try {
            // 제작 항목 로드
            const savedItems = localStorage.getItem('productionItems');
            this.items = savedItems ? JSON.parse(savedItems) : [];

            // 휴가 일정 로드
            const savedVacations = localStorage.getItem('vacations');
            this.vacations = new Map(savedVacations ? JSON.parse(savedVacations) : []);

            // 메모 로드
            const savedMemos = localStorage.getItem('memos');
            this.memos = new Map(savedMemos ? JSON.parse(savedMemos) : []);

        } catch (error) {
            console.error("❌ 로컬 데이터 로드 실패:", error);
        }
    }

    async loadHolidays() {
        try {
            // 캐시된 공휴일 데이터 확인
            const cachedHolidays = localStorage.getItem('holidays');
            const lastUpdate = localStorage.getItem('holidaysLastUpdate');
            const now = new Date().getTime();

            // 캐시가 24시간 이내인 경우 사용
            if (cachedHolidays && lastUpdate && (now - parseInt(lastUpdate)) < 24 * 60 * 60 * 1000) {
                this.holidays = new Set(JSON.parse(cachedHolidays));
                this.renderHolidayList();
                return;
            }

            // 현재 연도의 공휴일 데이터 가져오기
            const year = new Date().getFullYear();
            const holidays = await this.fetchHolidays(year);
            
            if (holidays && holidays.length > 0) {
                this.holidays = new Set(holidays.map(h => h.date));
                
                // 캐시 저장
                localStorage.setItem('holidays', JSON.stringify([...this.holidays]));
                localStorage.setItem('holidaysLastUpdate', now.toString());
                
                // 공휴일 목록 업데이트
                this.renderHolidayList();
            } else {
                // API 호출 실패시 기본 데이터 사용
                console.warn("API 호출 실패, 기본 공휴일 데이터 사용");
                this.holidays = new Set(HOLIDAYS_2024.map(h => h.date));
            }

        } catch (error) {
            console.error("❌ 공휴일 데이터 로드 실패:", error);
            // 오류 시 기본 공휴일 데이터 사용
            this.holidays = new Set(HOLIDAYS_2024.map(h => h.date));
        }
        this.render();
    }

    async fetchHolidays(year) {
        try {
            const params = new URLSearchParams({
                ServiceKey: HOLIDAY_API_CONFIG.key,
                solYear: year,
                _type: 'json',
                numOfRows: 100
            });

            const response = await fetch(`${HOLIDAY_API_CONFIG.url}?${params}`);
            const data = await response.json();

            if (data.response.body.items.item) {
                return data.response.body.items.item.map(item => ({
                    date: `${item.locdate}`.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
                    name: item.dateName
                }));
            }
            return null;
        } catch (error) {
            console.error("❌ 공휴일 API 호출 실패:", error);
            return null;
        }
    }

    renderHolidayList() {
        const container = document.getElementById('holidayList');
        if (!container) return;

        const sortedHolidays = [...this.holidays].sort();
        let html = '';
        
        // API에서 가져온 공휴일 데이터 표시
        sortedHolidays.forEach(date => {
            const holiday = HOLIDAYS_2024.find(h => h.date === date);
            html += `
                <div class="holiday-item">
                    <span>${date}</span>
                    <span>${holiday ? holiday.name : '공휴일'}</span>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    setupEventListeners() {
        // 날짜 클릭 이벤트
        this.container.addEventListener('click', (e) => {
            const cell = e.target.closest('.calendar-cell');
            if (cell && cell.dataset.date) {
                this.onDateClick(new Date(cell.dataset.date));
            }
        });

        // 관리자 기능 이벤트
        if (isAdmin) {
            const addButton = document.getElementById('addItemButton');
            const saveButton = document.getElementById('saveButton');
            if (addButton) addButton.addEventListener('click', () => this.addItem());
            if (saveButton) saveButton.addEventListener('click', () => this.saveItems());

            // 휴가 관리
            const addVacationBtn = document.getElementById('addVacationButton');
            const saveVacationBtn = document.getElementById('saveVacationButton');
            const updateHolidaysBtn = document.getElementById('updateHolidaysButton');

            if (addVacationBtn) {
                addVacationBtn.addEventListener('click', () => this.addVacation());
            }
            if (saveVacationBtn) {
                saveVacationBtn.addEventListener('click', () => this.saveVacations());
            }
            if (updateHolidaysBtn) {
                updateHolidaysBtn.addEventListener('click', () => this.updateHolidays());
            }
        }
    }

    isHolidayOrWeekend(date) {
        const day = date.getDay();
        const dateStr = this.formatDate(date);
        return this.holidays.has(dateStr) || day === 0 || day === 6;
    }

    async calculateProductionDates(baseDate) {
        try {
            const result = [];
            for (const item of this.items) {
                let count = 0;
                let tempDate = new Date(baseDate);
                while (count < item.days) {
                    tempDate.setDate(tempDate.getDate() + 1);
                    if (!this.isHolidayOrWeekend(tempDate)) {
                        count++;
                    }
                }
                result.push({
                    name: item.name,
                    date: this.formatDate(tempDate),
                    color: item.color
                });
            }
            return result;
        } catch (error) {
            console.error("❌ 제작일 계산 실패:", error);
            return [];
        }
    }

    async onDateClick(date) {
        this.selectedDate = date;
        try {
            const result = await this.calculateProductionDates(date);
            
            // 기존 생성된 이벤트 제거
            this.events.clear();
            
            // 새로운 이벤트 추가
            result.forEach(item => {
                if (!this.events.has(item.date)) {
                    this.events.set(item.date, []);
                }
                this.events.get(item.date).push({
                    title: `[${item.name}] 제작일`,
                    color: item.color
                });
            });
            
            this.render();
        } catch (error) {
            console.error("❌ 날짜 클릭 처리 실패:", error);
            alert("일정 생성에 실패했습니다. 다시 시도해주세요.");
        }
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    addMemo(date, text, color = '#FFFFFF') {
        const dateStr = this.formatDate(date);
        this.memos.set(dateStr, { text, color });
        this.render();
    }

    render() {
        const year = this.date.getFullYear();
        const month = this.date.getMonth();
        const today = new Date();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 달력 그리드 생성
        let html = `
            <div class="calendar-header">
                <button class="prev-month">&lt;</button>
                <h2>${year}년 ${month + 1}월</h2>
                <button class="next-month">&gt;</button>
            </div>
            <div class="calendar-grid">
                <div class="weekday">일</div>
                <div class="weekday">월</div>
                <div class="weekday">화</div>
                <div class="weekday">수</div>
                <div class="weekday">목</div>
                <div class="weekday">금</div>
                <div class="weekday">토</div>
        `;

        // 이전 달의 마지막 날짜들
        const prevMonthDays = firstDay.getDay();
        const prevMonth = new Date(year, month, 0);
        for (let i = prevMonthDays - 1; i >= 0; i--) {
            const date = new Date(year, month - 1, prevMonth.getDate() - i);
            const dateStr = this.formatDate(date);
            html += this.createDateCell(date, dateStr, 'prev-month');
        }

        // 현재 달의 날짜들
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            const dateStr = this.formatDate(date);
            html += this.createDateCell(date, dateStr, 'current-month');
        }

        // 다음 달의 시작 날짜들
        const nextMonthDays = 42 - (prevMonthDays + lastDay.getDate());
        for (let i = 1; i <= nextMonthDays; i++) {
            const date = new Date(year, month + 1, i);
            const dateStr = this.formatDate(date);
            html += this.createDateCell(date, dateStr, 'next-month');
        }

        html += '</div>';
        this.container.innerHTML = html;

        // 이벤트 리스너 추가
        this.container.querySelector('.prev-month').addEventListener('click', () => this.prevMonth());
        this.container.querySelector('.next-month').addEventListener('click', () => this.nextMonth());
    }

    createDateCell(date, dateStr, className) {
        const isToday = this.formatDate(new Date()) === dateStr;
        const isSelected = this.formatDate(this.selectedDate) === dateStr;
        const isHoliday = this.isHolidayOrWeekend(date);
        const events = this.events.get(dateStr) || [];
        const memo = this.memos.get(dateStr);

        let cellClass = `calendar-cell ${className}`;
        if (isToday) cellClass += ' today';
        if (isSelected) cellClass += ' selected';
        if (isHoliday) cellClass += ' holiday';

        let html = `<div class="${cellClass}" data-date="${dateStr}">
            <span class="date">${date.getDate()}</span>`;

        // 이벤트 표시
        events.forEach(event => {
            html += `<div class="event" style="background-color: ${event.color}">${event.title}</div>`;
        });

        // 메모 표시
        if (memo) {
            html += `<div class="memo" style="background-color: ${memo.color}">${memo.text}</div>`;
        }

        html += '</div>';
        return html;
    }

    prevMonth() {
        this.date.setMonth(this.date.getMonth() - 1);
        this.render();
    }

    nextMonth() {
        this.date.setMonth(this.date.getMonth() + 1);
        this.render();
    }

    // 관리자 기능
    addItem() {
        const container = document.getElementById('itemsContainer');
        if (!container) return;

        const index = container.querySelectorAll('div').length;
        const itemHtml = `
            <div>
                이름: <input id="name_${index}">
                영업일: <input type="number" id="days_${index}">
                색상: <input type="color" id="color_${index}" value="#cccccc">
                <button onclick="calendar.removeItem(null, ${index})">삭제</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
    }

    async removeItem(id, index) {
        try {
            if (id) {
                await this.itemsCollection.doc(id).delete();
            } else {
                const div = document.querySelector(`#itemsContainer div:nth-child(${index + 1})`);
                if (div) div.remove();
            }
        } catch (error) {
            console.error("❌ 항목 삭제 실패:", error);
            alert("삭제 실패: " + error.message);
        }
    }

    async saveItems() {
        try {
            const container = document.getElementById('itemsContainer');
            if (!container) return;

            const items = [];
            const divs = container.querySelectorAll('div');
            
            for (let i = 0; i < divs.length; i++) {
                const name = document.getElementById(`name_${i}`).value.trim();
                const days = parseInt(document.getElementById(`days_${i}`).value);
                const color = document.getElementById(`color_${i}`).value;

                if (!name) throw new Error("항목 이름을 입력해주세요.");
                if (isNaN(days) || days <= 0) throw new Error("유효한 영업일을 입력해주세요.");

                items.push({ name, days, color });
            }

            // 기존 항목 삭제
            const snapshot = await this.itemsCollection.get();
            const batch = this.db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // 새 항목 추가
            const addBatch = this.db.batch();
            for (const item of items) {
                const docRef = this.itemsCollection.doc();
                addBatch.set(docRef, {
                    ...item,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            await addBatch.commit();

            alert("저장 완료!");
            this.loadItems();
        } catch (error) {
            console.error("❌ 저장 실패:", error);
            alert("저장 실패: " + error.message);
        }
    }

    addVacation() {
        const startDate = document.getElementById('vacationStart').value;
        const endDate = document.getElementById('vacationEnd').value;
        const desc = document.getElementById('vacationDesc').value;

        if (!startDate || !endDate || !desc) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        const vacation = {
            start: startDate,
            end: endDate,
            description: desc
        };

        const id = Date.now().toString();
        this.vacations.set(id, vacation);
        this.renderVacationList();
        this.render();
    }

    removeVacation(id) {
        this.vacations.delete(id);
        this.renderVacationList();
        this.render();
    }

    saveVacations() {
        try {
            localStorage.setItem('vacations', JSON.stringify([...this.vacations]));
            alert('휴가 일정이 저장되었습니다.');
        } catch (error) {
            console.error("❌ 휴가 일정 저장 실패:", error);
            alert('휴가 일정 저장에 실패했습니다.');
        }
    }

    renderVacationList() {
        const container = document.getElementById('vacationList');
        if (!container) return;

        let html = '';
        this.vacations.forEach((vacation, id) => {
            html += `
                <div class="vacation-item">
                    <span>${vacation.start} ~ ${vacation.end}: ${vacation.description}</span>
                    <button onclick="calendar.removeVacation('${id}')">삭제</button>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    async updateHolidays() {
        try {
            // TODO: 공공데이터포털 API 호출
            await this.loadHolidays();
            this.renderHolidayList();
            alert('공휴일 정보가 업데이트되었습니다.');
        } catch (error) {
            console.error("❌ 공휴일 업데이트 실패:", error);
            alert('공휴일 업데이트에 실패했습니다.');
        }
    }
}

// DOM이 로드된 후 캘린더 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    window.calendar = new Calendar(document.getElementById('calendar'));
}); 