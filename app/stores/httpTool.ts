import * as API from './api'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // 读取完成后的处理
    reader.onloadend = function () {
      // 读取成功，result属性中将包含一个data: URL格式的字符串
      // 通过split(',')来提取Base64编码的字符串
      const base64data = reader.result as string;
      const base64String = base64data.split(',')[1];
      resolve(base64String);
    };

    // 错误处理
    reader.onerror = function (error) {
      reject(error);
    };

    // 读取Blob对象，并作为data URL返回
    reader.readAsDataURL(blob);
  });
}

function base64ToArrayBuffer(base64String: string): ArrayBuffer {
  const binaryString = window.atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export class HttpTool{
    private static _instance: HttpTool;
    public static getInstance():HttpTool {
        if(!this._instance){
            this._instance = new HttpTool()
        }
        return this._instance
    }

    public delay(ms:number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async getAgentsList(): Promise<string[]> {
      return API.agents_list_api().then(response => {
        return response.data;
      }).catch((error: unknown): never => {
        console.error(error);
        return [] as never
      })
    }

  public async getDefaultAgent(): Promise<string> {
    return API.agent_default_api().then(response => {
      return response.data;
    }).catch(error => {
      console.error(error);
      return ""
    })
  }
  public async getAgentSettings(agent: string): Promise<{[key: string]: string}[]> {
    return API.agent_settings_api(agent).then(response => {
      return response.data;
    }).catch((error: unknown): never => {
      console.error(error);
      return [] as never
    })
  }

  public async getConversionId(
    agent: string = "default",
    settings: { [key: string]: string } = {},
  ): Promise<string> {
    return API.agent_conversationid_api(agent, settings).then(response => {
      return response.data;
    }).catch(error => {
      console.error(error);
      return ""
    })
  }

  public async streamingChat(
    data: string,
    engine: string = "default",
    conversationId: string = "",
    settings: { [key: string]: string } = {},
    callbackProcessing: (index: number, data: string) => void,
    callbackEnd: (index: number) => void
  ): Promise<void> {
    try {

      const reader = await API.agent_infer_streaming_api(data, engine, conversationId, settings);
      const decoder = new TextDecoder("utf-8");
      let index = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          callbackEnd(index);
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        callbackProcessing(index, chunk);
        index++;
      }
      reader.releaseLock();
    } catch (error) {
      console.error(error);

    }
  }

  public async asr(
    data: Blob,
    settings: { [key: string]: string } = {},
    engine: string = "default",
    format: string = "wav",
    sampleRate: number = 16000,
    sampleWidth: number = 2
  ): Promise<string> {
    return blobToBase64(data).then(base64str => {
      if (base64str == null) {
        return "";
      }
      return API.asr_infer_api(base64str, engine, format, sampleRate, sampleWidth, settings).then(response => {
        return response.data;
      }).catch(error => {
        console.error(error);
        return ""
      })
    }).catch(error => {
      console.error(error);
      return "";
    })
  }

  public async tts(
    data: string,
    settings: { [key: string]: string } = {},
    engine: string = "default"
  ): Promise<ArrayBuffer> {
    // 处理tts输入数据
    const filterData = (data: string): string => {
      // 过滤所有的emoji (simple approach without unicode escapes)
      return data.replace(/[\u2600-\u26FF\u2700-\u27BF\uFE00-\uFE0F\u1F600-\u1F64F\u1F30-\u1F5F\u1F68-\u1F6F\u1F1E-\u1F1F]/g, '');
    }
    data = filterData(data);
    if (data.length == 0) {
      return null;
    }
    return API.tts_infer_api(data, engine, settings).then(response => {
      if (response.data == null) {
        return null;
      }
      return base64ToArrayBuffer(response.data);
    }).catch((error: unknown): never => {
      console.error(error)
      return null as never;
    })
  }








}