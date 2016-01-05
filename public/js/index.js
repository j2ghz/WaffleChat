/* global swal */
/* global io from another file, provided by index.jade */
var socket = io(), myUsername, myThreads = [], lastDate = [],
    $chatContainer = $('#chatContainer'), $threads = $('#threads'), $footer = $('footer'); //caching jquery objects  

//Create Thread button functionality
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

socket.on('setUsername', function(name) {
    myUsername = name;
});

//print list of threads and allow user to join them
socket.on('printThreads', function(threads) {
	$threads.text('');
	threads.forEach(function(thread) {
		$threads.prepend(ThreadListItem(thread.id, thread.name, thread.creator, thread.lastActivity, thread.lastSender));	
        makeJoinable(thread.id);
	});    
});

socket.on('printThread', function(id, name, creator) {
    $threads.prepend(ThreadListItem(id, name, creator, null, null));
});

//after joining and creation of element, print all messages
socket.on('joinThread', function(messages, id, name) {
    $chatContainer.append(ThreadWindow(id, name)); 
    if (myThreads.length === 0) { //if this is the first window to be created, set boolean to true
        var first = true;
    }
    myThreads.push(id);
    cacheElements(id, first); //put objects in $variables
    resizeMessages(); //resize elements by window height
    makeCollapsible(id); //collapsing behaviour
    makeClosable(id);
    $messages[id].text('');
	messages.forEach(function(message) {
		$messages[id].append(Message(message.id, message.thread, message.date, message.sender, message.content));	
	});
    scrollToLastMessage(id);
    makeTextareaSubmittable(id);
});


//sending a message
function submitMessage(id) { //on form submit
    if ($textarea[id].val() !== '') { //if not empty
        socket.emit('message', id, $textarea[id].val()); //send value and thread id to server
        $textarea[id].val(''); //set input value back to nothing
    }
}

//on receiving a message
socket.on('message', function(id, thread, date, sender, content) {
    var wasAtBottom = isAtBottom($messages[thread]); //needs to be determined before appending the new message
    if (myUsername !== sender) { //if someone else sends it, notify
        notifyOfNewMessage(thread);   
    }   
	$messages[thread].append(Message(id, thread, date, sender, content));
    if (wasAtBottom === true) { //if you were scrolled to the bottom, scroll back to the bottom again
        scrollToLastMessage(thread, true);    
    }   
});

//when not joined in a thread, increment 'new messages since load' and change Last message date and sender
socket.on('notifyInThreadList', function(thread, date, sender) {  
    var _date = new Date(date);
    var $lastActivity = $('#threads a[href=' + thread+ '] .threadLastActivity .value');
    $lastActivity.eq(0).text(showDate(_date) + ' ' + showTime(_date));
    $lastActivity.eq(1).html(sender);
    var $number = $('#threads a[href=' + thread+ '] .threadNewMessages .value');
    $number.text(Number($number.text()) + 1);
});

socket.on('editThread', function(id, name) {
    $('#threads li[data-id=' + id + '] .threadName').html(name);
    if (myThreads.indexOf(id) !== -1) {
        $('.threadHeaderName', $h3[id]).html(name);
    }
});

socket.on('showError', function(header, message) {
    swal({
        type:'error',
        title: header,
        text: message,
    });
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
var $thread = [], $messagesContainer = [], $messages = [], $h3 = [], $notification = [], $textarea = [], $close = [],
    textareaHeight, h3Height;
    
function cacheElements(thread, first) {
    $thread[thread] = $('.threadContainer[data-id=' + thread + ']');
    $messagesContainer[thread] = $('.messagesContainer', $thread[thread]);
    $messages[thread] = $('.messages', $thread[thread]);
    $h3[thread] = $('h3', $thread[thread]);
    $notification[thread] = $('i.notification', $h3[thread]);
    $textarea[thread] = $('textarea', $thread[thread]);
    $close[thread] = $('i.close', $h3[thread]);
    
    if (first) {
        textareaHeight = $textarea[thread].outerHeight();
        h3Height = $h3[thread].outerHeight();
    }
}

//removing object references and removing thread element on leaving
function removeElements(thread) {
    $thread[thread].remove();
    $thread[thread] = undefined;
    $messagesContainer[thread] = undefined;
    $messages[thread] = undefined;
    $h3[thread] = undefined;
    $notification[thread] = undefined;
    $textarea[thread] = undefined;
    $close[thread] = undefined;
    lastDate[thread] = undefined
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
    return div;
}

//creates thread list item element after connection or upon creation of new thread
function ThreadListItem(id, name, creator, lastActivity, lastSender) {
    var li = $('<li/>', {
    }).attr('data-id', id),
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
    }
    li.html(html);
    makeJoinable(li, id);
    if (creator === myUsername) {
        makeThreadEditable(li, id);
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
    $h3[id].click(function() {   //when you click tab, toggle collapsing
        collapse(id);
    });
}

//make thread closable
function makeClosable(id) {
    $close[id].click(function() { //close icon functionality
        socket.emit('leaveThread', id);
        myThreads.splice(myThreads.indexOf(id), 1);
        removeElements(id);
    });
}

function makeJoinable(a, id) {
    $(a).click(function(e) { //when you click on thread, join it
        if (e.target.classList[0] !== 'fa') { //if not clicked on icon
            e.preventDefault();
            if (myThreads.indexOf(id) === -1) { //if not already joined, join
                socket.emit('joinThread', id); 
            } else {
                if ($thread[id].hasClass('collapsed') === true) { //else uncollapse already joined thread
                    collapse(id);
                }
            }
        }
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

function makeTextareaSubmittable(id) {
    $textarea[id].keydown(function(e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            if (e.shiftKey === false) {
                $(this.form).submit()
                return false;   
            } else {
                var s = $(this).val();
                $(this).val(s + "\n");
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

//notify of new message
var notificationTimer;
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
    $h3[id].removeClass('notifying');
    $notification[id].removeClass('fa-comment');
}

function showNotification(id) {
    $notification[id].addClass('fa-comment');
    $h3[id].addClass('notifying');
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
