let isAlreadyCalling = false;
let getCalled = false;

const existingCalls = [];
const logElement = document.querySelector('#log')

const { RTCPeerConnection, RTCSessionDescription } = window;

let peerConnection = undefined
// new RTCPeerConnection({
//     iceServers: [     // Information about ICE servers - Use your own!
//         {
//             urls: "stun:stun.stunprotocol.org"
//         }
//     ]
// });

// let peerConnection = null

let videoConstraints = { audio: true, video: true }
let currentStream = undefined
let localStream = undefined
let cameraOn = false
const activeUserContainer = document.getElementById("myId");
const myName = document.querySelector('#myName input')
const saveName = document.getElementById('saveBtn')
const userListSelect = document.getElementById('userListSelect')
const userListDiv = document.getElementById('userListDiv')
let iceCandidates = []

const toggleCamera = document.getElementById('toggleCamera')
toggleCamera.addEventListener('click', toggleVideo)

const toggleMic = document.getElementById('toggleMic')


myName.value = localStorage.getItem('myName')

function logEvents(...vals) {
    if (logElement) {
        logElement.innerHTML = '***<br>' + logElement.innerHTML
        vals.map(val => logElement.innerHTML = `- <strong style="overflow-wrap: anywhere;">${val}</strong>` + '<br>' + logElement.innerHTML)
    }
    else {
        console.log(...vals)
    }
}

function unselectUsersFromList() {
    // const alreadySelectedUser = document.querySelectorAll(
    //     ".active-user.active-user--selected"
    // );

    // alreadySelectedUser.forEach(el => {
    //     el.setAttribute("class", "active-user");
    // });
}

function createUserItemContainer(socketId) {
    // const userContainerEl = document.createElement("div");

    // const usernameEl = document.createElement("p");

    // userContainerEl.setAttribute("class", "active-user");
    // userContainerEl.setAttribute("id", socketId);
    // usernameEl.setAttribute("class", "username");
    // usernameEl.innerHTML = `Socket: ${socketId}`;

    // userContainerEl.appendChild(usernameEl);

    // userContainerEl.addEventListener("click", () => {
    //     unselectUsersFromList();
    //     userContainerEl.setAttribute("class", "active-user active-user--selected");
    //     const talkingWithInfo = document.getElementById("talking-with-info");
    //     talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
    //     callUser(socketId);
    // });

    // return userContainerEl;
}

async function initPeerConnection(socketId) {
    if (peerConnection) {

        return peerConnection
    }
    else {
        iceCandidates = []
    }
    console.log('initPeerConnection')
    peerConnection = new RTCPeerConnection({
        iceServers: [
            // {
            //     urls: "stun:stun.services.mozilla.com",
            //     username: "louis@mozilla.com",
            //     credential: "webrtcdemo"
            // },
            // {
            //     urls: 'turn:numb.viagenie.ca',
            //     credential: 'muazkh',
            //     username: 'webrtc@live.com'
            // },
            {
                urls: [
                    // "stun:stun.l.google.com:19302",
                    // "stun:stun1.l.google.com:19302",
                    // "stun:stun2.l.google.com:19302",
                    // "stun:stun3.l.google.com:19302",
                    // "stun:stun4.l.google.com:19302",
                    // "stun:stun.example.com",
                    // "stun:stun-1.example.com",
                    // "stun:stun.stunprotocol.org"
                    "stun:192.168.1.172:3478"
                ]
            }]
    });

    peerConnection.ontrack = function ({ streams: [stream] }) {
        logEvents(`peerConnection - On Track set stream: ${stream}`)
        const remoteVideo = document.getElementById("remote-video");
        if (remoteVideo) {
            remoteVideo.srcObject = stream;
        }
    };

    peerConnection.onicecandidate = function (event) {
        if (event.candidate) {
            //console.log(`peerConnection - Event candidate`, event.candidate)
            // Send the candidate to the remote peer
            iceCandidates.push(event.candidate)
            // socket.emit('send-ice-candidate', {
            //     iceCandidate: event.candidate,
            //     to: socketId
            // })
        } else {
            console.log(`peerConnection - Event candidate: All ICE candidates have been collected`, iceCandidates)
            // All ICE candidates have been sent
        }
    };
    if (!currentStream) {
        return peerConnection
    }
    currentStream.getTracks().forEach(track => peerConnection.addTrack(track, currentStream));
    cameraOn = true

    // peerConnection.onnegotiationneeded = function () {
    //     peerConnection.createOffer().then(function (offer) {
    //         console.log(`peerConnection - Set offer`, offer)
    //         return peerConnection.setLocalDescription(offer);
    //     })
    //         .then(function () {
    //             logEvents(`peerConnection - Send offer promise`)
    //             // Send the offer to the remote peer through the signaling server
    //         });
    //     // }
    // }

    // peerConnection.onremovetrack = handleRemoveTrackEvent;
    peerConnection.oniceconnectionstatechange = async function (event) {
        console.log(`peerConnection - ICE connection state`, peerConnection.iceConnectionState)
        switch (peerConnection.iceConnectionState) {
            case 'connected':
                // case 'completed':
                let candidatePair = []
                let candidateList = []
                const statsDiv = document.getElementById('stats')
                // setInterval(async () => {
                const stats = await peerConnection.getStats();
                stats.forEach(stat => {
                    if (stat.type === 'candidate-pair') {
                        const exists = candidatePair.find(cp => cp.id === stat.id)
                        !exists && candidatePair.push(stat)
                        // console.log('ICE STAT', stat)
                    }
                    else if (stat.type === 'remote-candidate' || stat.type === 'local-candidate') {
                        console.log(stat)
                        const cExist = candidateList.find(c => c.id === stat.id)
                        if (!cExist) {
                            candidateList.push(stat)
                        }
                    }
                })

                candidatePair.forEach(pair => {
                    const ids = pair.id.split('_')

                    let c1 = candidateList.find(c => c.id.split('_')[1] === ids[1])
                    let c2 = candidateList.find(c => c.id.split('_')[1] === ids[2])
                    console.log('Candidate Pair', pair, c1, c2)
                    let pairDiv = document.getElementById(pair.id)
                    if (!pairDiv) {
                        pairDiv = document.createElement('div')
                        pairDiv.id = pair.id
                        statsDiv.append(pairDiv)
                    }
                    // let c1Div = document.getElementById()

                    pairDiv.innerHTML = JSON.stringify(pair)
                })
                // }, 1000)
                // console.log(peerConnection.iceConnectionState)

                break;

            default:
                break;
        }
        if (peerConnection.iceConnectionState === "failed" ||
            peerConnection.iceConnectionState === "disconnected" ||
            peerConnection.iceConnectionState === "closed") {
            // Handle the failure
        }
    };

    peerConnection.onicegatheringstatechange = function () {
        let label = "Unknown";
        console.log(`peerConnection - ICE gathering state`, peerConnection.iceGatheringState)
        switch (peerConnection.iceGatheringState) {
            case "new":
            case "complete":
                label = "Idle";
                console.log('ICE gathering - new/complete')
                break;
            case "gathering":
                label = "Determining route";
                console.log('ICE gathering - gathering')
                break;
        }

        // document.getElementById("iceStatus").innerHTML = label;

    }

    // peerConnection.onsignalingstatechange = function (event) {
    //     logEvents(`peerConnection - Signaling state: ${peerConnection.signalingState}`)
    //     if (peerConnection.signalingState === "have-local-pranswer") {
    //         // setLocalDescription() has been called with an answer
    //     }
    // };



    return peerConnection
}

function updateUserList(socketIds, userNames) {
    // console.log('updated lists', socketIds, userNames)
    userNames.forEach(user => {
        // const alreadyExistingUser = document.getElementById(user.socketId);
        // alreadyExistingUser && alreadyExistingUser.remove()
        // if (!alreadyExistingUser) {
        // const userContainerEl = createUserItemContainer(socketId);
        const existingU = userListDiv.querySelector(`div[socket='${user.socketId}']`)
        existingU && existingU.remove()

        // const option = document.createElement('option');
        // option.id = user.socketId
        // option.value = user.socketId;
        // const textNode = document.createTextNode(user.name);
        // option.appendChild(textNode);
        // userListSelect.appendChild(option);


        const userDiv = document.createElement('div')
        userDiv.classList.add('call-user-btn')
        const nameSpan = document.createElement('div')
        nameSpan.classList.add('call-btn-name')
        nameSpan.innerText = user.name
        // userDiv.addEventListener('click', e => callClickedUser(e, 'video'))
        userDiv.setAttribute('socket', user.socketId)

        const vDiv = document.createElement('div')
        vDiv.classList.add('video-btn', 'call-btns')
        vDiv.setAttribute('socket', user.socketId)
        vDiv.addEventListener('click', e => callClickedUser(e, 'video'))
        const aDiv = document.createElement('div')
        aDiv.classList.add('audio-btn', 'call-btns')
        aDiv.setAttribute('socket', user.socketId)
        aDiv.addEventListener('click', e => callClickedUser(e, 'audio'))

        userDiv.append(vDiv, nameSpan, aDiv)

        userListDiv.appendChild(userDiv);
        // }
    });
}
/****************************************************************************************************************************/
// const socket = io.connect("192.168.2.15:5050");
const socket = io.connect("localhost:5050");
// const socket = io.connect("http://192.168.1.172:5050/");
// const socket = io.connect("https://videotest.dev.zebu.io/");

socket.on('connect', () => {
    // console.log('My socket id', socket.id, myName.value)
    activeUserContainer.innerHTML = `My id: <strong>${socket.id}</strong>`

    socket.emit("username-update", {
        socketId: socket.id,
        name: myName.value || socket.id
    })
})

socket.on('new-ice-candidate', async data => {
    console.log('--- new-ice-candidate')
    try {
        console.log('ICE recieved', data.iceC.candidate)
        await peerConnection.addIceCandidate(data.iceC)
    } catch (error) {
        console.log('ice candidate FAILED', error)
    }

})

socket.on('userlist-update', userList => {
    console.log('user list', userList)
})

socket.on("update-user-list", ({ users, userNames }) => {
    // console.log('socket list', users, userNames)
    // const userInput = document.getElementById('call-to')
    // userInput.value = users[users.length - 1]
    userNames && updateUserList(users, userNames);
});

socket.on("remove-user", ({ socketId }) => {
    const elToRemove = document.getElementById(socketId);
    const existingU = userListDiv.querySelector(`.call-user-btn[socket='${socketId}']`)
    // console.log('remove user fired', socketId, existingU)
    existingU && existingU.remove()

    if (elToRemove) {
        elToRemove.remove();
    }
});

async function callUser(callToSocketId, type) {
    // const constraints = {
    //     video: { deviceId: { exact: 'a5ea918c1e49282103b621c4276fa26fc968846ab1f78871d385bb6bab746d2a' } },
    //     audio: true
    // }

    videoConstraints = {
        video: type === 'video',
        audio: true
    }
    // console.log('constraint', videoConstraints)
    // await startLocalVideo(constraints)
    await startLocalVideo(videoConstraints)

    peerConnection = await initPeerConnection(callToSocketId)
    // console.log('after init peer connection')
    const offer = await peerConnection.createOffer();
    // console.log('after create offer')
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
    // console.log('after set local description')

    socket.emit("call-user", {
        offer,
        to: callToSocketId,
        videoConstraints,
        name: localStorage.getItem('myName') || callToSocketId
    });
}

// accept or not call 
socket.on("call-made", async data => {
    logEvents(`Get Called: ${getCalled}`)
    if (getCalled) {
        const confirmed = confirm(
            `User "${data.name}" wants to call you. Do accept this call?`
        );

        if (!confirmed) {
            socket.emit("reject-call", {
                from: data.socket
            });

            return;
        }
    }

    // console.log('call made with constraints', data.videoConstraints)
    await startLocalVideo(data.videoConstraints)

    await initPeerConnection(data.socket)

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    );



    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
    console.log('all target ICE candidates', iceCandidates)
    iceCandidates.forEach(candidate => {
        socket.emit('send-ice-candidate', {
            iceCandidate: candidate,
            to: data.socket
        })
    })

    socket.emit("make-answer", {
        answer,
        to: data.socket,
        isVideo: data.videoConstraints.video
    });
    getCalled = true;
});
// accepted answer
socket.on("answer-made", async data => {
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
    );
    console.log('all origin ICE candidates', iceCandidates)
    iceCandidates.forEach(candidate => {
        socket.emit('send-ice-candidate', {
            iceCandidate: candidate,
            to: data.socket
        })
    })

    if (!isAlreadyCalling) {
        callUser(data.socket, data.isVideo ? 'video' : 'audio');
        isAlreadyCalling = true;
    }
});

socket.on("call-rejected", data => {
    alert(`User: "Socket: ${data.socket}" rejected your call.`);
    unselectUsersFromList();
});

socket.on("hang-up", () => {
    console.log('broadcast hangup')
    logEvents('called for hangup')
    disconnect(currentStream, true)
})

const getAllDevices = async function () {
    try {
        let devices = await navigator.mediaDevices.enumerateDevices()

        const fd = devices.filter(d => d.kind === 'videoinput')

        // console.log(fd)

        const deviceList = document.getElementById('devices')
        deviceList.innerHTML = '';
        deviceList.appendChild(document.createElement('option'));

        const dList = document.getElementById('dList')

        fd.forEach(mediaDevice => {
            const option = document.createElement('option');
            option.value = mediaDevice.deviceId;
            const label = mediaDevice.label || `Camera`;
            const textNode = document.createTextNode(label);
            option.appendChild(textNode);
            deviceList.appendChild(option);
            dList.innerHTML = `${dList.innerHTML} <br> id: ${mediaDevice.deviceId} <br> name: ${mediaDevice.label} <br> kind: ${mediaDevice.kind}`
        });

        // deviceList.addEventListener('change', d => {
        // logEvents('Selection changed', d.target.value)
        // let videoConstraints = { deviceId: { exact: d.target.value } }

        // const constraints = {
        //     video: videoConstraints,
        //     audio: true
        // };
        // })

    } catch (error) {
        console.log('get all devices exception', error.message, error.name)
    }
}
getAllDevices()

const startLocalVideo = async function (constraints = videoConstraints) {

    try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints)

        /* use the stream */
        const localVideo = document.getElementById("local-video");
        // console.log('start local video', constraints, localVideo)
        if (localVideo) {
            localVideo.srcObject = currentStream;
        }

        // currentStream.getTracks().forEach(track => {
        //     console.log('--- added track')
        //     peerConnection.addTrack(track, currentStream)
        // });
        // console.log('added tracks', currentStream.getTracks().length)
        // currentStream.getTracks().forEach(track => peerConnection.addTrack(track, currentStream));

        const d = document.getElementById('disconnect-local')
        d.addEventListener('click', () => disconnect(currentStream))

    } catch (err) {
        /* handle the error */
        logEvents('startLocalVideo', err.message, err.name)
        // console.log(err.message);
    }
}

function disconnect(stream, hangUp = false) {
    logEvents('DISCONNECT')

    stream && stream.getTracks().forEach(function (track) {
        track.stop();
    });

    if (hangUp && peerConnection) {
        peerConnection.close()
    }
    // socket.emit('disconnect')
}

const disc = document.getElementById('disconnect-remote')

disc.addEventListener('click', () => {
    console.log('hangup')
    socket.emit("hangup-all")
})

// const callBtn = document.getElementById('call-btn')
// callBtn.addEventListener('click', (e) => {
//     // const userId = document.getElementById('call-to').value
//     const userId = document.getElementById('userListSelect').value
//     console.log('selected', userId)

//     callUser(userId)
// })

function callClickedUser(e, type) {
    const selectedSocket = e.target.getAttribute('socket')

    callUser(selectedSocket, type)
}

function toggleVideo(close) {
    if (!currentStream) {
        return
    }

    if (cameraOn) {
        currentStream.getTracks().forEach(function (track) {
            track.stop();
            // console.log('track enabled', track.enabled)
            // track.enabled = !track.enabled
        });
    }
    else {
        currentStream.getTracks().forEach(track => peerConnection.addTrack(track, currentStream));
    }
    cameraOn = !cameraOn
}

saveName.addEventListener('click', (e) => {
    localStorage.setItem('myName', myName.value)
    socket.emit("username-update", {
        socketId: socket.id,
        name: myName.value || socket.id
    })
})
