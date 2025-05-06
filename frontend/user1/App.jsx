import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');
const roomId = 'highchat-room';

function Admin() {
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const [pc, setPc] = useState(null);
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    socket.emit('join', roomId);

    // When Guest accepts the call
    socket.on('call-accepted', async () => {
      console.log('✅ Guest accepted the call');
      setWaiting(false);

      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = localStream;
      }

      const peerConnection = new RTCPeerConnection();
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

      peerConnection.ontrack = event => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate, roomId });
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', { offer, roomId });

      setPc(peerConnection);
      setConnected(true);
    });

    socket.on('answer', async ({ answer }) => {
      if (pc) {
        console.log('📡 Admin received answer');
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', ({ candidate }) => {
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }, [pc]);

  const startCall = () => {
    socket.emit('call-request', { roomId });
    setWaiting(true);
    alert('📞 Call request sent. Waiting for Guest to accept...');
  };

  const endCall = () => {
    pc?.close();
    setConnected(false);
    setWaiting(false);
  };

  return (
    <div>
      <h2>Admin (User1)</h2>
      <audio ref={localAudioRef} autoPlay muted></audio>
      <audio ref={remoteAudioRef} autoPlay></audio>
      {!connected && !waiting && (
        <button onClick={startCall}>Start Call</button>
      )}
      {waiting && <p>⏳ Waiting for Guest to accept...</p>}
      {connected && <button onClick={endCall}>End Call</button>}
    </div>
  );
}

export default Admin;
