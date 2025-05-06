import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://call-feature-ma0y.onrender.com');
const roomId = 'highchat-room';

function Guest() {
  const remoteAudioRef = useRef();
  const [pc, setPc] = useState(null);

  useEffect(() => {
    socket.emit('join', roomId);

    socket.on('offer', async ({ offer }) => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const peerConnection = new RTCPeerConnection();

        peerConnection.ontrack = event => {
          // Set the remote stream for playback
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        // Add tracks to the peer connection
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = event => {
          if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate, roomId });
          }
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Create an answer and send it to the admin
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('answer', { answer, roomId });
        setPc(peerConnection);
      } catch (error) {
        console.error('Error during offer handling:', error);
        alert("Error handling the offer. Please check microphone permissions.");
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
      <audio ref={remoteAudioRef} autoPlay></audio>
    </div>
  );
}

export default Guest;
