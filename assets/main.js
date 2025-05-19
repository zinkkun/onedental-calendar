
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
      const calendar = info.view.calendar;
      const result = await calculateProduction(info.date);

      // 기존 표시 제거
      calendar.getEvents().forEach(e => {
        if (e.extendedProps.generated) e.remove();
      });

      // 줄 단위로 이벤트 추가
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
    events: await generateEvents()
  });

  calendar.render();
});

function isHolidayOrWeekend(date) {
  const iso = date.toISOString().slice(0, 10);
  const day = date.getDay();
  return holidays.includes(iso) || day === 0 || day === 6;
}

async function loadItems() {
  const res = await fetch("config/items.json");
  return await res.json();
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

async function generateEvents() {
  const today = new Date();
  const items = await loadItems();
  const events = [];
  for (const item of items) {
    let date = new Date(today);
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
