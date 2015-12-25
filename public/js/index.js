/* global io from another file, provided by index.jade */
var socket = io();
var $chatContainer = $('#chatContainer'), $threads = $('#threads'), $footer = $('footer'), $thread = [], 
    $messagesContainer = [], $messages = [], $h2 = [], $notification = [], $input = [], $close = []; //caching jquery objects
var myUsername = $('#mainContainer h2').text();

//socket behaviour
$('button#createThread').click(function() {
	socket.emit('createThread', prompt('Select thread'));
});

socket.on('printThreads', function(threads) {
	$threads.text('');
	threads.forEach(function(thread) {
		$threads.append('<a href="' + thread.id + '"><li>' + thread.name + '</li></a>');	
	});
	$('a', $threads).click(function(e) {
        e.preventDefault();
        var id = $(this).attr('href')
        if ($thread[id] === undefined) {
            socket.emit('joinThread', id); 
        } else {
             if ($thread[id].hasClass('collapsed') === true) {
                 collapse(id);
             }
        }
	});
});

socket.on('printMessages', function(messages, id) { //print list of messages in given thread
    $messages[id].text('');
	messages.forEach(function(message) {
		$messages[id].append('<li>' + message.sender + ': ' + message.content + '</li>');	
	});
});

socket.on('message', function(content, thread, sender) {
    var wasAtBottom = isAtBottom($messages[thread]); //needs to be determined before appending the new message
    if (myUsername !== sender) {
        notifyOfNewMessage(thread);   
    }   
	$messages[thread].append($('<li>').text(sender + ': ' + content));
    if (wasAtBottom === true) {
        scrollToLastMessage(thread, true);    
    }   
});

socket.on('createThreadElement', function(id, name) { //upon joining a thread, first create a new Thread div
    $chatContainer.append(Thread(id, name)); 
    cacheObjects(id);
    resizeMessages();
    makeCollapsible(id);
    $close[id].click(function() {
        socket.emit('leaveThread', id);
        $thread[id].remove();
        removeObjects(id);
    });
});

//styling and functions
var resizeTimer;

function cacheObjects(thread) {
    $thread[thread] = $('#thread' + thread);
    $messagesContainer[thread] = $('.messagesContainer', $thread[thread]);
    $messages[thread] = $('.messages', $thread[thread]);
    $h2[thread] = $('h2', $thread[thread]);
    $notification[thread] = $('i.notification', $h2[thread]);
    $input[thread] = $('input', $thread[thread]);
    $close[thread] = $('i.close', $h2[thread]);
}

function removeObjects(thread) {
    $thread[thread].remove();
    $thread[thread] = undefined;
    $messagesContainer[thread] = undefined;
    $messages[thread] = undefined;
    $h2[thread] = undefined;
    $notification[thread] = undefined;
    $input[thread] = undefined;
    $close[thread] = undefined;
}

function Thread(id, name) { //creating new element for joining
    var div = $('<div/>', { //create empty div
        class: 'threadContainer',
        id: 'thread' + id
    });
    var content = ''; //insert empty list of messages and form into it
    content += '<h2><i class="fa fa-envelope-o notification"></i> ' + name + '<i class="fa fa-times close"></i></h2>';
    content += '<div class="messagesContainer">';
    content += '<ul class="messages"></ul>';
    content += '<form class="messageForm" onSubmit="submitMessage(' + id + ');return false;">';
    content += '<input autocomplete="off">';
    content += '</form></div>';
    div.html(content); //put content inside empty div
    return div;
}

//sending a message
function submitMessage(id) { //on form submit
    if ($input[id].val() !== '') {
        socket.emit('message', $input[id].val(), id);
        $input[id].val('');
    }
}

function resizeMessages() { //gets called whenever window is resized
    var h = $chatContainer.height();
    $('.messages').height(h); //set height of all messages ul dynamically by container height (which is by 50% of window)
    $('.collapsed h2').css('top', h + $footer.height()); //move collapsed tab when resizing
}

$(window).resize(function() { 
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeMessages, 250); //resize throttling
});

function scrollToLastMessage(id, animation) { //scroll to last message in given thread
    var duration = 0;
    if (animation === true) {
        duration = 400;
    }
    $messages[id].animate({
        scrollTop: $messages[id][0].scrollHeight, //scroll to bottom
    }, duration);
}

function makeCollapsible(id) { //make thread collapsible
    $h2[id].click(function() {   //when you click tab
        collapse(id);
    });
}

function collapse(id){
    $h2[id].css('top', $messagesContainer[id].height() - 5);   //move whole thread (if collapsed, height is 0, therefore it will move up and vice versa)
    $thread[id].toggleClass('collapsed');  //hide messages and form
    
    if ($thread[id].hasClass('collapsed') === false && $notification[id].hasClass('fa-envelope') === true) { //if notification is up and you uncollapse it
        scrollToLastMessage(id, true); //scroll down and remove notification
        hideNotification(id);
    }  
}

function notifyOfNewMessage(id) {
    showNotification(id); 
    /* removing notifications */
    if ($thread[id].hasClass('collapsed') === false) { //functionality only on noncollapsed
        if ((isAtBottom($messages[id]) === true) || ($messages[id].hasScrollBar().vertical === false)) {
            /* notification will appear briefly if at bottom or not big enough to have a scrollbar */
            var timer;
            clearTimeout(timer);
            timer = setTimeout(function() {
                hideNotification(id);
            }, 1000);   
        } else {
            //else when you scroll down remove notification
            var scrollTimer;
            $messages[id].scroll(function() { 
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(function() {
                    if (isAtBottom($messages[id])) {
                        hideNotification(id);
                        $messages[id].off('scroll'); //remove event listener once notification is removed
                    }
                }, 250);
            });
        }
    }
}

function isAtBottom(messages) {
    if (Math.floor(messages.scrollTop() + messages.height()) === messages[0].scrollHeight) { //if is scrolled to the bottom, continue showing new messages
        return true;
    } else {
        return false;
    }
}

function hideNotification(id) {
    $notification[id].addClass('fa-envelope-o');
    $notification[id].removeClass('fa-envelope');
}

function showNotification(id) {
    $notification[id].addClass('fa-envelope');
    $notification[id].removeClass('fa-envelope-o');
}

(function($) { //helpful method to determine whether scrolling is possible or not
    $.fn.hasScrollBar = function() {
        var e = this.get(0);
        return {
            vertical: e.scrollHeight > e.clientHeight,
            horizontal: e.scrollWidth > e.clientWidth
        };
    }
})(jQuery);
