'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { CanvasRenderer } from '@/app/components/CanvasRenderer';
import { useCanvasRecorder } from '@/app/hooks/useCanvasRecorder';
import {Label, ListBox, Select} from "@heroui/react";
const VIDEO_SOURCES = [
  '太空站.mp4',
  '悟空.mp4',
  '火影忍者.mp4',
  '可爱城市.mp4',
  '几何线条.mp4',
  '公式.mp4',
];

export function VideoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSource, setCurrentSource] = useState(VIDEO_SOURCES[3]);
  const [isPlaying, setIsPlaying] = useState(false);
  const { startRecording, stopRecording, isRecording, recordingDuration } = useCanvasRecorder({
    canvasRef,
    videoRef,
    width: 414,
    height: 890,
    fps: 30,
    mimeType: 'video/webm; codecs=vp9',
    autoDownload: true,
  });

  const live2dRef = useRef<any>(null);

  const handleMouseEnter = useCallback(() => {
    live2dRef.current?.setMouse({ x: 0, y: 0 });
  }, [live2dRef]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      live2dRef.current?.setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    },
    [live2dRef]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      live2dRef.current?.setMouse({
        x: (e.touches[0].clientX / window.innerWidth) * 2 - 1,
        y: -(e.touches[0].clientY / window.innerHeight) * 2 + 1,
      });
    },
    [live2dRef]
  );
  
  return (
    <div className="flex h-dvh w-dvw overflow-hidden bg-white">
      {/* 底层视频 — 不隐藏，正常播放 */}
      <video ref={videoRef} className="w-full h-full object-cover z-0" loop autoPlay playsInline preload="metadata" src={'/backgrounds/dynamic/' + currentSource} />

      {/* 上层控制图层 */}
      <div className="absolute left-0 w-full h-full z-10 flex flex-col justify-between p-4">
        <div className="flex justify-between items-start">
          {/* 左上角视频源切换 */}
          <Select value={currentSource} onChange={(v) => setCurrentSource(v)}
              className="rounded px-2 py-1 focus:outline-none focus:bg-white/30 text-white" aria-label="VideoSelect"
            >
              <Select.Trigger >
                <Select.Value />
                <Select.Indicator/>
              </Select.Trigger>
              <Select.Popover className=" rounded px-2 py-1 focus:outline-none focus:bg-white/30 ">
                <ListBox>
                  {VIDEO_SOURCES.map((src,index) => (
                      <ListBox.Item  key={index} id={src} textValue={src} className="text-black text-sm">
                        {src}
                        <ListBox.ItemIndicator/>
                      </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          {/* 右上角控制区 */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 bg-black/50 text-white rounded hover:bg-black/60 transition"
            >
              {isPlaying ? '⏸ 暂停' : '▶ 播放'}
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              {isRecording ? '⏹ 停止录制' : '🔴 录制'}
            </button>
          </div>
        </div>
      </div>

      {/* 字幕图层 */}
      <div className="absolute left-0 w-full h-full pointer-events-none z-20 flex flex-col justify-end p-4">
        <div className="flex flex-col gap-1 items-center">
          <div className="px-4 py-2 bg-black/40 text-white text-xl rounded">
            晓屋公司 AI 云坐席系统
          </div>
          <div className="mt-2 px-4 py-1 bg-black/40 text-white text-sm rounded">
            LIVE
          </div>
        </div>
      </div>

      {/* CanvasRenderer */}
      <CanvasRenderer
        canvasRef={canvasRef}
        videoRef={videoRef}
        live2dRef={live2dRef}
        isPlaying={isPlaying}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
      />

      {/* 录制用 Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed left-0 top-0 w-dvw h-dvh pointer-events-none hidden"
        width={414}
        height={890}
        style={{ zIndex: 4 }}
      />
    </div>
  );
}
