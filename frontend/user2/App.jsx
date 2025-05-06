import React, { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://call-feature-ma0y.onrender.com');
const roomId = 'highchat-room';

function Guest() {
  const remoteAudioRef = useRef();
  const pcRef = useRef(null);

  useEffect(() => {
    socket.emit('join', roomId);

    socket.on('offer', async ({ offer }) => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.ontrack = event => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = event => {
          if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate, roomId });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { answer, roomId });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('ice-candidate', ({ candidate }) => {
      if (pcRef.current) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }, []);

  return (
    <div>
      <h2>Guest (Receiver)</h2>
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}

export default Guest;
