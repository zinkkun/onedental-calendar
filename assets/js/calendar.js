const PASSWORD = "make1234";
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === '1';

let calendar;
let holidays = [];

// Firebase 컬렉션 참조
let db;
let itemsCollection;
let holidaysCollection;

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
        const snapshot = await holidaysCollection.get();
        holidays = [];
        snapshot.forEach(doc => {
            holidays.push(doc.data().date);
        });
        console.log("✅ 공휴일 목록 로드 완료:", holidays);
    } catch (error) {
        console.error("❌ 공휴일 로딩 실패:", error);
        holidays = [];
    }
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