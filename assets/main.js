
const PASSWORD = "make1234";
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === '1';

let holidays = [];

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
      const result = await calculateProduction(info.date);
      alert(`${info.dateStr} → 제작일 기준 계산:\n${result}`);
    },
    events: await generateEvents()
  });

  calendar.render();
});

// 나머지 함수들은 생략 — 원래 main.js 내부와 동일하게 구성되어야 함
