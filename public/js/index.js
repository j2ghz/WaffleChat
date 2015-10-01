/* global io from another file, provided by index.jade */
var socket = io();
var m = $('#m');
socket.on('connect',function(){
	socket.emit('joinRoom', prompt("Select room"));
});
$('form').submit(function(){
	if(m.val()!==""){
		socket.emit('chat message', m.val());
		m.val('');
	}
	return false;
});
socket.on('chat message', function(msg){
	$('#messages').append($('<li>').text(msg));
});