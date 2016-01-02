/* global io from another file, provided by index.jade */
var socket = io(),
    $chatContainer = $('#chatContainer'), $threads = $('#threads'), $footer = $('footer'), $thread = [], 
    $messagesContainer = [], $messages = [], $h2 = [], $notification = [], $input = [], $close = [], //caching jquery objects
    myUsername = $('#headerContainer h2').text(), myThreads = [], resizeTimer, notificationTimer, inputHeight, h2Height, lastSender = [], lastDate = [];

//Create Thread button functionality
$('button#createThread').click(function() {
	socket.emit('createThread', prompt('Select thread'));
});

//print list of threads and allow user to join them
socket.on('printThreads', function(threads) {
	$threads.text('');
	threads.forEach(function(thread) {
		$threads.append(ThreadListItem(thread.id, thread.name, thread.creator, thread.lastActivity, thread.lastSender));	
	});    
	$('a', $threads).click(function(e) { //when you click on thread, join it
        e.preventDefault();
        var id = $(this).attr('href')
        if (myThreads.indexOf(id) === -1) { //if not already joined, join
            socket.emit('joinThread', id); 
        } else {
             if ($thread[id].hasClass('collapsed') === true) { //else uncollapse already joined thread
                 collapse(id);
             }
        }
	});
});

//after joining and creation of element, print all messages
socket.on('printMessages', function(messages, id, name) {
    $chatContainer.append(ThreadWindow(id, name)); 
    if (myThreads.length === 0) { //if this is the first window to be created, set boolean to true
        var first = true;
    }
    myThreads.push(id);
    cacheObjects(id, first); //put objects in $variables
    resizeMessages(); //resize elements by window height
    makeCollapsible(id); //collapsing behaviour
    makeClosable(id);
    $messages[id].text('');
	messages.forEach(function(message) {
		$messages[id].append(Message(id, message.date, message.sender, message.content));	
	});
});


//sending a message
function submitMessage(id) { //on form submit
    if ($input[id].val() !== '') { //if not empty
        socket.emit('message', id, $input[id].val()); //send value and thread id to server
        $input[id].val(''); //set input value back to nothing
    }
}

//on receiving a message
socket.on('message', function(thread, date, sender, content) {
    var wasAtBottom = isAtBottom($messages[thread]); //needs to be determined before appending the new message
    if (myUsername !== sender) { //if someone else sends it, notify
        notifyOfNewMessage(thread);   
    }   
	$messages[thread].append(Message(thread, date, sender, content));
    if (wasAtBottom === true) { //if you were scrolled to the bottom, scroll back to the bottom again
        scrollToLastMessage(thread, true);    
    }   
});

//when not joined in a thread, increment 'new messages since load' and change Last message date and sender
socket.on('notifyInThreadList', function(thread, date, username) {  
    var _date = new Date(date);
    var $lastActivity = $('#threads a[href=' + thread+ '] .threadLastActivity .value');
    $lastActivity.eq(0).text(showDate(_date) + ' ' + showTime(_date));
    $lastActivity.eq(1).text(username);
    var $number = $('#threads a[href=' + thread+ '] .threadNewMessages .value');
    $number.text(Number($number.text()) + 1);
});

//styling and display behaviour of app
//caching objects into $variable[threadid] reference, if first is provided, cache height of elements for resizing as well
function cacheObjects(thread, first) {
    $thread[thread] = $('#thread' + thread);
    $messagesContainer[thread] = $('.messagesContainer', $thread[thread]);
    $messages[thread] = $('.messages', $thread[thread]);
    $h2[thread] = $('h2', $thread[thread]);
    $notification[thread] = $('i.notification', $h2[thread]);
    $input[thread] = $('input', $thread[thread]);
    $close[thread] = $('i.close', $h2[thread]);
    if (first) {
        inputHeight = $input[thread].outerHeight();
        h2Height = $h2[thread].outerHeight();
    }
}

//removing object references and removing thread element on leaving
function removeObjects(thread) {
    $thread[thread].remove();
    $thread[thread] = undefined;
    $messagesContainer[thread] = undefined;
    $messages[thread] = undefined;
    $h2[thread] = undefined;
    $notification[thread] = undefined;
    $input[thread] = undefined;
    $close[thread] = undefined;
    lastDate[thread] = undefined
}

//creates thread window element after joining thread
function ThreadWindow(id, name) { //creating new element for joining
    var div = $('<div/>', { //create empty div
        class: 'threadContainer',
        id: 'thread' + id
    }),
    html = ''; //insert empty list of messages and form into it
    html += '<h2><i class="fa fa-comment-o notification"></i> ' + name + '<i class="fa fa-times close"></i></h2>';
    html += '<div class="messagesContainer">';
    html += '<ul class="messages"></ul>';
    html += '<form class="messageForm" onSubmit="submitMessage(' + id + ');return false;">';
    html += '<input autocomplete="off">';
    html += '</form></div>';
    div.html(html); //put content inside empty div
    return div;
}

//creates thread list item element after connection or upon creation of new thread
function ThreadListItem(id, name, creator, lastActivity, lastSender) {
    var a = $('<a/>', {
        href: id
    }),
        _date = new Date(lastActivity),
        html = '';
    html += '<li><div class="threadName">' + name + '</div><div class="threadFlex">';
    html += '<span class="threadCreator">Created by: <span class="value">' + creator + '</span></span>';
    if (lastSender === null) {
        html += '<span class="threadLastActivity">Last message: <span class="value"></span> - <span class="value"></span></span>';   
    } else {
        html += '<span class="threadLastActivity">Last message: <span class="value">' + showDate(_date) + ' ' + showTime(_date) + '</span> - <span class="value">' + lastSender+ '</span></span>';   
    }
    html += '<span class="threadNewMessages"><span class="value">0</span> new messages since load</span></div></li>';
    a.html(html);
    return a;
}

//creates new message element upon receiving a new message or printMessages
function Message(thread, date, sender, content) {
    var li = $('<li/>'),
        _date = new Date(date),
        d = showDate(_date),
        t = showTime(_date),
        html = '';
    if (lastDate[thread] !== d) {
        lastDate[thread] = d;
        html += '<div class="messageDate">' + d + '</div>';   
    }
    html += '<div class="messageFlex">';
    html += '<span class="messageSender">' + sender + '</span><span class="messageContent">' + content + '</span><span class="messageTime">' + t + '</span></div>';
    li.html(html);
    return li;
}

//gets called whenever window is resized and upon creation of new thread window
function resizeMessages() { 
    var chatHeight = $chatContainer.height();
    $('.messages').height(chatHeight - h2Height - inputHeight); //set height of all ul.messages dynamically by container height (which is by 50% of window)
    $('.threadContainer.collapsed').css('top', chatHeight - h2Height); //move collapsed tab when resizing
}

//resize ul.messages on window resize
$(window).resize(function() { 
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeMessages, 250); //resize throttling
});

//scroll to last message in given thread, animation boolean
function scrollToLastMessage(id, animation) { 
    var duration = 0;
    if (animation === true) { duration = 400; }
    $messages[id].animate({
        scrollTop: $messages[id][0].scrollHeight, //scroll to bottom
    }, duration);
}

//make thread collapsible
function makeCollapsible(id) { 
    $h2[id].click(function() {   //when you click tab, toggle collapsing
        collapse(id);
    });
}

//make thread closable
function makeClosable(id) {
    $close[id].click(function() { //close icon functionality
        socket.emit('leaveThread', id);
        myThreads.splice(myThreads.indexOf(id), 1);
        removeObjects(id);
    });
}

//collapse given thread
function collapse(id){
    $thread[id].toggleClass('collapsed'); //different display of header
    
    if ($thread[id].hasClass('collapsed') === true) {
        $thread[id].css('top', $messagesContainer[id].height());    
    } else {
        $thread[id].css('top', 0);  
    }
    
    if ($thread[id].hasClass('collapsed') === false && $notification[id].hasClass('fa-comment') === true) { //if notification is up and you uncollapse it
        scrollToLastMessage(id, true); //scroll down and remove notification
        hideNotification(id);
    }  
}

//notify of new message
function notifyOfNewMessage(id) {
    showNotification(id); 
    //removing notifications 
    if ($thread[id].hasClass('collapsed') === false) { //if not collapsed
        if ((isAtBottom($messages[id]) === true) || ($messages[id].hasScrollBar().vertical === false)) {
            // notification will appear briefly if at bottom or thread not big enough to have a scrollbar
            clearTimeout(notificationTimer);
            notificationTimer = setTimeout(function() { //after 1 second hide
                hideNotification(id);
            }, 1000);   
        } else {
            //else remove notification when you scroll down 
            var scrollTimer;
            $messages[id].scroll(function() { 
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(function() { //throttling
                    if (isAtBottom($messages[id])) {
                        hideNotification(id);
                        $messages[id].off('scroll'); //remove event listener once notification is removed
                    }
                }, 250);
            });
        }
    }
}

//checks if is scrolled to bottom in given thread
function isAtBottom(messages) {
    if (Math.floor(messages.scrollTop() + messages.height()) === messages[0].scrollHeight) { //if is scrolled to the bottom, continue showing new messages
        return true;
    } else {
        return false;
    }
}

//hides or shows notification in given thread
function hideNotification(id) {
    $notification[id].addClass('fa-comment-o');
    $h2[id].removeClass('notifying');
    $notification[id].removeClass('fa-comment');
}

function showNotification(id) {
    $notification[id].addClass('fa-comment');
    $h2[id].addClass('notifying');
    $notification[id].removeClass('fa-comment-o');
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

//helpful method to determine whether scrolling is possible or not
(function($) { 
    $.fn.hasScrollBar = function() {
        var e = this.get(0);
        return {
            vertical: e.scrollHeight > e.clientHeight,
            horizontal: e.scrollWidth > e.clientWidth
        };
    }
})(jQuery);
