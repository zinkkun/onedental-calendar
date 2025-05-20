// 날짜 포맷팅 유틸리티
export const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

// 로딩 상태 관리
export const showLoading = () => {
    document.getElementById('loading').style.display = 'flex';
};

export const hideLoading = () => {
    document.getElementById('loading').style.display = 'none';
};

// 로컬 스토리지 유틸리티
export const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`❌ 저장 실패 (${key}):`, error);
        }
    },
    
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`❌ 로드 실패 (${key}):`, error);
            return defaultValue;
        }
    }
}; 