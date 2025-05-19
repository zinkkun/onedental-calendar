
const PASSWORD = "make1234";
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === '1';

let holidays = [];

async function loadHolidays() {
  const res = await fetch("/get_holidays");
  holidays = await res.json();
}

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
  divs[index].remove();
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

document.addEventListener('DOMContentLoaded', async function() {
  console.log("📅 JS 로딩됨");
  if (isAdmin) {
    document.getElementById("loginPanel").style.display = 'block';
  }
  await loadHolidays();

  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ko',
    dateClick: function(info) {
      calculateProduction(info.date).then(result => alert(`${info.dateStr} → 제작일수 기준 계산:\n${result}`));
    },
    events: await generateEvents()
  });
  calendar.render();
});
