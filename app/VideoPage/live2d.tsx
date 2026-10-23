'use client'

import React, { useEffect, useRef } from 'react';
import { LAppDelegate } from '@/app/live2d/lappdelegate';
import * as LAppDefine from '@/app/live2d/lappdefine';
import { CharacterManager } from "@/app/stores/character";
import { useCharacterStore, useBackgroundStore } from "@/app/stores/store";

export default function Live2d() {
    const { character } = useCharacterStore();
    const { background } = useBackgroundStore();
    let canvasRef = useRef<HTMLCanvasElement>(null)

    if (canvasRef.current) {
        if (background != null) {
            canvasRef.current.style.backgroundImage = `url('/backgrounds/static/${background}.jpg')`;
        } else {
            canvasRef.current.style.backgroundImage = 'none';
        }
    }

    const handleLoad = () => {
        if (!LAppDelegate.getInstance().initialize()) {
            console.log("Live2d loaded 失败");
            return;
        }
        LAppDelegate.getInstance().run();
        if (character) { CharacterManager.getInstance().setCharacter(character); }
    }

    const handleResize = () => {
        if (LAppDefine.CanvasSize === 'auto') {
            LAppDelegate.getInstance().onResize();
        }
    }

    const handleBeforeUnload = () => {
        LAppDelegate.releaseInstance();
    }

    useEffect(() => {
        handleLoad()
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            handleBeforeUnload();
        }
    }, []);

    return (
        <div id={'live2ddiv'} className="absolute top-0 left-0 w-full h-full bg-center bg-cover z-0 bg-white flex-row flex">
            <canvas
                id="canvas0"
                ref={canvasRef}
            />
        </div>
    )
}