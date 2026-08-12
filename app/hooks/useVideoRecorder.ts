'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useCanvasRecorder } from './useCanvasRecorder';

interface HTMLVideoElement extends HTMLMediaElement {
  captureStream(fps?: number): MediaStream;
}

interface HTMLCanvasElement {
  captureStream(fps?: number): MediaStream;
}

interface HTMLMediaElement {
  captureStream(fps?: number): MediaStream;
}

interface WindowWithCaptureStream extends Window {
  HTMLVideoElement: typeof HTMLVideoElement;
  HTMLCanvasElement: typeof HTMLCanvasElement;
  HTMLMediaElement: typeof HTMLMediaElement;
}

declare global {
  interface Window extends WindowWithCaptureStream {}
}

export function useVideoRecorder({
  canvasRef,
  videoRef,
  live2dRef,
  audioRef,
  captureAudio = true,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  videoRef?: React.RefObject<HTMLVideoElement>;
  live2dRef?: React.RefObject<HTMLCanvasElement>;
  audioRef?: React.RefObject<HTMLMediaElement>;
  captureAudio?: boolean;
}) {
  const { startRecording, stopRecording, isRecording, recordingDuration, getCanvas } =
    useCanvasRecorder({ canvasRef });

  const videoRefLocal = useRef<HTMLVideoElement | null>(null);
  const live2dRefLocal = useRef<HTMLCanvasElement | null>(null);
  const audioRefLocal = useRef<HTMLMediaElement | null>(null);

  const getVideoRef = useCallback(() => videoRefLocal.current, []);
  const getLive2dRef = useCallback(() => live2dRefLocal.current, []);

  useEffect(() => {
    videoRefLocal.current = videoRef?.current || null;
    live2dRefLocal.current = live2dRef?.current || null;
    audioRefLocal.current = audioRef?.current || null;
  }, [videoRef, live2dRef, audioRef]);

  const startRecordingWithAudio = useCallback(async () => {
    const video = videoRefLocal.current;
    const live2d = live2dRefLocal.current;

    if (!video || !live2d) return;

    const combinedStream = new MediaStream();
    if (videoRefLocal.current) {
      (videoRefLocal.current as any).captureStream()?.getTracks().forEach((track: MediaStreamTrack) => combinedStream.addTrack(track));
    }
    if (live2dRefLocal.current) {
      (live2dRefLocal.current as any).captureStream()?.getTracks().forEach((track: MediaStreamTrack) => combinedStream.addTrack(track));
    }
    if (captureAudio && audioRefLocal.current) {
      (audioRefLocal.current as any).captureStream()?.getTracks().forEach((track: MediaStreamTrack) => combinedStream.addTrack(track));
    }

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm; codecs=vp9' });
      const url = URL.createObjectURL(blob);
      if ((window as any).autoDownload) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
    };

    recorder.start();
    startRecording();
  }, [startRecording, captureAudio]);

  const stopRecordingWithAudio = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  return {
    startRecording: startRecordingWithAudio,
    stopRecording: stopRecordingWithAudio,
    isRecording,
    recordingDuration,
    getVideoRef,
    getLive2dRef,
    getCanvas,
  };
}
