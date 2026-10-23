'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { CanvasRendererHandle } from '@/app/components/CanvasRenderer';

/**
 * useVideoRecorder — 音频混合器 + 录制控制
 *
 * 职责：
 * 1. 从背景视频元素捕获音轨（唯一创建 MediaElementSourceNode，永不重建）
 * 2. 接收 TTS ArrayBuffer 并解码为音频轨，确保解码完成后再开始录制
 * 3. 将混合后的音频轨传给 CanvasRenderer 完成录制
 * 4. 录制同时连接扬声器，播放视频时能听到声音
 */
export function useVideoRecorder({
  canvasRendererRef,
  videoRef,
}: {
  canvasRendererRef: React.RefObject<CanvasRendererHandle | null>;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  // 录制状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<number | null>(null);

  // 唯一的 AudioContext + MediaElementSourceNode（永不重建，src 变化时自动跟随）
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // 获取或创建视频音频流（首次创建后永久复用，不重建）
  const getVideoAudioStream = useCallback((video: HTMLVideoElement) => {
    if (!sourceNodeRef.current) {
      // 唯一的一次创建，绑定到当前 video 元素
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(video);
      const dest = ctx.createMediaStreamDestination();
      // 同时连接到扬声器（播放声音）和录制目的地（录制音频）
      source.connect(ctx.destination);
      source.connect(dest);
      audioCtxRef.current = ctx;
      sourceNodeRef.current = source;
      (video as any).__videoAudioDest = dest.stream;
    }
    return (video as any).__videoAudioDest;
  }, []);

  // 将 TTS ArrayBuffer 解码为音频流（失败返回 null）
  const getTtsAudioStream = useCallback(async (arrayBuffer: ArrayBuffer) => {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;
    const ctx = new AudioContext();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const dest = ctx.createMediaStreamDestination();
      source.connect(dest);
      source.start();
      return dest.stream;
    } catch (e) {
      console.warn('TTS audio decode failed:', e);
      return null;
    }
  }, []);

  // 混合多条音轨（背景音 + TTS 音），没有音轨返回 undefined
  const mixAudioTracks = useCallback(
    (...audioStreams: (MediaStream | null)[]): MediaStreamTrack | undefined => {
      const combined = new MediaStream();
      for (const stream of audioStreams) {
        if (!stream) continue;
        stream.getAudioTracks().forEach((track) => combined.addTrack(track));
      }
      const tracks = combined.getAudioTracks();
      return tracks.length > 0 ? tracks[0] : undefined;
    },
    []
  );

  // 开始录制（TTS 解码完成后才真正开始）
  const startRecording = useCallback(
    async (ttsArrayBuffer?: ArrayBuffer) => {
      const video = videoRef?.current;
      if (!video) return;

      // 1. 获取背景视频音轨（唯一创建的 AudioContext 会自动跟随视频 src）
      const videoAudioStream = getVideoAudioStream(video);

      // 2. 等待 TTS 解码完成
      const ttsAudioStream = await getTtsAudioStream(ttsArrayBuffer ?? new ArrayBuffer(0));

      // 3. 混合音轨
      const audioTrack = mixAudioTracks(videoAudioStream, ttsAudioStream);

      // 4. 传给 CanvasRenderer 开始录制
      if (canvasRendererRef.current) {
        canvasRendererRef.current.startRecording(audioTrack);
      }
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration((t) => t + 1);
      }, 1000);
    },
    [canvasRendererRef, videoRef, getVideoAudioStream, getTtsAudioStream, mixAudioTracks]
  );

  // 停止录制
  const stopRecording = useCallback(() => {
    if (canvasRendererRef.current) {
      canvasRendererRef.current.stopRecording();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [canvasRendererRef]);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current) {
        // AudioContext 不 close，避免 MediaElementSourceNode 绑定失效
      }
    };
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    recordingDuration,
  };
}