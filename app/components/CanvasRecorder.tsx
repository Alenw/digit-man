'use client';

import { useRef } from 'react';

interface CanvasRecorderProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  width?: number;
  height?: number;
  fps?: number;
  mimeType?: string;
  autoDownload?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingComplete?: (blob: Blob) => void;
}

export function CanvasRecorder({
  canvasRef,
  width = 1920,
  height = 1080,
  fps = 30,
  mimeType = 'video/webm; codecs=vp9',
  autoDownload = true,
  onRecordingStart,
  onRecordingStop,
  onRecordingComplete,
}: CanvasRecorderProps) {
  const offscreenRef = useRef<OffscreenCanvas | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const initOffscreen = () => {
    offscreenRef.current = new OffscreenCanvas(width, height);
    offscreenCtxRef.current = offscreenRef.current.getContext('2d')!;
  };

  const startRecording = () => {
    if (!canvasRef.current || !offscreenCtxRef.current) return;

    initOffscreen();
    if (!recorderRef.current) {
      const canvasStream = canvasRef.current.captureStream(fps);
      streamRef.current = new MediaStream([canvasStream.getVideoTracks()[0]]);
    }

    recorderRef.current = new MediaRecorder(streamRef.current, {
      mimeType,
      videoBitsPerSecond: width * height * fps * 0.8,
    });

    recorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      if (autoDownload) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `canvas-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
      if (onRecordingComplete) onRecordingComplete(blob);
    };

    recorderRef.current.start();
    chunksRef.current = [];
    recordingRef.current = true;
    startTimeRef.current = Date.now();
    if (onRecordingStart) onRecordingStart();

    timerRef.current = window.setInterval(() => {
      if (!offscreenCtxRef.current) return;
      const ctx = offscreenCtxRef.current;
      ctx.clearRect(0, 0, width, height);
      const sourceCanvas = canvasRef.current;
      if (sourceCanvas.width !== width || sourceCanvas.height !== height) {
        ctx.drawImage(sourceCanvas, 0, 0, width, height);
      } else {
        ctx.drawImage(sourceCanvas, 0, 0);
      }
    }, 1000 / fps);
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    recordingRef.current = false;
    if (onRecordingStop) onRecordingStop();
  };

  const getDuration = () => {
    if (!startTimeRef.current) return 0;
    return (Date.now() - startTimeRef.current) / 1000;
  };

  useEffect(() => {
    return () => stopRecording();
  }, []);

  return null;
}
