'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';

interface CanvasRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  live2dRef: React.RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  isRecording: boolean;
  recordingDuration: number;
}

export const CanvasRenderer = forwardRef<HTMLCanvasElement, CanvasRendererProps>(
  ({ canvasRef, videoRef, live2dRef, isPlaying, isRecording, recordingDuration }, ref) => {
    const offscreenRef = useRef<OffscreenCanvas | null>(null);
    const ctxRef = useRef<OffscreenCanvasRenderingContext2D | null>(null);
    const rafRef = useRef<number | null>(null);

    const draw = useCallback(() => {
      const offscreen = offscreenRef.current;
      const ctx = ctxRef.current;
      const video = videoRef.current;
      const live2d = live2dRef.current;
      const canvas = canvasRef.current;
      if (!offscreen || !ctx || !video || !canvas) return;

      ctx.clearRect(0, 0, offscreen.width, offscreen.height);

      // 视频帧
      ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

      // Live2D
      if (live2d) {
        ctx.drawImage(live2d, 0, 0, offscreen.width, offscreen.height);
      }

      // 进度圆点
      if (isRecording) {
        const progress = (recordingDuration % 60) / 60;
        ctx.beginPath();
        ctx.arc(offscreen.width - 30, 30, 10, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'red';
        ctx.stroke();
      }

      // LIVE 标识
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.fillRect(10, 10, 100, 30);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LIVE', 60, 28);

      // 同步到主 canvas
      const mainCtx = canvas.getContext('2d');
      if (mainCtx) {
        mainCtx.clearRect(0, 0, canvas.width, canvas.height);
        mainCtx.drawImage(offscreen, 0, 0);
      }

      rafRef.current = requestAnimationFrame(draw);
    }, [isRecording, recordingDuration, offscreenRef, ctxRef, videoRef, live2dRef, canvasRef]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }, [isPlaying, videoRef]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      offscreenRef.current = new OffscreenCanvas(canvas.width, canvas.height);
      ctxRef.current = offscreenRef.current.getContext('2d')!;

      rafRef.current = requestAnimationFrame(draw);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [draw, canvasRef]);

    useImperativeHandle(ref, () => canvasRef.current!, []);

    return null;
  }
);

CanvasRenderer.displayName = 'CanvasRenderer';
