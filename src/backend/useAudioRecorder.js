import { useState, useEffect, useRef } from 'react';


//Custom hook for recording audio in React applications
export const useAudioRecorder = () => {
  // State for recording status and errors
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  // Ref variables for audio recording functionality
  const audioContext = useRef(null);
  const microphoneStream = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);


  //Initialize audio context and set up microphone stream
  const initAudioContext = async () => {
    if (!audioContext.current) {
      try {
        // Create audio context for advanced audio processing
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
        
        // Request microphone access and store the stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneStream.current = stream;
        
        // Initialize MediaRecorder with the microphone stream
        mediaRecorder.current = new MediaRecorder(stream);
        
        // Store audio data as it becomes available
        mediaRecorder.current.ondataavailable = (event) => {
          audioChunks.current.push(event.data);
        };
      } catch (err) {
        console.error('Error initializing audio:', err);
        setError(err.message);
      }
    }
  };


  //Start audio recording
  const startRecording = async () => {
    try {
      await initAudioContext();
      audioChunks.current = [];
      mediaRecorder.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err.message);
    }
  };

  //Stop audio recording and return the recorded audio as a blob
  const stopRecording = () => {
    return new Promise((resolve) => {
      if (mediaRecorder.current && isRecording) {
        mediaRecorder.current.onstop = () => {
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
          audioChunks.current = [];
          resolve(audioBlob);
        };
        
        mediaRecorder.current.stop();
        setIsRecording(false);
      } else {
        resolve(null);
      }
    });
  };

  // Cleanup function to release audio resources
  useEffect(() => {
    return () => {
      if (microphoneStream.current) {
        microphoneStream.current.getTracks().forEach(track => track.stop());
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error
  };
};