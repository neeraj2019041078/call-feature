// Admin.js
import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://call-feature-ma0y.onrender.com'); // Your deployed backend
const roomId = 'highchat-room';

function Admin() {
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const [pc, setPc] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.emit('join', roomId);

    socket.on('answer', async ({ answer }) => {
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', ({ candidate }) => {
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }, [pc]);

  const startCall = async () => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = localStream;
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Add tracks
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Receive remote audio
      peerConnection.ontrack = (event) => {
        console.log('👂 Received remote stream on Admin');
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Send ICE candidates
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
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access error.');
    }
  };

  const endCall = () => {
    pc?.close();
    setConnected(false);
  };

  return (
    <div>
      <h2>Admin (User1)</h2>
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />
      {!connected ? (
        <button onClick={startCall}>Start Call</button>
      ) : (
        <button onClick={endCall}>End Call</button>
      )}
    </div>
  );
}

export default Admin;
