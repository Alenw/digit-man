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

export interface CanvasRendererHandle {
  startRecording: (audioTrack?: MediaStreamTrack) => void;
  stopRecording: () => void;
}

export const CanvasRenderer = forwardRef<CanvasRendererHandle, CanvasRendererProps>(
  ({ canvasRef, videoRef, live2dRef, isPlaying, isRecording, recordingDuration }, ref) => {
    // 渲染用 offscreen canvas 及其 context（React 不管理）
    const offscreenRef = useRef<OffscreenCanvas | null>(null);
    const offscreenCtxRef = useRef<OffscreenCanvasRenderingContext2D | null>(null);
    // RAF 循环
    const rafRef = useRef<number | null>(null);
    // 主 canvas 的 2D context，缓存避免每帧重复获取
    const mainCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    // 录制用隐藏 canvas 及关联对象
    const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const captureCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const captureStreamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // 懒初始化 capture canvas（startRecording 已保证 offscreen 存在）
    const ensureCaptureCanvas = () => {
      if (captureCanvasRef.current) return;
      const offscreen = offscreenRef.current!;
      captureCanvasRef.current = document.createElement('canvas');
      captureCanvasRef.current.width = offscreen.width;
      captureCanvasRef.current.height = offscreen.height;
      captureCtxRef.current = captureCanvasRef.current.getContext('2d')!;
    };

    // 开始录制
    const startRecording = useCallback((audioTrack?: MediaStreamTrack) => {
      // 防止重复录制
      if (recorderRef.current) return;

      const offscreen = offscreenRef.current;
      if (!offscreen) return;

      ensureCaptureCanvas();
      if (!captureCanvasRef.current) return;

      const stream = captureCanvasRef.current.captureStream(30);
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
      captureStreamRef.current = stream;
      recorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 5000000,
      });
      chunksRef.current = [];

      recorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm; codecs=vp9' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `canvas-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        recorderRef.current = null;
        // 停止 capture stream 释放资源
        if (captureStreamRef.current) {
          captureStreamRef.current.getTracks().forEach(t => t.stop());
          captureStreamRef.current = null;
        }
      };

      recorderRef.current.start();
    }, []);  // 不依赖 ref 对象，函数内部通过 ref.current 访问

    // 停止录制
    const stopRecording = useCallback(() => {
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
    }, []);

    // 绘制循环（依赖仅实际变化的值）
    const draw = useCallback(() => {
      const offscreen = offscreenRef.current;
      const offscreenCtx = offscreenCtxRef.current;
      const video = videoRef.current;
      const live2d = live2dRef.current;
      const canvas = canvasRef.current;
      if (!offscreen || !offscreenCtx || !video || !canvas) return;

      // 在 offscreen canvas 上绘制
      offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height);

      // 视频帧
      offscreenCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

      // Live2D
      if (live2d) {
        offscreenCtx.drawImage(live2d, 0, 0, offscreen.width, offscreen.height);
      }

      // 录制进度圆点
      if (isRecording) {
        const progress = (recordingDuration % 60) / 60;
        offscreenCtx.beginPath();
        offscreenCtx.arc(offscreen.width - 30, 30, 10, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
        offscreenCtx.lineWidth = 3;
        offscreenCtx.strokeStyle = 'red';
        offscreenCtx.stroke();
      }

      // LIVE 标识
      offscreenCtx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      offscreenCtx.fillRect(10, 10, 100, 30);
      offscreenCtx.fillStyle = 'white';
      offscreenCtx.font = 'bold 16px sans-serif';
      offscreenCtx.textAlign = 'center';
      offscreenCtx.fillText('LIVE', 60, 28);

      // 转移内容到 capture canvas
      if (captureCanvasRef.current && captureCtxRef.current) {
        const bitmap = offscreen.transferToImageBitmap();
        captureCtxRef.current.clearRect(0, 0, captureCanvasRef.current.width, captureCanvasRef.current.height);
        captureCtxRef.current.drawImage(bitmap, 0, 0);
        bitmap.close();
      }

      // 同步到主 canvas（使用缓存的 context）
      if (mainCtxRef.current) {
        mainCtxRef.current.clearRect(0, 0, canvas.width, canvas.height);
        mainCtxRef.current.drawImage(offscreen, 0, 0);
      }

      rafRef.current = requestAnimationFrame(draw);
    }, [isRecording, recordingDuration]);  // ref 不在依赖中，通过 current 访问

    // 播放控制 effect
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }, [isPlaying]);

    // 初始化 offscreen canvas 和 RAF
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      offscreenRef.current = new OffscreenCanvas(canvas.width, canvas.height);
      offscreenCtxRef.current = offscreenRef.current.getContext('2d')!;
      mainCtxRef.current = canvas.getContext('2d')!;

      rafRef.current = requestAnimationFrame(draw);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [draw]);

    useImperativeHandle(ref, () => ({
      startRecording,
      stopRecording,
    }), []);

    return null;
  }
);

CanvasRenderer.displayName = 'CanvasRenderer';