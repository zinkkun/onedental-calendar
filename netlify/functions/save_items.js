exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed'
        };
    }

    try {
        const data = JSON.parse(event.body);
        
        // 여기에 데이터 저장 로직을 구현할 수 있습니다.
        // 현재는 단순히 성공 응답만 반환합니다.
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Items saved successfully' })
        };
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request data' })
        };
    }
}; 