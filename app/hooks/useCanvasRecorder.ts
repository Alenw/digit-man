'use client';

import { useRef, useCallback, useState } from 'react';

export function useCanvasRecorder({
  canvasRef,
  videoRef,
  width = 414,
  height = 890,
  fps = 30,
  mimeType = 'video/webm; codecs=vp9',
  autoDownload = true,
  onRecordingStart,
  onRecordingStop,
  onRecordingComplete,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  width?: number;
  height?: number;
  fps?: number;
  mimeType?: string;
  autoDownload?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingComplete?: (blob: Blob) => void;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    let stream: MediaStream;
    try {
      stream = canvas.captureStream(fps);
    } catch {
      console.error('captureStream not supported');
      return;
    }

    // 合并音频（来自 video 元素）
    if (video) {
      try {
        const audioCtx = new AudioContext();
        const videoSource = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        videoSource.connect(audioCtx.destination);
        videoSource.connect(dest);
        const audioTracks = dest.stream.getAudioTracks();
        audioTracks.forEach((t) => stream.addTrack(t));
      } catch {
        console.warn('Failed to capture audio from video');
      }
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (onRecordingComplete) onRecordingComplete(blob);
      if (autoDownload) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
    };

    recorder.start();
    recorderRef.current = recorder;
    startTimeRef.current = Date.now();
    setIsRecording(true);
    setRecordingDuration(0);

    timerRef.current = window.setInterval(() => {
      setRecordingDuration((t) => t + 1);
    }, 1000);

    if (onRecordingStart) onRecordingStart();
  }, [canvasRef, videoRef, fps, mimeType, autoDownload, onRecordingStart, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current = null;
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (onRecordingStop) onRecordingStop();
  }, [onRecordingStop]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    recordingDuration,
  };
}
