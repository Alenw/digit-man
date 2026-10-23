'use client';
import dynamic from "next/dynamic";
import { useRef, useState, useCallback, useEffect } from 'react';
import { CanvasRenderer, CanvasRendererHandle } from '@/app/components/CanvasRenderer';
import { useVideoRecorder } from '@/app/hooks/useVideoRecorder';
import { ListBox, Select } from "@heroui/react";
// import Live2d from "@/app/VideoPage/live2d";
const Live2d = dynamic(() => import("@/app/VideoPage/live2d"), { ssr: false });
const VIDEO_SOURCES = [
  '太空站.mp4',
  '悟空.mp4',
  '火影忍者.mp4',
  '可爱城市.mp4',
  '几何线条.mp4',
  '公式.mp4',
  '海风.mp4'
];

// 占位 TTS 函数 — 替换成你的真实 TTS 接口（返回 ArrayBuffer）
async function getTtsAudio(text: string): Promise<ArrayBuffer> {
  // TODO: 调用你的 TTS 接口，例如：
  // const resp = await fetch('/api/tts', { method: 'POST', body: JSON.stringify({ text }) });
  // return await resp.arrayBuffer();
  // 这里返回空 Buffer 先占位（录制时不会有 TTS 声音，但背景视频音轨可以录制）
  return new ArrayBuffer(0);
}

export function VideoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const live2dRef = useRef<any>(null);
  const canvasRendererRef = useRef<CanvasRendererHandle>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSource, setCurrentSource] = useState(VIDEO_SOURCES[3]);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRecorder = useVideoRecorder({
    canvasRendererRef,
    videoRef: videoRef as React.RefObject<HTMLVideoElement | null>,
  });

  const [ttsText, setTtsText] = useState('你好，欢迎来到我们的服务。');
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);

  const handleStartRecording = useCallback(async () => {
    // 1. 调用 TTS 获取 ArrayBuffer（请替换成你自己的 TTS 接口）
    const ttsArrayBuffer = await getTtsAudio(ttsText);
    // 2. 开始录制（传入 TTS 音频数据 + 背景视频音轨）
    videoRecorder.startRecording(ttsArrayBuffer);
  }, [ttsText]);

  const handleStopRecording = useCallback(() => {
    videoRecorder.stopRecording();
  }, []);

  return (
    <div className="flex h-dvh w-dvw overflow-hidden bg-white">
      {/* 底层视频 — 不隐藏，正常播放 */}
      <video ref={videoRef} className="w-full h-full object-cover z-0" loop autoPlay playsInline preload="metadata" src={'/backgrounds/dynamic/' + currentSource} />

      <Live2d/>

      {/* 上层控制图层 */}
      <div className="absolute left-0 w-full h-full z-10 flex flex-col justify-between p-4">
        <div className="flex justify-between items-start">
          {/* 左上角视频源切换 */}
          <Select value={currentSource} onChange={(key) => {
            if (key) setCurrentSource(String(key));
            setIsPlaying(true);
          }}
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
              onClick={videoRecorder.isRecording ? handleStopRecording : handleStartRecording}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              {videoRecorder.isRecording ? '⏹ 停止录制' : '🔴 录制'}
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

      {/* CanvasRenderer 负责渲染和录制 */}
      <CanvasRenderer
        ref={canvasRendererRef}
        canvasRef={canvasRef}
        videoRef={videoRef}
        live2dRef={live2dRef}
        isPlaying={isPlaying}
        isRecording={videoRecorder.isRecording}
        recordingDuration={videoRecorder.recordingDuration}
      />

      {/* 录制用 Canvas（隐藏，尺寸与 offscreen 一致） */}
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