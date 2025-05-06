import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://call-feature-ma0y.onrender.com');
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

  const startCall = async () => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = localStream;
      }

      const peerConnection = new RTCPeerConnection();

      // Send local audio to the peer connection
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

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

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to the guest
      socket.emit('offer', { offer, roomId });

      setPc(peerConnection);
      setConnected(true);
    } catch (error) {
      console.error('Error accessing media devices: ', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  const endCall = () => {
    pc?.close();
    setConnected(false);
  };

  return (
    <div>
      <h2>Admin (User1)</h2>
      <audio ref={localAudioRef} autoPlay muted></audio>
      <audio ref={remoteAudioRef} autoPlay></audio>
      {!connected ? (
        <button onClick={startCall}>Start Call</button>
      ) : (
        <button onClick={endCall}>End Call</button>
      )}
    </div>
  );
}

export default Admin;
