/* global io from another file, provided by index.jade */
var socket = io();

//on connection
$('button#createThread').click(function() {
	socket.emit('createThread', prompt('Select thread'));
});

socket.on('printThreads', function(threads) {
	$('#threads').text('');
	threads.forEach(function(thread) {
		$('#threads').append('<a href="' + thread.id + '"><li>' + thread.name + '</li></a>');	
	});
	$('#threads a').click(function(e) {
        e.preventDefault();
		socket.emit('joinThread', $(this).attr('href'), $(this).text());
	});
});

//on joinThread
function Thread(id, name) { //creating new element for joining
    var div = $('<div/>', { //create empty div
        class: 'threadContainer',
        id: 'thread' + id
    });
    var content = ''; //insert empty list of messages and form into it
    content += '<h2><i class="fa fa-envelope-o"></i> ' + name + '</h2>';
    content += '<div class="messagesContainer">';
    content += '<ul class="messages"></ul>';
    content += '<form class="messageForm" onSubmit="submitMessage(' + id + ');return false;">';
    content += '<input autocomplete="off">';
    content += '</form></div>';
    div.html(content); //put content inside empty div
    return div;
}

socket.on('createThreadElement', function(id, name) { //upon joining a thread, first create a new Thread div
    $('#chatContainer').append(Thread(id, name)); 
    resizeElements();
    makeCollapsible(id);
});

socket.on('printMessages', function(messages, thread) { //print list of messages in given thread
    var ul = $('#thread' + thread + ' .messages');
    ul.text('');
	messages.forEach(function(message) {
		ul.append('<li>' + message.content + '</li>');	
	});
});

//sending and receiving a message
function submitMessage(thread) { //on form submit
    var input = $('#thread' + thread + ' input'); //find proper input
    if (input.val() !== '') {
        socket.emit('message', input.val(), thread);
        input.val('');
    }
}

socket.on('message', function(content, thread) {
    var $messages = $('#thread' + thread + ' .messages');
    var atBottom = isAtBottom($messages); //needs to be determined before appending the new message
    notifyOfNewMessage(thread);
	$messages.append($('<li>').text(content));
    if (atBottom === true) {
        scrollToLastMessage(thread, true);    
    }   
});

//styling
var resizeTimer, $chatContainer = $('#chatContainer'), $footer = $('footer'); //caching jquery objects

function resizeElements() { //gets called whenever window is resized
    var h = $chatContainer.height();
    $('.messages').height(h); //set height of messages ul dynamically by container height (which is by 50% of window)
    $('.collapsed h2').css('top', h + $footer.height()); //move collapsed tab when resizing
}

$(window).resize(function() { 
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeElements, 250); //resize throttling
});

function scrollToLastMessage(thread, animation) { //scroll to last message in given thread
    var ul = $('#thread' + thread + ' ul'); //find appropriate thread
    var duration = 0;
    if (animation === true) {
        duration = 400;
    }
    ul.animate({
        scrollTop: ul[0].scrollHeight, //scroll to bottom
    }, duration);
}

function makeCollapsible(thread) { //make thread collapsible
    var $thread = $('#thread' + thread); //caching jquery objects
    var $container = $('.messagesContainer', $thread);
    var $i = $('h2 i', $thread);
    
    $('h2', $thread).click(function() {   //when you click tab
        $(this).css('top', $container.height() - 5);   //move whole thread
        $thread.toggleClass('collapsed');  //hide messages and form
        
        if ($thread.hasClass('collapsed') === false && $i.hasClass('fa-envelope') === true) { //if is being notified and is no longer collapsed
            scrollToLastMessage(thread, true); //scroll down and remove notification
            $i.addClass('fa-envelope-o');
            $i.removeClass('fa-envelope');
        }
    });
}

function notifyOfNewMessage(thread) {
    var $thread =  $('#thread' + thread);
    var $messages = $('.messages', $thread);
    var $i = $('h2 i', $thread);
    $i.removeClass('fa-envelope-o'); //show notification
    $i.addClass('fa-envelope');
    
    /* removing notifications */
    if ((isAtBottom($messages) === true || $messages.hasScrollBar().vertical === false) && $thread.hasClass('collapsed') === false) {
        /* notification will appear briefly on noncollapsed at bottom or not big enough to have a scrollbar */
         clearTimeout(timeout);
         var timeout = setTimeout(function() {
            $i.addClass('fa-envelope-o');
            $i.removeClass('fa-envelope');
         }, 1000);   
    }
    
    if ($thread.hasClass('collapsed') === false) {
        $messages.scroll(function() { //if you scroll down to bottom, remove notification
            clearTimeout(messageScrollTimer);
            var messageScrollTimer = setTimeout(function() {
                if (isAtBottom($messages)) {
                    $i.addClass('fa-envelope-o');
                    $i.removeClass('fa-envelope');
                    $messages.off('scroll'); //remove event listener once notification is removed
                }
            }, 1000);
        });
    }
}

function isAtBottom($messages) {
    if (($messages.scrollTop() + $messages.height()) === $messages[0].scrollHeight) { //if is scrolled to the bottom, continue showing new messages
        return true;
    } else {
        return false;
    }
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