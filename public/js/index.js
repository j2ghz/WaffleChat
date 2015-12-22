/* global io from another file, provided by index.jade */
var socket = io();

$('button#createThread').click(function() {
	socket.emit('createThread', prompt('Select thread'));
});

$('#messageForm').submit(function() {
    var $messageInput = $('#messageInput');
	if ($messageInput.val() !== '') {
		socket.emit('message', $messageInput.val());
		$messageInput.val('');
	}
	return false;
});

socket.on('message', function(content) {
	$('#messages').append($('<li>').text(content));
});

socket.on('printMessages',function(messages) {
	$('#messages').text('');
	messages.forEach(function(message) {
		$('#messages').append('<li>' + message.content + '</li>');	
	});
});

socket.on('printThreads', function(threads) {
	$('#threads').text('');
	threads.forEach(function(thread) {
		$('#threads').append('<li><a href="' + thread.id + '">' + thread.name + '</a></li>');	
	});
	$('#threads a').click(function(e) {
        e.preventDefault();
		socket.emit('joinThread', $(this).attr('href'));
	});
});

socket.on('threadJoined', function(name) {
    $('#currentThread').text(name);
});