import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');
const roomId = 'highchat-room';

function Admin() {
  const localAudioRef = useRef();
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
      pc?.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }, [pc]);

  const startCall = async () => {
    try {
      // Request audio and video access
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Display the stream in the audio element
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = localStream;
      }

      // Peer connection setup
      const peerConnection = new RTCPeerConnection();
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

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
      console.error('Error accessing media devices: ', error);
      alert("Error accessing microphone. Please check permissions.");
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
      {!connected ? (
        <button onClick={startCall}>Start Call</button>
      ) : (
        <button onClick={endCall}>End Call</button>
      )}
    </div>
  );
}

export default Admin;
