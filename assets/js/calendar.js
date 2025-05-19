const PASSWORD = "make1234";
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === '1';

let calendar;
let holidays = [];

// Firebase 컬렉션 참조
const itemsCollection = db.collection('items');
const holidaysCollection = db.collection('holidays');

document.addEventListener('DOMContentLoaded', async function() {
    console.log("📅 시작됨");

    if (isAdmin) {
        document.getElementById("loginPanel").style.display = 'block';
    }

    // 공휴일 데이터 로드
    await loadHolidays();
    
    // 캘린더 초기화
    initializeCalendar();
    
    // Firebase에서 실시간으로 항목 변경 감지
    subscribeToItems();
});

// 캘린더 초기화
async function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ko',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        dateClick: handleDateClick,
        eventClick: handleEventClick,
        events: await generateEvents(new Date())
    });
    
    calendar.render();
}

// 날짜 클릭 처리
async function handleDateClick(info) {
    if (!calendar) return;
    
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
}

// 이벤트 클릭 처리
function handleEventClick(info) {
    if (isAdmin) {
        const event = info.event;
        if (confirm(`"${event.title}" 일정을 삭제하시겠습니까?`)) {
            event.remove();
            // Firestore에서도 삭제
            if (event.extendedProps.firestoreId) {
                db.collection('events').doc(event.extendedProps.firestoreId).delete();
            }
        }
    }
}

// Firebase에서 항목 실시간 구독
function subscribeToItems() {
    itemsCollection.onSnapshot(snapshot => {
        const items = [];
        snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });
        console.log("✅ 항목 업데이트됨:", items);
        if (isAdmin) {
            updateItemsContainer(items);
        }
    });
}

// 관리자 패널의 항목 컨테이너 업데이트
function updateItemsContainer(items) {
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
}

// 새 항목 추가
function addItem() {
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
}

// 항목 삭제
async function removeItem(id, index) {
    if (id) {
        // Firestore에서 삭제
        await itemsCollection.doc(id).delete();
    } else {
        // 새로 추가된 항목은 그냥 DOM에서만 제거
        const divs = document.querySelectorAll("#itemsContainer div");
        if (divs[index]) divs[index].remove();
    }
}

// 항목 저장
async function saveItems() {
    const items = [];
    const divs = document.querySelectorAll("#itemsContainer div");
    
    for (let i = 0; i < divs.length; i++) {
        const name = document.getElementById(`name_${i}`).value;
        const days = parseInt(document.getElementById(`days_${i}`).value);
        const color = document.getElementById(`color_${i}`).value;
        
        if (name && !isNaN(days)) {
            // Firestore에 저장
            await itemsCollection.add({
                name,
                days,
                color,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    
    alert("저장 완료!");
}

// 공휴일 체크
function isHolidayOrWeekend(date) {
    const iso = date.toISOString().slice(0, 10);
    const day = date.getDay();
    return holidays.includes(iso) || day === 0 || day === 6;
}

// 공휴일 로드
async function loadHolidays() {
    try {
        const snapshot = await holidaysCollection.get();
        holidays = [];
        snapshot.forEach(doc => {
            holidays.push(doc.data().date);
        });
        console.log("✅ 공휴일 목록 로드 완료:", holidays);
    } catch (e) {
        console.error("❌ 공휴일 로딩 실패:", e);
        holidays = [];
    }
}

// 제작일 계산
async function calculateProduction(baseDate) {
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
}

// 이벤트 생성
async function generateEvents(baseDate) {
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
}

// 비밀번호 체크
function checkPassword() {
    const input = document.getElementById("adminPassword").value;
    if (input === PASSWORD) {
        document.getElementById("adminPanel").style.display = 'block';
        document.getElementById("loginPanel").style.display = 'none';
    } else {
        alert("비밀번호가 틀렸습니다.");
    }
}

// 항목 백업 다운로드
async function downloadItems() {
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
} 