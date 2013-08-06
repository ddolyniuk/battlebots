$(document).ready(document_onReady);

function document_onReady() {
    if(sessionID != undefined && sessionKey != undefined) {
        var socket = io.connect('http://localhost:1337');
        socket.emit('getWorkshopItems', {sessionID: sessionID, sessionKey: sessionKey});
        socket.on('sendWorkshopItems', function (data) {
            console.log(data);
        });
    }
}