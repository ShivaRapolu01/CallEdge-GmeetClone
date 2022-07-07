const screenPeer = new Peer()
let screenStream = null;
let screenID;


screenPeer.on('open', id => {
    screenID = id;
})

let sharingScreen = false

function shareUnshare(){
    if(sharingScreen){
        stopScreenShare();
        return;
    }
    try{
        var displayMediaOptions = {
            video: {
                cursor: "always"
            },
            audio: false
        };
        
        navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
        .then(function (stream) {
            screenStream = stream
            setStopShareScreen()
            socket.emit('screen-shared', ROOM_ID, screenID)
            screenPeer.on('call', call => {
                call.answer(screenStream)
            }) 
        });

        sharingScreen = true;
    } catch(err){
        console.log(err);
    }
}


function stopScreenShare(){
    socket.emit('screen-unshared', screenID)
    let tracks = screenStream.getTracks();
    tracks.forEach(track => track.stop());
    screenStream = null;
    setShareScreen();
    sharingScreen = false;
}