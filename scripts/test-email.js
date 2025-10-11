const testContactAPI = async () => {
    try {
        const response = await fetch('http://localhost:3001/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Test User',
                email: 'test@example.com',
                messageType: ['Suggestion'],
                message: 'This is a test message'
            }),
        });

        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response:', result);
    } catch (error) {
        console.error('Test failed:', error);
    }
};

testContactAPI();