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
    content += '<h2>' + name + '</h2>';
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
    scrollToLastMessage(thread, false);
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
	$('#thread' + thread + ' .messages').append($('<li>').text(content));
    scrollToLastMessage(thread, true);
});

//styling
var resizeTimer;
function resizeElements() {
    var h = $(".threadContainer").first().height();
    $("#chatContainer ul.messages").height(h);  
}

$(window).resize(function() { 
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeElements, 250); //resize throttling
});

function scrollToLastMessage(thread, animation) {
    var ul = $('#thread' + thread + ' ul');
    var duration = 0;
    if (animation === true) {
        duration = 400;
    }
    ul.animate({
        scrollTop: ul[0].scrollHeight,
    }, duration);
}

function makeCollapsible(thread) {
    var $thread = $('#thread' + thread);
    var $container = $('.messagesContainer', $thread);
    $('h2', $thread).click(function() {   
        $thread.css('top', $container.height());   
        $thread.toggleClass('collapsed');
    });
}