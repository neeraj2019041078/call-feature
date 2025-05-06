import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://call-feature-ma0y.onrender.com');
const roomId = 'highchat-room';

function Guest() {
  const localAudio = useRef();
  const remoteAudio = useRef();
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const [incomingCall, setIncomingCall] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.emit('join', { roomId, userType: 'guest' });

    socket.on('incoming-call', () => {
      setIncomingCall(true);
    });

    socket.on('offer', async ({ offer }) => {
      const pc = createPeerConnection();
      await setupLocalStream();

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', { answer, roomId });
      setConnected(true);
    });

    socket.on('answer', async ({ answer }) => {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', ({ candidate }) => {
      pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => socket.disconnect();
  }, []);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection();
    pc.onicecandidate = e => {
      if (e.candidate) {
        socket.emit('ice-candidate', { candidate: e.candidate, roomId });
      }
    };
    pc.ontrack = e => {
      remoteAudio.current.srcObject = e.streams[0];
    };
    pcRef.current = pc;
    return pc;
  };

  const setupLocalStream = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = localStream;
    localAudio.current.srcObject = localStream;
    localStream.getTracks().forEach(track => pcRef.current.addTrack(track, localStream));
  };

  const startCall = () => {
    socket.emit('start-call', { roomId, from: 'guest' });
  };

  const acceptCall = async () => {
    setIncomingCall(false);
    await setupLocalStream();
  };

  const sendOffer = async () => {
    const pc = createPeerConnection();
    await setupLocalStream();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { offer, roomId });
    setConnected(true);
  };

  const endCall = () => {
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    setConnected(false);
  };

  return (
    <div>
      <h2>Guest</h2>
      <audio ref={localAudio} autoPlay muted />
      <audio ref={remoteAudio} autoPlay />

      {!connected ? (
        incomingCall ? (
          <button onClick={acceptCall}>Accept Call</button>
        ) : (
          <button onClick={startCall}>Start Call</button>
        )
      ) : (
        <button onClick={endCall}>End Call</button>
      )}

      {!connected && !incomingCall && (
        <button onClick={sendOffer}>Send Offer (Manually start WebRTC)</button>
      )}
    </div>
  );
}

export default Guest;
