/* global swal */
/* global io */
var socket = io(), myUsername, myThreads, lastDate = [],
    $chatContainer = $('#chatContainer'), $threads = $('#threads'), //caching jquery objects  
    $thread = [], $threadLi = [],
    textareaHeight, h3Height;

//on document load
$(document).ready(function() { 
    $('#createThread').click(function() {
        swal({
            title:'Enter a name',
            text:'You may enter a maximum of 255 characters. Any characters.',
            type:'input',
            showCancelButton:true,
            closeOnConfirm:false,
            allowOutsideClick:true,
            showLoaderOnConfirm:true
        }, function(inputValue) {
            if (inputValue === false) return false;
            if (inputValue === '') {
                swal.showInputError("You need to write something!");
                return false;
            }
            if (inputValue.length > 255) {
                swal.showInputError("Maximum length is 255 characters.");
                return false;
            }
            socket.emit('createThread', inputValue); 
        });	
    });  
    
    $('#collapseAllThreads').click(function() {
        $thread.forEach(function(obj) {
            if(obj.hasClass('collapsed') === false) {
                obj._collapse();
            }
        });
    });
    
    $('#uncollapseAllThreads').click(function() {
        $thread.forEach(function(obj) {
            if(obj.hasClass('collapsed') === true) {
                obj._collapse();
            }
        });
    });
    
    $('#closeAllThreads').click(function() {
        $thread.forEach(function(obj) {
            obj._close();
        });
    });
});

socket.on('setUsername', function(name) {
    myThreads = [];
    myUsername = name;
});

//print list of threads and allow user to join them
socket.on('printThreads', function(threads) {
	$threads.text('');
	threads.forEach(function(thread) {
		$threads.prepend(
            ThreadListItem(thread.id, thread.name, thread.creator, thread.lastActivity, thread.lastSender)
        );	
	});    
});

socket.on('printThread', function(id, name, creator) {
    $threads.prepend(
        ThreadListItem(id, name, creator, null, null)
    );
});

//after joining and creation of element, print all messages
socket.on('joinThread', function(messages, id, name) {    
    var threadWindow = ThreadWindow(id, name);    
    $chatContainer.append(threadWindow); 
    
    myThreads.push(id);
    
    if (myThreads.length === 1) { //if this is the first window to be created, set boolean to true    
        textareaHeight = $thread[id].cached.textarea.outerHeight();
        h3Height = $thread[id].cached.h3.outerHeight();
    }
    
    resizeMessages(); //resize elements by window height
    
    $thread[id].cached.messages.text('');
	messages.forEach(function(message) {
        $thread[id].cached.messages.append(Message(message.id, message.thread, message.date, message.sender, message.content));	
	});   
    $thread[id]._scrollToLastMessage(false);
});

//on receiving a message
socket.on('message', function(id, thread, date, sender, content) {   
    var wasAtBottom = $thread[thread].cached.messages._isAtBottom(), //needs to be determined before appending the new message
        temp = $thread[thread].temp;
    
    if (myUsername !== sender) { //if someone else sends it, notify
        $thread[thread]._notifyOfNewMessage();   
    }  
    
    if (temp[sender]) { //if a temporary message exists, remove it
        temp[sender].remove();
        temp[sender] = undefined;   
    }

	$thread[thread].cached.messages.append(
        Message(id, thread, date, sender, content)
    );   
    if (wasAtBottom === true) { //if you were scrolled to the bottom, scroll back to the bottom again
        $thread[thread]._scrollToLastMessage(true);
    }   
});

socket.on('tempMessage', function(thread, date, sender, content) {
    var temp = $thread[thread].temp;

    if ((content === '') || !content) { // if content is empty
        if (temp[sender]) { //remove if exists
            temp[sender].remove();
            temp[sender] = undefined;    
        }       
    } else {       //if received content
        var wasAtBottom = $thread[thread].cached.messages._isAtBottom(),
            message = Message(null, thread, date, sender, content); //create new message
        
        if (!temp[sender]) {   //if no temp message in thread from this sender exists        
            temp[sender] = message.appendTo($thread[thread].cached.messages); //append a new one
        } else {
            temp[sender].html(message.html()); //otherwise replace html
        }
        
        if (wasAtBottom === true) { //if you were scrolled to the bottom, scroll back to the bottom again
            $thread[thread]._scrollToLastMessage(true);
        }  
    }
});

//when not joined in a thread, increment 'new messages since load' and change Last message date and sender
socket.on('notifyInThreadList', function(thread, date, sender) { 
    date = new Date(date); 
    var $lastActivity = $threadLi[thread].cached.lastActivity,
        $numberOfMessages = $threadLi[thread].cached.numberOfMessages;
    
    if ($lastActivity.eq(0).text() === '') {
        $threadLi[thread].cached.deleteThread.remove();
    }
    $lastActivity.eq(0).text(showDate(date) + ' ' + showTime(date));
    $lastActivity.eq(1).html(sender);
    $numberOfMessages.text(Number($numberOfMessages.text()) + 1);
});

socket.on('editThread', function(id, name) {
    $('.threadName', $threadLi[id]).html(name);
    if (myThreads.indexOf(id) !== -1) {
        $('.threadHeaderName', $thread[id].cached.h3).html(name);
    }
});

socket.on('deleteThread', function(id) {
    $threadLi[id].remove();
    if (myThreads.indexOf(id) !== -1) {
        $thread[id]._close();
    }
});

socket.on('showError', function(header, message) {
    setTimeout(function() {
        swal({
            type:'error',
            title: header,
            text: message,
            allowOutsideClick:true
        });
    }, 250);
});

socket.on('showSuccess', function(header, message) {
    setTimeout(function() {
        swal({
            type:'success',
            title: header,
            text: message,
            allowOutsideClick:true
        });
    }, 250);
});

socket.on('userDisconnected', function(name) {
    $thread.forEach(function(thread) {
        if (thread.temp[name]) {
            thread.temp[name].remove();
            thread.temp[name] = undefined;
        }
    });
});

//creates thread window element after joining thread
function ThreadWindow(id, name) { //creating new element for joining
    var div = $('<div/>', { //create empty div
            class: 'threadContainer',
        }).attr('data-id', id),
        html = ''; //insert empty list of messages and form into it
    html += '<h3 title="' + name + '"><i class="fa fa-comment-o notification"></i><span class="threadHeaderName">' + name + '</span><i class="fa fa-times close"></i></h3>';
    html += '<div class="messagesContainer">';
    html += '<ul class="messages"></ul>';
    html += '<form class="messageForm" data-id="' + id + '">';
    html += '<textarea autocomplete="off"></textarea>';
    html += '</form></div>';
    div.html(html); //put content inside empty div     
    $thread[id] = div;
    $thread[id].temp = [];
    div._cacheThread();  
    div._makeCollapsible(); //collapsing behaviour
    div._makeClosable();
    div._makeSubmittable();
    return div;
}

//creates thread list item element after connection or upon creation of new thread
function ThreadListItem(id, name, creator, lastActivity, lastSender) {
    lastActivity = new Date(lastActivity);
    var li = $('<li/>').attr('data-id', id),
        html = '';
    html += '<div class="threadName">' + name + '</div><div class="threadFlex">';
    html += '<span class="threadCreator">Created by: <span class="value">' + creator + '</span></span>';
    if (lastSender === null) {
        html += '<span class="threadLastActivity">Last message: <span class="value"></span> - <span class="value"></span></span>';   
    } else {
        html += '<span class="threadLastActivity">Last message: <span class="value">' + showDate(lastActivity) + ' ' + showTime(lastActivity) + '</span> - <span class="value">' + lastSender+ '</span></span>';   
    }
    html += '<span class="threadNewMessages">New messages since load: <span class="value">0</span></span></div>';
    if (creator === myUsername) {
        html += '<i class="fa fa-pencil editThread"></i>';
        if (lastSender === null) {
            html += '<i class="fa fa-trash deleteThread"></i>'; 
        }
    }
    li.html(html);
    $threadLi[id] = li;
    li._cacheThreadLi();
    li._makeJoinable();
    if (creator === myUsername) {
        li._makeThreadEditable();
        li._makeThreadDeletable();
    }
    return li;
}

//creates new message element upon socket joining thread
function Message(id, thread, date, sender, content) {
    date = new Date(date);
    var li = $('<li/>').attr('data-id', id),
        d = showDate(date),
        t = showTime(date),
        html = '';
    if ((lastDate[thread] !== d) && (id !== null)) { //shows date if it's different to the message before and is not a temp message
        lastDate[thread] = d;
        html += '<div class="messageDate">' + d + '</div>';   
    }
    content = content.replace(/(?:\r\n|\r|\n)/g, '<br />'); //replace \n with <br />
    
    if (id === null) { //if id of message is null, it is a temporary message not yet in db
        html += '<div class="messageFlex temp">';   
    } else {
        html += '<div class="messageFlex">';    
    }
    
    html += '<span class="messageContent"><span class="messageSender">' + sender + '</span>' + content + '</span><span class="messageTime">' + t + '</span></div>';
    li.html(html);
    li.linkify();
    return li;
}

//gets called whenever window is resized and upon creation of new thread window
function resizeMessages() { 
    var chatHeight = $chatContainer.height();
    $('.messages').height(chatHeight - h3Height - textareaHeight); //set height of all ul.messages dynamically by container height (which is by 50% of window)
    $('.threadContainer.collapsed').css('top', chatHeight - h3Height); //move collapsed tab when resizing
}

//resize ul.messages on window resize
var resizeTimer;
$(window).resize(function() { 
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeMessages, 250); //resize throttling
});

//parses date object into string
function showDate(date) {
    return date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear() + ' ';
}

function showTime(date) {
    var html = '';
    html += (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()); //returns 03:04 instead of 3:4
    html += ':';
    html += (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
    return html;
}
