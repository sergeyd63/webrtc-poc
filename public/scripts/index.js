let isAlreadyCalling = false;
let getCalled = false;

const existingCalls = [];
const logElement = document.querySelector('#log')

const { RTCPeerConnection, RTCSessionDescription } = window;

const peerConnection = new RTCPeerConnection({
    iceServers: [     // Information about ICE servers - Use your own!
        {
            urls: "stun:stun.stunprotocol.org"
        }
    ]
});

let videoConstraints = { audio: true, video: true }
let currentStream = undefined

function logEvents(...vals) {
    logElement.innerHTML += '<br>***'
    vals.map(val => logElement.innerHTML = logElement.innerHTML + '<br>' + `- <strong>${val}</strong>`)
    // logElement.innerHTML = logElement.innerHTML + '<br>' + `* <strong>${vals}</strong>`
}

function unselectUsersFromList() {
    const alreadySelectedUser = document.querySelectorAll(
        ".active-user.active-user--selected"
    );

    alreadySelectedUser.forEach(el => {
        el.setAttribute("class", "active-user");
    });
}

function createUserItemContainer(socketId) {
    const userContainerEl = document.createElement("div");

    const usernameEl = document.createElement("p");

    userContainerEl.setAttribute("class", "active-user");
    userContainerEl.setAttribute("id", socketId);
    usernameEl.setAttribute("class", "username");
    usernameEl.innerHTML = `Socket: ${socketId}`;

    userContainerEl.appendChild(usernameEl);

    userContainerEl.addEventListener("click", () => {
        unselectUsersFromList();
        userContainerEl.setAttribute("class", "active-user active-user--selected");
        const talkingWithInfo = document.getElementById("talking-with-info");
        talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
        callUser(socketId);
    });

    return userContainerEl;
}

async function callUser(socketId) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit("call-user", {
        offer,
        to: socketId
    });
}

function updateUserList(socketIds) {
    const activeUserContainer = document.getElementById("active-user-container");

    socketIds.forEach(socketId => {
        const alreadyExistingUser = document.getElementById(socketId);
        if (!alreadyExistingUser) {
            const userContainerEl = createUserItemContainer(socketId);

            activeUserContainer.appendChild(userContainerEl);
        }
    });
}

const socket = io.connect("localhost:5000");
// const socket = io.connect("https://192.168.1.172:5050/");

socket.on("update-user-list", ({ users }) => {
    updateUserList(users);
});

socket.on("remove-user", ({ socketId }) => {
    const elToRemove = document.getElementById(socketId);

    if (elToRemove) {
        elToRemove.remove();
    }
});

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

peerConnection.ontrack = function ({ streams: [stream] }) {
    logEvents(`On Track set stream: ${stream}`)
    const remoteVideo = document.getElementById("remote-video");
    if (remoteVideo) {
        remoteVideo.srcObject = stream;
    }
};

peerConnection.onicecandidate = function (event) {
    if (event.candidate) {
        logEvents(`Event candidate: ${event.candidate}`)
        // Send the candidate to the remote peer
    } else {
        logEvents(`Event candidate: All ICE candidates have been sent`)
        // All ICE candidates have been sent
    }
};

peerConnection.onnegotiationneeded = function () {
    peerConnection.createOffer().then(function (offer) {
        logEvents(`Set offer: ${offer}`)
        return peerConnection.setLocalDescription(offer);
    })
        .then(function () {
            logEvents(`Send offer promise`)
            // Send the offer to the remote peer through the signaling server
        });
}
//   }

// peerConnection.onremovetrack = handleRemoveTrackEvent;
peerConnection.oniceconnectionstatechange = function (event) {
    logEvents(`ICE connection state: ${peerConnection.iceConnectionState}`)
    if (peerConnection.iceConnectionState === "failed" ||
        peerConnection.iceConnectionState === "disconnected" ||
        peerConnection.iceConnectionState === "closed") {
        // Handle the failure
    }
};

peerConnection.onicegatheringstatechange = function () {
    let label = "Unknown";
    logEvents(`ICE gathering state: ${peerConnection.iceGatheringState}`)
    switch (peerConnection.iceGatheringState) {
        case "new":
        case "complete":
            label = "Idle";
            break;
        case "gathering":
            label = "Determining route";
            break;
    }

    // document.getElementById("iceStatus").innerHTML = label;
}

peerConnection.onsignalingstatechange = function (event) {
    logEvents(`Signaling state: ${peerConnection.signalingState}`)
    if (peerConnection.signalingState === "have-local-pranswer") {
        // setLocalDescription() has been called with an answer
    }
};


const getAllDevices = async function () {
    try {
        let devices = await navigator.mediaDevices.enumerateDevices()

        const fd = devices.filter(d => d.kind === 'videoinput')

        console.log(fd)

        const deviceList = document.getElementById('devices')
        deviceList.innerHTML = '';
        deviceList.appendChild(document.createElement('option'));

        fd.forEach(mediaDevice => {
            const option = document.createElement('option');
            option.value = mediaDevice.deviceId;
            const label = mediaDevice.label || `Camera ${count++}`;
            const textNode = document.createTextNode(label);
            option.appendChild(textNode);
            deviceList.appendChild(option);
        });

        deviceList.addEventListener('change', d => {
            logEvents('Selection changed', d.target.value)
            let videoConstraints = { deviceId: { exact: d.target.value } }

            const constraints = {
                video: videoConstraints,
                audio: true
            };
            disconnect(currentStream)

            startLocalVideo(constraints)
        })

    } catch (error) {
        logEvents(err.message, err.name)
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

        currentStream.getTracks().forEach(track => peerConnection.addTrack(track, currentStream));
        const d = document.getElementById('disconnect-local')
        d.addEventListener('click', () => disconnect(currentStream))

    } catch (err) {
        /* handle the error */
        logEvents(err.message, err.name)
        // console.log(err.message);
    }
}

function disconnect(stream) {
    stream.getTracks().forEach(function (track) {
        track.stop();
    });
}

const disc = document.getElementById('disconnect-remote')

disc.addEventListener('click', () => peerConnection && peerConnection.close())

startLocalVideo()
