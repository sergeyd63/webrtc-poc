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
const activeUserContainer = document.getElementById("active-user-container");

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

async function initPeerConnection() {
    console.log('initPeerConnection')

    if (peerConnection) {
        return peerConnection
    }
    peerConnection = await new RTCPeerConnection({
        iceServers: [     // Information about ICE servers - Use your own!
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    });

    peerConnection.ontrack = function ({ streams: [stream] }) {
        logEvents(`peerConnection - On Track set stream: ${stream}`)
        const remoteVideo = document.getElementById("remote-video");
        if (remoteVideo) {
            remoteVideo.srcObject = stream;
        }
    };

    // peerConnection.onicecandidate = function (event) {
    //     if (event.candidate) {
    //         logEvents(`peerConnection - Event candidate: ${event.candidate}`)
    //         // Send the candidate to the remote peer
    //     } else {
    //         logEvents(`peerConnection - Event candidate: All ICE candidates have been sent`)
    //         // All ICE candidates have been sent
    //     }
    // };

    currentStream.getTracks().forEach(track => peerConnection.addTrack(track, currentStream));

    // peerConnection.onnegotiationneeded = function () {
    //     peerConnection.createOffer().then(function (offer) {
    //         logEvents(`peerConnection - Set offer: ${offer}`)
    //         return peerConnection.setLocalDescription(offer);
    //     })
    //         .then(function () {
    //             logEvents(`peerConnection - Send offer promise`)
    //             // Send the offer to the remote peer through the signaling server
    //         });
    // }
    //   }

    // peerConnection.onremovetrack = handleRemoveTrackEvent;
    // peerConnection.oniceconnectionstatechange = function (event) {
    //     logEvents(`peerConnection - ICE connection state: ${peerConnection.iceConnectionState}`)
    //     if (peerConnection.iceConnectionState === "failed" ||
    //         peerConnection.iceConnectionState === "disconnected" ||
    //         peerConnection.iceConnectionState === "closed") {
    //         // Handle the failure
    //     }
    // };

    // peerConnection.onicegatheringstatechange = function () {
    //     let label = "Unknown";
    //     logEvents(`peerConnection - ICE gathering state: ${peerConnection.iceGatheringState}`)
    //     switch (peerConnection.iceGatheringState) {
    //         case "new":
    //         case "complete":
    //             label = "Idle";
    //             console.log('ICE gathering - new/complete')
    //             break;
    //         case "gathering":
    //             label = "Determining route";
    //             console.log('ICE gathering - gathering')
    //             break;
    //     }

    //     // document.getElementById("iceStatus").innerHTML = label;

    // }

    // peerConnection.onsignalingstatechange = function (event) {
    //     logEvents(`peerConnection - Signaling state: ${peerConnection.signalingState}`)
    //     if (peerConnection.signalingState === "have-local-pranswer") {
    //         // setLocalDescription() has been called with an answer
    //     }
    // };



    return peerConnection
}

// function updateUserList(socketIds) {
// socketIds.forEach(socketId => {
//     const alreadyExistingUser = document.getElementById(socketId);
//     if (!alreadyExistingUser) {
//         const userContainerEl = createUserItemContainer(socketId);

//         activeUserContainer.appendChild(userContainerEl);
//     }
// });
// }

// const socket = io.connect("192.168.2.15:5050");
// const socket = io.connect("localhost:5050");
const socket = io.connect("https://192.168.1.172:5050/");

socket.on('connect', () => {
    console.log('socket id', socket.id)
    activeUserContainer.innerHTML = `My id: <strong>${socket.id}</strong>`
})


socket.on("update-user-list", ({ users }) => {
    console.log(users)
    const userInput = document.getElementById('call-to')
    userInput.value = users[users.length - 1]
    // updateUserList(users);
});

socket.on("remove-user", ({ socketId }) => {
    // const elToRemove = document.getElementById(socketId);

    // if (elToRemove) {
    //     elToRemove.remove();
    // }
});

async function callUser(socketId) {
    const constraints = {
        video: { deviceId: { exact: 'a5ea918c1e49282103b621c4276fa26fc968846ab1f78871d385bb6bab746d2a' } },
        audio: true
    }

    // await startLocalVideo(constraints)
    await startLocalVideo()

    peerConnection = await initPeerConnection()

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit("call-user", {
        offer,
        to: socketId
    });
}

// accept call 
socket.on("call-made", async data => {
    logEvents(`Get Called: ${getCalled}`)
    if (getCalled) {
        const confirmed = confirm(
            `User "Socket: ${data.socket}" wants to call you. Do accept this call?`
        );

        if (!confirmed) {
            socket.emit("reject-call", {
                from: data.socket
            });

            return;
        }
    }

    const constraints = {
        video: { deviceId: { exact: '3b23687e7adb835e497f8b937f975a9e470d3d83ab31e37a30c920a08fc6f3c9' } },
        audio: true
    }

    // await startLocalVideo(constraints)
    await startLocalVideo()

    await initPeerConnection()

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    socket.emit("make-answer", {
        answer,
        to: data.socket
    });
    getCalled = true;
});
// accept answer
socket.on("answer-made", async data => {
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
    );

    if (!isAlreadyCalling) {
        callUser(data.socket);
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

        console.log(fd)

        const deviceList = document.getElementById('devices')
        deviceList.innerHTML = '';
        deviceList.appendChild(document.createElement('option'));

        const dList = document.getElementById('dList')

        fd.forEach(mediaDevice => {
            const option = document.createElement('option');
            option.value = mediaDevice.deviceId;
            const label = mediaDevice.label || `Camera ${count++}`;
            const textNode = document.createTextNode(label);
            option.appendChild(textNode);
            deviceList.appendChild(option);
            dList.innerHTML = `${dList.innerHTML} <br> id: ${mediaDevice.deviceId} <br> name: ${mediaDevice.label} `
        });

        deviceList.addEventListener('change', d => {
            logEvents('Selection changed', d.target.value)
            let videoConstraints = { deviceId: { exact: d.target.value } }

            const constraints = {
                video: videoConstraints,
                audio: true
            };
            // disconnect(currentStream)

            // startLocalVideo(constraints)
        })

    } catch (error) {
        logEvents(error.message, error.name)
    }
}
getAllDevices()

const startLocalVideo = async function (constraints = videoConstraints) {

    try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints)
        /* use the stream */
        const localVideo = document.getElementById("local-video");
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

    stream.getTracks().forEach(function (track) {
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

const callBtn = document.getElementById('call-btn')
callBtn.addEventListener('click', (e) => {
    const userId = document.getElementById('call-to').value
    console.log(userId)

    callUser(userId)
})

// startLocalVideo()
