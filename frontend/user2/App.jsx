import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');
const roomId = 'highchat-room';

function Guest() {
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const [incomingCall, setIncomingCall] = useState(false);
  const [pc, setPc] = useState(null);

  useEffect(() => {
    socket.emit('join', roomId);

    socket.on('incoming-call', () => {
      setIncomingCall(true);
    });

    socket.on('offer', async ({ offer }) => {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (localAudioRef.current) localAudioRef.current.srcObject = localStream;

      const peerConnection = new RTCPeerConnection();
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

      peerConnection.ontrack = event => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
      };

      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate, roomId });
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', { answer, roomId });

      setPc(peerConnection);
      setIncomingCall(false);
    });

    socket.on('ice-candidate', ({ candidate }) => {
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }, [pc]);

  const acceptCall = () => {
    socket.emit('call-accepted', { roomId });
  };

  return (
    <div>
      <h2>Guest (User2)</h2>
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />
      {incomingCall && <button onClick={acceptCall}>Accept Incoming Call</button>}
    </div>
  );
}

export default Guest;
