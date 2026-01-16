import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

const rooms = new Map();

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const roomId = url.searchParams.get('room') || 'default';
    const mode = url.searchParams.get('mode') || 'both'; // 'controller', 'display', 'both'
    
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    
    const room = rooms.get(roomId);
    const client = { ws, mode };
    room.add(client);
    
    console.log(`Client joined room: ${roomId} as ${mode}`);
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        // Broadcast to all other clients in the room
        room.forEach((c) => {
            if (c.ws !== ws && c.ws.readyState === 1) {
                // Only send control messages to displays
                if (c.mode === 'display' || c.mode === 'both') {
                    c.ws.send(JSON.stringify(message));
                }
            }
        });
    });
    
    ws.on('close', () => {
        room.delete(client);
        if (room.size === 0) {
            rooms.delete(roomId);
        }
    });
});

console.log('WebSocket server running on ws://localhost:8080');