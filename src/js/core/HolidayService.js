import { HOLIDAY_API_CONFIG, HOLIDAYS_2024 } from '../config/index.js';
import { showLoading, hideLoading } from '../utils/index.js';

class HolidayService {
    constructor() {
        this.holidays = new Map();
        this.initialize();
    }

    initialize() {
        // 기본 공휴일 데이터 로드
        HOLIDAYS_2024.forEach(holiday => {
            this.holidays.set(holiday.date, holiday.name);
        });
    }

    async fetchHolidays(year) {
        try {
            showLoading();
            const response = await fetch(`${HOLIDAY_API_CONFIG.url}?serviceKey=${HOLIDAY_API_CONFIG.key}&solYear=${year}&numOfRows=100&_type=json`);
            const data = await response.json();
            
            if (data.response?.body?.items?.item) {
                const items = Array.isArray(data.response.body.items.item) 
                    ? data.response.body.items.item 
                    : [data.response.body.items.item];

                items.forEach(item => {
                    const date = `${item.locdate}`.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                    this.holidays.set(date, item.dateName);
                });
            }
        } catch (error) {
            console.error('❌ 공휴일 데이터 로드 실패:', error);
        } finally {
            hideLoading();
        }
    }

    isHoliday(date) {
        return this.holidays.has(date);
    }

    getHolidayName(date) {
        return this.holidays.get(date);
    }
}

export const holidayService = new HolidayService(); 