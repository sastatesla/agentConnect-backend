const io = require('socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);

    // Simulate sending a message to start a new chat
    // Need valid User IDs. I'll use placeholders or need to fetch them.
    // Ideally, I should fetch users first, but for this test I will just send a dummy message structure 
    // and see if the server processes it (it might fail on DB save if IDs are invalid, but the socket event will trigger).

    // Real verification:
    // We need valid user IDs. I'll Fetch them via API first in a real scenario.
    // For this constrained environment, I will just emit and see if we get a conceptual 'ack' or if server logs show activity.
    // Actually, I can use the ID from the previous curl output: 693c23fa96d9e418de4869cb (Test User)
    // I'll send a message to myself for testing purposes.

    const userId = '693c23fa96d9e418de4869cb';

    socket.emit('send_message', {
        senderId: userId,
        content: 'Hello World from Test Script',
        participants: [userId, userId] // Self-chat
    });
});

socket.on('receive_message', (data) => {
    console.log('Message Received:', data);
    socket.disconnect();
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});
