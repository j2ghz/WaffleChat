var db = require('./database/conn');
//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(io) {
  io.on('connection', function(socket) {
    var session = socket.request.session;
    if (session.passport !== undefined) {
        if (session.passport.user !== undefined) {
            db.get('SELECT username FROM users WHERE id = ?', session.passport.user, function(err, row) {
                socket.username = row.username;
                console.log(socket.username + ' connected'); 
            }); 
        } else {
            socket.username = null;
            console.log('previously logged user connected');
        }       
    } else {
        socket.username = null;
        console.log('user connected');
    }
    
    //on connection list all threads
    db.all('SELECT id, name FROM threads', function(err, rows) {
        socket.emit('printThreads', rows);
    });  
    
    //on user creating a thread
    socket.on('createThread', function(name) {
        db.run("INSERT INTO threads ('name') VALUES (?)", name);
        db.all('SELECT id, name FROM threads', function(err, rows) {
            io.emit('printThreads', rows); //update everyone's list upon creation of new one
        });
    });
    
    //on user joining thread
    socket.on('joinThread', function(id) {
        if (socket.rooms.indexOf(id) === -1) {  
            socket.join(id);
            db.get('SELECT name FROM threads WHERE id = ?', id, function(err, row) {
                socket.emit('createThreadElement', id, row.name);  
            });    
            db.all('SELECT content, sender FROM messages WHERE thread = ?', id, function(err, messagesRows) {
                var counter = 0; //counter due to db being async
                messagesRows.forEach(function(messagesRow) {
                    db.get('SELECT username FROM users WHERE id = ?', messagesRow.sender, function(err, usersRow) {
                        messagesRow.sender = usersRow.username;
                        counter++;
                        if(counter === messagesRows.length) {
                            socket.emit('printMessages', messagesRows, id); //display messages to socket upon joining
                        }
                    });
                });

            });
        }
    });
    
    //on user leaving thread
    socket.on('leaveThread', function(id) {
        
    });
     
    //on message being sent
    socket.on('message', function(content, thread) {
        io.in(thread).emit('message', content, thread, socket.username);
        db.run("INSERT INTO messages ('thread', 'sender', 'content') VALUES (?, ?, ?)", thread, session.passport.user, content);
    });
    
    //on disconnect of socket    
    socket.on('disconnect', function() {
        console.log(socket.username + ' disconnected');
    });  
  });
}
