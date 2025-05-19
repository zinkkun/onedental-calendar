import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, setDoc, doc, getDocs, onSnapshot } from "firebase/firestore";

const PASSWORD = "make1234";
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === '1';

let holidays = [];

// Firebase 설정 및 초기화
const firebaseConfig = {
  apiKey: "AIzaSyAmXQeQW8Yq_wTBddR7smgsVdQU_TgWVW0",
  authDomain: "onedental-calendar.firebaseapp.com",
  projectId: "onedental-calendar",
  storageBucket: "onedental-calendar.firebasestorage.app",
  messagingSenderId: "668196249825",
  appId: "1:668196249825:web:298c052c05e8d8c02617a0",
  measurementId: "G-957Z4V4NCN"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', async function() {
  console.log("📅 시작됨");

  if (isAdmin) {
    document.getElementById("loginPanel").style.display = 'block';
  }

  try {
    const res = await fetch("/get_holidays");
    holidays = await res.json();
    console.log("✅ 공휴일 목록 로드 완료:", holidays);
  } catch (e) {
    console.error("❌ 공휴일 로딩 실패:", e);
    holidays = [];
  }

  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ko',
    dateClick: async function(info) {
      const calendar = info.view.calendar;
      const result = await calculateProduction(info.date);

      calendar.getEvents().forEach(e => {
        if (e.extendedProps.generated) e.remove();
      });

      result.split('\n').forEach(line => {
        const parts = line.split(": ");
        if (parts.length === 2) {
          const title = parts[0];
          const dateStr = parts[1];
          calendar.addEvent({
            title: `[${title}] 제작일`,
            start: dateStr,
            display: 'block',
            backgroundColor: '#e0e0e0',
            borderColor: '#888',
            textColor: '#000',
            extendedProps: { generated: true }
          });
        }
      });
    },
    events: await generateEvents(new Date())
  });

  calendar.render();
});

function checkPassword() {
  const input = document.getElementById("adminPassword").value;
  if (input === PASSWORD) {
    document.getElementById("adminPanel").style.display = 'block';
    document.getElementById("loginPanel").style.display = 'none';
    loadItemsForEdit();
  } else {
    alert("비밀번호가 틀렸습니다.");
  }
}

function isHolidayOrWeekend(date) {
  const iso = date.toISOString().slice(0, 10);
  const day = date.getDay();
  return holidays.includes(iso) || day === 0 || day === 6;
}

async function loadItems() {
  const res = await fetch("config/items.json");
  return await res.json();
}

async function loadItemsForEdit() {
  const res = await fetch("config/items.json");
  const items = await res.json();
  const container = document.getElementById("itemsContainer");
  container.innerHTML = '';
  items.forEach((item, index) => {
    container.innerHTML += `
      <div>
        이름: <input value="${item.name}" id="name_${index}">
        영업일: <input type="number" value="${item.days}" id="days_${index}">
        색상: <input type="color" value="${item.color}" id="color_${index}">
        <button onclick="removeItem(${index})">삭제</button>
      </div>
    `;
  });
}

function addItem() {
  const container = document.getElementById("itemsContainer");
  const index = document.querySelectorAll("#itemsContainer div").length;
  container.innerHTML += `
    <div>
      이름: <input id="name_${index}">
      영업일: <input type="number" id="days_${index}">
      색상: <input type="color" id="color_${index}" value="#cccccc">
      <button onclick="removeItem(${index})">삭제</button>
    </div>
  `;
}

function removeItem(index) {
  const divs = document.querySelectorAll("#itemsContainer div");
  if (divs[index]) divs[index].remove();
}

function saveItems() {
  const items = [];
  const divs = document.querySelectorAll("#itemsContainer div");
  divs.forEach((div, i) => {
    const name = document.getElementById(`name_${i}`).value;
    const days = parseInt(document.getElementById(`days_${i}`).value);
    const color = document.getElementById(`color_${i}`).value;
    if (name && !isNaN(days)) {
      items.push({ name, days, color });
    }
  });
  fetch('/save_items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items)
  }).then(() => alert("저장 완료!"));
}

function downloadItems() {
  fetch('config/items.json')
    .then(res => res.json())
    .then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'items_backup.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
}

async function calculateProduction(baseDate) {
  const items = await loadItems();
  const result = [];
  for (const item of items) {
    let count = 0;
    let tempDate = new Date(baseDate);
    while (count < item.days) {
      tempDate.setDate(tempDate.getDate() + 1);
      if (!isHolidayOrWeekend(tempDate)) count++;
    }
    result.push(`${item.name}: ${tempDate.toISOString().slice(0, 10)}`);
  }
  return result.join('\n');
}

async function generateEvents(baseDate) {
  const items = await loadItems();
  const events = [];
  for (const item of items) {
    let date = new Date(baseDate);
    let count = 0;
    while (count < item.days) {
      date.setDate(date.getDate() + 1);
      if (!isHolidayOrWeekend(date)) count++;
    }
    events.push({ title: item.name, start: date.toISOString().slice(0, 10), color: item.color });
  }

  for (const h of holidays) {
    events.push({ title: "공휴일", start: h, display: 'background', className: "holiday" });
  }

  return events;
}

// 캘린더 항목 저장 함수
function saveCalendarItem(item) {
  // item: {date: "2024-06-10", title: "ZIR 제작", memo: "비고"}
  db.collection("calendarItems").add(item)
    .then(() => alert("저장 완료!"))
    .catch((error) => alert("저장 실패: " + error));
}

// 캘린더 항목 실시간 구독 함수
function subscribeCalendarItems(callback) {
  db.collection("calendarItems").orderBy("date").onSnapshot(snapshot => {
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    callback(items);
  });
}

// 예시: 저장
// saveCalendarItem({date: "2024-06-10", title: "ZIR 제작", memo: "비고"});

// 예시: 실시간 구독
subscribeCalendarItems(function(items) {
  console.log("실시간 캘린더 항목:", items);
  // 여기서 화면에 캘린더를 갱신하면 됩니다
});
