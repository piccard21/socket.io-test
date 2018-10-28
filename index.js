var connectedUsers = {};
// In your .on('connection') function, add that socket to your new object. 
// 	connectedUsers[USER_NAME_HERE] = socket; 
// Then you can easily retrieve it later. 
// 	connectedUsers[USER_NAME_HERE].emit('something', 'something');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var online = []
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
io.on('connection', function(socket) {
    if (typeof socket.handshake.query.nickname != "undefined") {
        let name = decodeURIComponent(socket.handshake.query.nickname.replace(/\+/g, '%20'))
        if (!online.find(e => e.name == name)) {
            online.push({
                socket,
                name
            })
        }
        io.emit('online', online.map(e => e.name));
    }
    socket.on('chat message', function(data) {
        // io.emit('chat message',data);
        socket.broadcast.emit('chat message', data);
        data.msg = 'i am in room one'
        io.sockets.in('room-one').emit('chat message', data);
    });
    socket.on('private message', function(data) {
        let user = online.find(e => e.name == data.to)
        io.to(user.socket.id).emit('chat message', {
            name: data.from,
            msg: "private: " + data.msg
        });
    });
    // socket.broadcast.emit('chat message', 'hello friends!');
    socket.on('room', function(data) {
        socket.join(data.room);
        socket.to('room-one').emit('chat message', {
            name: data.name,
            msg: "has entered the room"
        });
    });
    socket.on('room-leave', function(room) {
        socket.leave(room);
    });
    socket.on('typing', function(data) {
        socket.broadcast.emit('typing', data);
    });
    socket.on('disconnect', function() {
        let index = online.findIndex(e => e.socket.id === socket.id)
        online.splice(index, 1)
        io.emit('online', online.map(e => e.name));
    });
});
var nsp = io.of('/my-namespace');
nsp.on('connection', function(socket) {
    socket.on('ns-chat-message', function(msg) {
        nsp.emit('ns-chat-message', msg);
        socket.broadcast.emit('ns-chat-message', 'hello friends!');
    });
});
nsp.emit('ns-hi', 'everyone!');
http.listen(port, function() {
    console.log('listening on *:' + port);
});