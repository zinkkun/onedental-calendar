class DateCalculator {
    constructor(holidays = {}) {
        this.holidays = holidays;
    }

    isHoliday(date) {
        // 주말 체크
        if (date.getDay() >= 5) { // 5: 토요일, 6: 일요일
            return true;
        }

        // 공휴일 체크
        const dateStr = this.formatDate(date);
        return dateStr in this.holidays;
    }

    getNextWorkingDay(startDate, daysToAdd) {
        let currentDate = new Date(startDate);
        let daysAdded = 0;

        while (daysAdded < daysToAdd) {
            currentDate.setDate(currentDate.getDate() + 1);
            if (!this.isHoliday(currentDate)) {
                daysAdded++;
            }
        }

        return currentDate;
    }

    calculateCustomDates(startDate, dateItems) {
        const result = {};

        if (!dateItems || dateItems.length === 0) {
            // 기본값 사용
            result['zir'] = this.getNextWorkingDay(startDate, 2);
            result['copping'] = this.getNextWorkingDay(startDate, 3);
            return result;
        }

        for (const item of dateItems) {
            if (item.name && item.days) {
                result[item.name] = this.getNextWorkingDay(startDate, item.days);
            }
        }

        return result;
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// 공휴일 데이터를 API에서 가져오는 함수
async function fetchHolidaysFromAPI(year) {
    try {
        const API_KEY = 'Odn5P4fvXa%252Fhed175UJOP2MxbRubv5HMTtXmg2D3Nr1emNh5fuVKfs3%252FCaqBt2D%252F9zu1J7w1KFOf9u%252BIsRkbOQ%253D%253D';
        const url = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo?serviceKey=${API_KEY}&solYear=${year}&_type=json`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.response?.body?.items?.item) {
            const holidays = {};
            const items = Array.isArray(data.response.body.items.item) 
                ? data.response.body.items.item 
                : [data.response.body.items.item];
            
            items.forEach(item => {
                const date = `${item.solYear}-${String(item.solMonth).padStart(2, '0')}-${String(item.solDay).padStart(2, '0')}`;
                holidays[date] = item.dateName;
            });
            
            return holidays;
        }
        return {};
    } catch (error) {
        console.error('공휴일 API 호출 실패:', error);
        return {};
    }
}

// 공휴일 데이터를 로드하고 업데이트하는 함수
async function loadHolidays() {
    try {
        // 현재 연도와 다음 연도의 공휴일 데이터 가져오기
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        
        const [currentYearHolidays, nextYearHolidays] = await Promise.all([
            fetchHolidaysFromAPI(currentYear),
            fetchHolidaysFromAPI(nextYear)
        ]);
        
        // 두 연도의 공휴일 데이터 병합
        const holidays = { ...currentYearHolidays, ...nextYearHolidays };
        
        // 로컬 스토리지에 저장
        localStorage.setItem('holidays', JSON.stringify(holidays));
        localStorage.setItem('holidaysLastUpdated', new Date().toISOString());
        
        return holidays;
    } catch (error) {
        console.error('공휴일 데이터 로드 실패:', error);
        // API 호출 실패시 로컬 스토리지의 데이터 사용
        const cachedHolidays = localStorage.getItem('holidays');
        return cachedHolidays ? JSON.parse(cachedHolidays) : {};
    }
}

// 공휴일 데이터가 최신인지 확인하는 함수
function isHolidaysDataStale() {
    const lastUpdated = localStorage.getItem('holidaysLastUpdated');
    if (!lastUpdated) return true;
    
    const lastUpdateDate = new Date(lastUpdated);
    const now = new Date();
    const daysSinceUpdate = (now - lastUpdateDate) / (1000 * 60 * 60 * 24);
    
    // 7일 이상 지났으면 데이터 갱신
    return daysSinceUpdate >= 7;
}

// 날짜 계산 함수
async function calculateDates(startDate, dateItems) {
    // 공휴일 데이터가 오래되었거나 없는 경우 새로 가져오기
    if (isHolidaysDataStale()) {
        const holidays = await loadHolidays();
        const calculator = new DateCalculator(holidays);
        return calculator.calculateCustomDates(new Date(startDate), dateItems);
    } else {
        // 캐시된 데이터 사용
        const holidays = JSON.parse(localStorage.getItem('holidays') || '{}');
        const calculator = new DateCalculator(holidays);
        return calculator.calculateCustomDates(new Date(startDate), dateItems);
    }
} 