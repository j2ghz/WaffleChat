/* global io from another file, provided by index.jade */
var socket = io();
var m = $('#messageInput');

$("button#joinThread").click(function(){
	socket.emit('joinThread', prompt("Select thread"));
});
$('#messageForm').submit(function(){
	if(m.val()!==""){
		socket.emit('chatMessage', m.val());
		m.val('');
	}
	return false;
});
socket.on('chatMessage', function(msg){
	$('#messages').append($('<li>').text(msg));
});
socket.on('updateThreads',function(data){
	console.log('updateThreads');
	$("#threads").text(data);
});