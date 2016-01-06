/* global swal */
/* global io from another file, provided by index.jade */
var socket = io(), myUsername, myThreads = [], lastDate = [],
    $chatContainer = $('#chatContainer'), $threads = $('#threads'); //caching jquery objects  

//on document load
$(document).ready(function() { 
    $('button#createThread').click(function() {
        swal({
            title:'Enter a name',
            text:'You can enter any characters you want.',
            type:'input',
            showCancelButton:true,
            closeOnConfirm:true    
        }, function(inputValue) {
            if (inputValue === false) return false;
            if (inputValue === '') {
                swal.showInputError("You need to write something!");
                return false;
            }
            socket.emit('createThread', inputValue); 
        });	
    });  
});

socket.on('setUsername', function(name) {
    myUsername = name;
});

//print list of threads and allow user to join them
socket.on('printThreads', function(threads) {
	$threads.text('');
	threads.forEach(function(thread) {
		$threads.prepend(
            ThreadListItem(thread.id, thread.name, thread.creator, thread.lastActivity, thread.lastSender)
        );	
        cacheThreadListElements(thread.id);
	});    
});

socket.on('printThread', function(id, name, creator) {
    $threads.prepend(
        ThreadListItem(id, name, creator, null, null)
    );
    cacheThreadListElements(id);
});

//after joining and creation of element, print all messages
socket.on('joinThread', function(messages, id, name) {
    var threadWindow = ThreadWindow(id, name);    
    $chatContainer.append(threadWindow); 
    
    myThreads.push(id);
    $thread[id] = threadWindow //cache main thread window
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


//sending a message
function submitMessage(id) { //on form submit
    var textarea = $thread[id].cached.textarea;
    if (textarea.val() !== '') { //if not empty
        socket.emit('message', id, textarea.val()); //send value and thread id to server
        textarea.val(''); //set input value back to nothing
    }
}

//on receiving a message
socket.on('message', function(id, thread, date, sender, content) {
    var wasAtBottom = $thread[thread].cached.messages._isAtBottom(); //needs to be determined before appending the new message
  
    if (myUsername !== sender) { //if someone else sends it, notify
        $thread[thread]._notifyOfNewMessage();   
    }  
	$thread[thread].cached.messages.append(
        Message(id, thread, date, sender, content)
    );   
    if (wasAtBottom === true) { //if you were scrolled to the bottom, scroll back to the bottom again
        $thread[thread]._scrollToLastMessage(true);
    }   
});

//when not joined in a thread, increment 'new messages since load' and change Last message date and sender
socket.on('notifyInThreadList', function(thread, date, sender) {  
    var _date = new Date(date);
    if ($lastActivity[thread].eq(0).text() === '') {
        $('.deleteThread', $threadLi[thread]).remove();
    }
    $lastActivity[thread].eq(0).text(showDate(_date) + ' ' + showTime(_date));
    $lastActivity[thread].eq(1).html(sender);
    $numberOfMessages[thread].text(Number($numberOfMessages[thread].text()) + 1);
});

socket.on('editThread', function(id, name) {
    $('.threadName', $threadLi[id]).html(name);
    if (myThreads.indexOf(id) !== -1) {
        $('.threadHeaderName', $thread[id].cached.h3).html(name);
    }
});

socket.on('deleteThread', function(id) {
    removeThreadListElements(id);
    if (myThreads.indexOf(id) !== -1) {
        myThreads.splice(myThreads.indexOf(id), 1);
        $thread[id].remove();
    }
});

socket.on('showError', function(header, message) {
    setTimeout(function() {
        swal({
            type:'error',
            title: header,
            text: message,
        });
    }, 250);
});

socket.on('showSuccess', function(header, message) {
    setTimeout(function() {
        swal({
            type:'success',
            title: header,
            text: message,
        });
    }, 250);
});

//styling and display behaviour of app
//caching objects into $variable[threadid] reference, if first is provided, cache height of elements for resizing as well
var $thread = [], $lastActivity = [], $numberOfMessages = [], $threadLi = [],
    textareaHeight, h3Height;

function cacheThreadListElements(thread) {
    $threadLi[thread] = $('#threads li[data-id=' + thread + ']');
    $lastActivity[thread] = $('.threadLastActivity .value', $threadLi[thread]);
    $numberOfMessages[thread] = $('.threadNewMessages .value', $threadLi[thread]);   
}

function removeThreadListElements(thread) {
    $threadLi[thread].remove();
    $lastActivity[thread] = undefined;
    $numberOfMessages[thread] = undefined;
}

//creates thread window element after joining thread
function ThreadWindow(id, name) { //creating new element for joining
    var div = $('<div/>', { //create empty div
            class: 'threadContainer',
        }).attr('data-id', id),
        html = ''; //insert empty list of messages and form into it
    html += '<h3><i class="fa fa-comment-o notification"></i><span class="threadHeaderName">' + name + '</span><i class="fa fa-times close"></i></h3>';
    html += '<div class="messagesContainer">';
    html += '<ul class="messages"></ul>';
    html += '<form class="messageForm" onSubmit="submitMessage(' + id + ');return false;">';
    html += '<textarea autocomplete="off"></textarea>';
    html += '</form></div>';
    div.html(html); //put content inside empty div     
    div._cacheThread();  
    div._makeCollapsible(); //collapsing behaviour
    div._makeClosable();
    div._makeSubmittable();
    return div;
}

//creates thread list item element after connection or upon creation of new thread
function ThreadListItem(id, name, creator, lastActivity, lastSender) {
    var li = $('<li/>').attr('data-id', id),
        _date = new Date(lastActivity),
        html = '';
    html += '<div class="threadName">' + name + '</div><div class="threadFlex">';
    html += '<span class="threadCreator">Created by: <span class="value">' + creator + '</span></span>';
    if (lastSender === null) {
        html += '<span class="threadLastActivity">Last message: <span class="value"></span> - <span class="value"></span></span>';   
    } else {
        html += '<span class="threadLastActivity">Last message: <span class="value">' + showDate(_date) + ' ' + showTime(_date) + '</span> - <span class="value">' + lastSender+ '</span></span>';   
    }
    html += '<span class="threadNewMessages">New messages since load: <span class="value">0</span></span></div>';
    if (creator === myUsername) {
        html += '<i class="fa fa-pencil editThread"></i>';
        if (lastSender === null) {
            html += '<i class="fa fa-trash deleteThread"></i>'; 
        }
    }
    li.html(html);
    makeJoinable(li, id);
    if (creator === myUsername) {
        makeThreadEditable(li, id);
        makeThreadDeletable(li, id);
    }
    return li;
}

//creates new message element upon socket joining thread
function Message(id, thread, date, sender, content) {
    var li = $('<li/>').attr('data-id', id),
        _date = new Date(date),
        d = showDate(_date),
        t = showTime(_date),
        html = '';
    if (lastDate[thread] !== d) { //shows date if it's different to the message before
        lastDate[thread] = d;
        html += '<div class="messageDate">' + d + '</div>';   
    }
    content = content.replace(/(?:\r\n|\r|\n)/g, '<br />'); //replace \n with <br />
    html += '<div class="messageFlex">';
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

function makeJoinable(a, id) {
    $(a).click(function(e) { //when you click on thread, join it
        if (e.target.classList[0] !== 'fa') { //if not clicked on icon
            e.preventDefault();
            if (myThreads.indexOf(id) === -1) { //if not already joined, join
                socket.emit('joinThread', id); 
            } else {
                $thread[id]._collapse();
            }
        }
	});
}

function makeThreadEditable(a, id) {
    $('i.editThread', a).click(function(e) {
        swal({
            type:'input',
            title:'Change the name',
            text:'You may change the name or delete the whole thread instead.',
            inputValue:$('.threadName', a).html(),
            showCancelButton:true,
            confirmButtonText:'Change name',
            closeOnConfirm:true,
            allowOutsideClick:true
        }, function(inputValue) {
            if (inputValue) {
                socket.emit('editThread', id, inputValue);
            }           
        });
    });
}

function makeThreadDeletable(a, id) {
    $('i.deleteThread', a).click(function(e) {
        swal({
            type:'warning',
            title:'Delete the thread?',
            text:'This action is irreversible.',
            showCancelButton:true,
            confirmButtonText:'Delete',
            closeOnConfirm:true,
            allowOutsideClick:true
        }, function(isConfirm) {
            if (isConfirm) {
                socket.emit('deleteThread', id);
            }         
        });
    });
}

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
