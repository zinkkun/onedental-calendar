import { storage, formatDate, showLoading, hideLoading } from '../utils/index.js';
import { holidayService } from './HolidayService.js';
import { ADMIN_PASSWORD } from '../config/index.js';

export class Calendar {
    constructor(container) {
        this.container = container;
        this.date = new Date();
        this.events = new Map();
        this.vacations = new Map();
        this.memos = new Map();
        this.selectedDate = new Date();
        this.items = [];
        
        // 초기화
        this.initialize();
    }

    async initialize() {
        // 저장된 데이터 로드
        this.loadData();
        
        // 공휴일 데이터 로드
        await holidayService.fetchHolidays(this.date.getFullYear());
        
        // 캘린더 렌더링
        this.render();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
    }

    loadData() {
        this.events = new Map(storage.get('events', []));
        this.vacations = new Map(storage.get('vacations', []));
        this.memos = new Map(storage.get('memos', []));
        this.items = storage.get('items', []);
    }

    saveData() {
        storage.set('events', Array.from(this.events.entries()));
        storage.set('vacations', Array.from(this.vacations.entries()));
        storage.set('memos', Array.from(this.memos.entries()));
        storage.set('items', this.items);
    }

    setupEventListeners() {
        // 날짜 클릭 이벤트
        this.container.addEventListener('click', (e) => {
            const cell = e.target.closest('.calendar-cell');
            if (cell && cell.dataset.date) {
                this.selectDate(new Date(cell.dataset.date));
            }
        });
    }

    selectDate(date) {
        this.selectedDate = date;
        this.render();
    }

    render() {
        const year = this.date.getFullYear();
        const month = this.date.getMonth();
        
        // 달력 그리드 생성
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';
        
        // 요일 헤더 추가
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        weekdays.forEach(day => {
            const div = document.createElement('div');
            div.className = 'weekday';
            div.textContent = day;
            grid.appendChild(div);
        });
        
        // 날짜 계산
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = new Date(firstDay);
        startDay.setDate(startDay.getDate() - startDay.getDay());
        
        // 날짜 셀 생성
        for (let date = new Date(startDay); date <= lastDay || date.getDay() !== 0; date.setDate(date.getDate() + 1)) {
            const cell = this.createDateCell(date);
            grid.appendChild(cell);
        }
        
        // 컨테이너에 그리드 추가
        this.container.innerHTML = '';
        this.container.appendChild(grid);
    }

    createDateCell(date) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        cell.dataset.date = formatDate(date);
        
        // 날짜 표시
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date';
        dateDiv.textContent = date.getDate();
        cell.appendChild(dateDiv);
        
        // 이전/다음 달 스타일
        if (date.getMonth() !== this.date.getMonth()) {
            cell.classList.add(date < this.date ? 'prev-month' : 'next-month');
        }
        
        // 오늘 날짜 스타일
        if (formatDate(date) === formatDate(new Date())) {
            cell.classList.add('today');
        }
        
        // 선택된 날짜 스타일
        if (formatDate(date) === formatDate(this.selectedDate)) {
            cell.classList.add('selected');
        }
        
        // 공휴일 처리
        const dateStr = formatDate(date);
        if (holidayService.isHoliday(dateStr)) {
            cell.classList.add('holiday');
            const holiday = document.createElement('div');
            holiday.className = 'holiday-name';
            holiday.textContent = holidayService.getHolidayName(dateStr);
            cell.appendChild(holiday);
        }
        
        // 휴가 표시
        if (this.vacations.has(dateStr)) {
            const vacation = document.createElement('div');
            vacation.className = 'event';
            vacation.style.backgroundColor = '#ffcdd2';
            vacation.textContent = this.vacations.get(dateStr).description;
            cell.appendChild(vacation);
        }
        
        // 이벤트 표시
        if (this.events.has(dateStr)) {
            const event = document.createElement('div');
            event.className = 'event';
            event.style.backgroundColor = this.events.get(dateStr).color;
            event.textContent = this.events.get(dateStr).name;
            cell.appendChild(event);
        }
        
        // 메모 표시
        if (this.memos.has(dateStr)) {
            const memo = document.createElement('div');
            memo.className = 'memo';
            memo.textContent = this.memos.get(dateStr);
            cell.appendChild(memo);
        }
        
        return cell;
    }

    // 관리자 기능
    checkPassword(password) {
        return password === ADMIN_PASSWORD;
    }

    addItem(name, days, color) {
        this.items.push({ name, days, color });
        this.saveData();
    }

    removeItem(index) {
        this.items.splice(index, 1);
        this.saveData();
    }

    // 휴가 관리
    addVacation(startDate, endDate, description) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = formatDate(date);
            this.vacations.set(dateStr, { startDate, endDate, description });
        }
        
        this.saveData();
        this.render();
    }

    removeVacation(id) {
        this.vacations.delete(id);
        this.saveData();
        this.render();
    }

    getVacations() {
        return Array.from(this.vacations.entries());
    }

    // 이벤트 관리
    addEvent(date, name, color) {
        this.events.set(formatDate(date), { name, color });
        this.saveData();
    }

    removeEvent(date) {
        this.events.delete(formatDate(date));
        this.saveData();
    }

    // 메모 관리
    addMemo(date, text) {
        this.memos.set(formatDate(date), text);
        this.saveData();
    }

    removeMemo(date) {
        this.memos.delete(formatDate(date));
        this.saveData();
    }
} 