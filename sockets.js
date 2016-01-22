var db = require('./database/conn');
var validator = require('validator');
//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(io) {
  io.on('connection', function(socket) {
    socket._name = null;
    socket._id = null;
    socket._threads = [];
    var session = socket.request.session;
    
    if (session.passport !== undefined) {
        if (session.passport.user !== undefined) {
            db.get('SELECT username FROM users WHERE id = ?', validator.escape(session.passport.user), function(err, row) {
                if (!row) {
                    console.log('user whose id is not in DB connected');
                } else {
                    socket._name = row.username;
                    socket._id = session.passport.user;
                    console.log(socket._name + ' connected');
                    socket.emit('setUsername', socket._name); 
                }
            }); 
        } else {
            console.log('previously logged user connected');
        }       
    } else {
        console.log('user connected');
    }
    
    //on connection list all threads
    db.all('SELECT * FROM threads', function(err, rows) {
        socket.emit('printThreads', rows);
    });  
    
    //on user creating a thread
    socket.on('createThread', function(name) {
        name = validator.escape(validator.trim(name));
        
        if (validator.isLength(name, 1, 255)) {
            db.run("INSERT INTO threads ('name', 'creator') VALUES (?, ?)", name, socket._name, function() {
                io.emit('printThread', this.lastID, name, socket._name); //update everyone's list upon creation of new one    
            });
            socket.emit('showSuccess', '', 'You have created a room called ' + name + '.');
        } else {
            if (name === '') {
                socket.emit('showError', '', 'You cannot create a thread with a blank name.');
            } else {
                socket.emit('showError', 'Too long', 'Maximum length is 255 characters.');
            }
            return false;
        }
    });
    
    //on user joining thread
    socket.on('joinThread', function(id) {
        var name = null;
        id = validator.toInt(id);
        
        if (socket._threads.indexOf(id) === -1) {  
            db.get('SELECT name FROM threads WHERE id = ?', id, function(err, row) { //check if thread exists and if it does, find its name
                if(!row){
                    socket.emit('showError', '', 'This thread no longer exists.');
                    return false;
                } else {
                    socket.join(id);   
                    socket._threads.push(id);
                    name = row.name;    
                    db.all('SELECT * FROM messages WHERE thread = ?', id, function(err, messagesRows) {
                        socket.emit('joinThread', messagesRows, id, name); //display messages to socket upon joining                                             
                    });           
                } 
            });
        }     
    });
    
    //on user leaving thread
    socket.on('leaveThread', function(id) {
        id = validator.toInt(id);
        socket.leave(id);
        socket._threads.splice(socket._threads.indexOf(id), 1);       
        io.in(id).emit('tempMessage', id, socket._name, null); //hide temp message of user if exists
    });
     
    //on message being sent
    socket.on('message', function(thread, content) {
        var d = new Date().toJSON();
        thread = validator.toInt(thread);
        content = validator.escape(validator.trim(content));
        
        if (content === '') {
            socket.emit('showError', '', 'You cannot send an empty message.');
        } else {
            db.get("SELECT * FROM threads WHERE id = ?", thread, function(err, row) {
                if (!row) {
                    socket.emit('showError', '', 'This thread no longer exists.');
                    return false;
                } else {
                    db.run("INSERT INTO messages ('thread', 'sender', 'content', 'date') VALUES (?, ?, ?, ?)", thread, socket._name, content, d, function() {
                        var id = this.lastID
                        db.run("UPDATE threads SET lastActivity = ? WHERE id = ?", d, thread);
                        db.run("UPDATE threads SET lastSender = ? WHERE id = ?", socket._name, thread);
                        io.in(thread).emit('message', id, thread, d, socket._name, content);
                        io.emit('notifyInThreadList', thread, d, socket._name);
                    });
                }
            });
        }
    });
    
    socket.on('tempMessage', function(thread, content) {
        thread = validator.toInt(thread);
        content = validator.escape(validator.trim(content));
        
        io.in(thread).emit('tempMessage', thread, socket._name, content);
    });
    
    socket.on('deleteMessage', function(id) {
        id = validator.toInt(id);
        db.get('SELECT sender, thread FROM messages WHERE id = ?', id, function(err, row) {   
            if (!row) {
                socket.emit('showError', '', 'This message no longer exists.');
                return false;
            } else {
                if (row.sender === socket._name) {
                    db.run("UPDATE messages SET content = ? WHERE id = ?", null, id);
                    socket.emit('showSuccess', 'Message deleted', 'Rest in peace.');
                    io.in(row.thread).emit('deleteMessage', id, row.thread);
                } else {
                    socket.emit('showError', '', 'You can only delete your own messages.');
                    return false;
                }
            }
        });
    });
    
    socket.on('editMessage', function(id, content) {
       id = validator.toInt(id);
       content = validator.escape(validator.trim(content)); 
       
       db.get('SELECT sender, thread FROM messages WHERE id = ?', id, function(err, row) { 
            if (!row) {
                socket.emit('showError', '', 'This message no longer exists.');
                return false;
            } else {
                if (row.sender === socket._name) {
                    if (!content || (content === '')) {
                        db.run("UPDATE messages SET content = ? WHERE id = ?", null, id);
                        socket.emit('showSuccess', 'Message deleted', 'Rest in peace.');
                        io.in(row.thread).emit('deleteMessage', id, row.thread);
                    } else {
                        db.run("UPDATE messages SET content = ? WHERE id = ?", content, id);
                        socket.emit('showSuccess', 'Message edited', '');
                        io.in(row.thread).emit('editMessage', id, row.thread, content);
                    }
                } else {
                    socket.emit('showError', '', 'You can only edit your own messages.');
                    return false;
                }
            }
       });
    });
    
    //thread and message editing and deleting
    socket.on('editThread', function(id, name) {
        id = validator.toInt(id);
        name = validator.escape(validator.trim(name));
        
        if (validator.isLength(name, 1, 255)) {
            db.get('SELECT creator FROM threads WHERE id = ?', id, function(err, row) {
                if (row.creator === socket._name) {
                    db.run("UPDATE threads SET name = ? WHERE id = ?", name, id);
                    socket.emit('showSuccess', 'Thread renamed', 'It is now called ' + name);
                    io.emit('editThread', id, name);
                } else {
                    socket.emit('showError', '', 'You can only rename threads which you have created.');
                    return false;
                }
            });
        } else {
            if (name === '') {
                socket.emit('showError', '', 'You cannot rename a thread to a blank string.');
            } else {
                socket.emit('showError', 'Too long', 'Maximum length is 255 characters.');
            }
        return false;
        }
    });
    
    socket.on('deleteThread', function(id) {
        id = validator.toInt(id);
        db.get('SELECT lastActivity FROM threads WHERE id = ?', id, function(err, row) {
            if (row.lastActivity === null) {
                db.get('SELECT creator FROM threads WHERE id = ?', id, function(err, row) {
                    if (row.creator === socket._name) {
                        db.run("DELETE FROM threads WHERE id = ?", id);
                        socket.emit('showSuccess', 'Thread deleted', 'Rest in peace.');
                        io.emit('deleteThread', id);
                    } else {
                        socket.emit('showError', '', 'You can only delete threads which you have created.');
                        return false;
                    }
                });     
            } else {
                socket.emit('showError', '', 'You can only delete empty threads.');
            }
        });
    });  
    
    //on disconnect of socket    
    socket.on('disconnect', function() {
        var thread = null;
        while(socket._threads.length > 0) {
            thread = socket._threads.pop();
            io.in(thread).emit('tempMessage', thread, socket._name, null);
        }
        console.log(socket._name + ' disconnected');
    });  
  });
}
