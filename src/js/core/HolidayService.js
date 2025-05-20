import { storage } from '../utils/index.js';
import { HOLIDAY_API_CONFIG, HOLIDAYS_2024 } from '../config/index.js';

class HolidayService {
    constructor() {
        this.holidays = new Set();
    }

    // ... 나머지 HolidayService 클래스 코드 ...
}

export const holidayService = new HolidayService(); 