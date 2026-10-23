import { LAppDelegate } from '@/app/live2d/lappdelegate';

export class CharacterManager {
    // 单例
    public static getInstance(): CharacterManager {
        if (! this._instance) {
            this._instance = new CharacterManager();
        }
        return this._instance;
    }
    /**
   * 获取人物列表信息
   */
    public getCharacterList(): {[key: string]: string} {
      return LAppDelegate.getInstance().getCharacterList();
    }
    /**
   * 获取当前人物信息
   */
    public getCharacter(): string {
      return LAppDelegate.getInstance().getCharacter();
    }
    /**
   * 切换人物
   * 在示例应用程序中切换模型集
   */
    public setCharacter(character: string): void {
      LAppDelegate.getInstance().changeCharacter(character);
    }
    /**
   * 获取背景列表
   */
    public getBackImages(): {[key: string]: string} {
      return LAppDelegate.getInstance().getBackImages();
    }

    // public getBackground(): string {
    //   return LAppDelegate.getInstance().getBackground();
    // }

    // public setBackground(background: string | null): void {
    //   LAppDelegate.getInstance().changeBackground(background);
    // }

    /**
   * 推送音频
   */
    public pushAudioQueue(audioData: ArrayBuffer): void {
      if (audioData instanceof ArrayBuffer) {
          this._ttsQueue.push(audioData);
      }
    }

    public popAudioQueue(): ArrayBuffer | null {
      if (this._ttsQueue.length > 0) {
        const audioData = this._ttsQueue.shift();
        return audioData;
      } else {
        return null;
      }
    }

    public clearAudioQueue(): void {
      this._ttsQueue = [];
    }

    private static _instance: CharacterManager;
    private _ttsQueue: ArrayBuffer[] = [];
  }