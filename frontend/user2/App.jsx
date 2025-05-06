import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://call-feature-ma0y.onrender.com');
const roomId = 'highchat-room';

function Guest() {
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const [pc, setPc] = useState(null);

  useEffect(() => {
    socket.emit('join', roomId);

    socket.on('offer', async ({ offer }) => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        if (localAudioRef.current) {
          localAudioRef.current.srcObject = localStream;
        }

        const peerConnection = new RTCPeerConnection();

        // Send local audio to the peer connection
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });

        // Receive remote audio
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

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send answer to the admin
        socket.emit('answer', { answer, roomId });
        setPc(peerConnection);
      } catch (error) {
        console.error('Error during offer handling:', error);
        alert('Microphone access is required. Please allow it.');
      }
    });

    socket.on('ice-candidate', ({ candidate }) => {
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }, [pc]);

  return (
    <div>
      <h2>Guest (User2)</h2>
      <audio ref={localAudioRef} autoPlay muted></audio>
      <audio ref={remoteAudioRef} autoPlay></audio>
    </div>
  );
}

export default Guest;
