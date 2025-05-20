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

    // ... 나머지 Calendar 클래스 코드 ...
} 