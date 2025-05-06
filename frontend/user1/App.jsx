import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://call-feature-ma0y.onrender.com');
const roomId = 'highchat-room';

function Admin() {
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const pcRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.emit('join', roomId);

    socket.on('answer', async ({ answer }) => {
      if (pcRef.current && !pcRef.current.remoteDescription) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', ({ candidate }) => {
      if (pcRef.current) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }, []);

  const startCall = async () => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = localStream;
      }

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

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { offer, roomId });

      setConnected(true);
    } catch (error) {
      console.error('Error during startCall:', error);
    }
  };

  const endCall = () => {
    pcRef.current?.close();
    setConnected(false);
  };

  return (
    <div>
      <h2>Admin (Caller)</h2>
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
