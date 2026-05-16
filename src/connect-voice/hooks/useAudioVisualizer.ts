import { useState, useRef, useCallback, useEffect } from 'react';

// Shared context outside the hook to bypass the hardware limit of6
let sharedAudioContext: AudioContext | null = null;
const getSharedAudioContext = (): AudioContext | null => {
  if (!sharedAudioContext) {
    const win = window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextClass = win.AudioContext || win.webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass();
    }
  }
  return sharedAudioContext;
};

export const useAudioVisualizer = (): {
  speakingPeers: Set<string>;
  trackSpeaking: (stream: MediaStream, peerId: string) => void;
  stopTracking: (peerId: string) => void;
  cleanupAllAudioContexts: () => void;
} => {
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const animationFramesRef = useRef<Record<string, number>>({});
  const sourceNodesRef = useRef<Record<string, MediaStreamAudioSourceNode>>({});

  const trackSpeaking = useCallback((stream: MediaStream, peerId: string) => {
    try {
      const audioContext = getSharedAudioContext();
      if (!audioContext) return;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceNodesRef.current[peerId] = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioLevel = (): void => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;

        setSpeakingPeers((prev) => {
          const next = new Set(prev);
          if (average > 15) next.add(peerId);
          else next.delete(peerId);
          return next;
        });

        // Store the frame ID instead of letting it run detached
        animationFramesRef.current[peerId] =
          requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (err) {
      console.warn('AudioContext error:', err);
    }
  }, []);

  const stopTracking = useCallback((peerId: string) => {
    // Properly cancel the animation frame
    if (animationFramesRef.current[peerId]) {
      cancelAnimationFrame(animationFramesRef.current[peerId]);
      delete animationFramesRef.current[peerId];
    }

    // Disconnect the source node so it can be garbage collected
    if (sourceNodesRef.current[peerId]) {
      sourceNodesRef.current[peerId].disconnect();
      delete sourceNodesRef.current[peerId];
    }

    setSpeakingPeers((prev) => {
      const next = new Set(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  const cleanupAllAudioContexts = useCallback(() => {
    Object.keys(animationFramesRef.current).forEach(stopTracking);
  }, [stopTracking]);

  useEffect(() => {
    return () => cleanupAllAudioContexts();
  }, [cleanupAllAudioContexts]);

  return {
    speakingPeers,
    trackSpeaking,
    stopTracking,
    cleanupAllAudioContexts,
  };
};
