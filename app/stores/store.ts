import {create} from "zustand";
import {persist} from 'zustand/middleware'
import {HttpTool} from "@/app/stores/httpTool";
import { ModelDefault } from "@/app/live2d/lappdefine";

// ==================== 交互模式 ==================
export enum InteractionMode {
    CHATBOT = "聊天模式",
    DIGITALHUMAN = "数字人模式",
    IMMERSIVE = "沉浸模式",
}

interface InteractionModeState {
    mode: InteractionMode
    setChatbotMode: () => void
    setDigitalHumanMode: () => void
    setImmersiveMode: () => void
}

export const useInteractionModeStore = create<InteractionModeState>()(
    (set) => ({
        mode: InteractionMode.DIGITALHUMAN,
        setChatbotMode: () => set((state) => ({ mode: InteractionMode.CHATBOT })),
        setDigitalHumanMode: () => set((state) => ({ mode: InteractionMode.DIGITALHUMAN })),
        setImmersiveMode: () => set((state) => ({ mode: InteractionMode.IMMERSIVE })),
    })

)

// ==================== 人物选择 ==================
interface CharacterState {
    character: string
    setCharacter: (character: string) => void
}
export const useCharacterStore = create<CharacterState>()(
    persist(
        (set) => ({
            character: ModelDefault,
            setCharacter: (by: string) => set((state) => ({ character: by })),
        }),
        {
            name: 'character-storage',
        }
    )
)

// ==================== 背景选择 ==================
interface BackgroundState {
    background: string | null
    setBackground: (background: string | null) => void
}
export const useBackgroundStore = create<BackgroundState>()(
    persist(
        (set) => ({
            background: null as string | null,
            setBackground: (by: string | null) => set((state) => ({ background: by })),
        }),
        {
            name: 'background-storage',
        }
    )
)
// ==================== 聊天记录 ==================
export enum ChatRole {
    HUMAN = "HUMAN",
    AI = "AI",
}
export interface ChatMessage {
    role: ChatRole
    content: string
}
interface ChatRecordState {
    chatRecord: ChatMessage[]
    /** 往聊天记录里面追加一条数据 */
    addChatRecord: (message: ChatMessage) => void
    /** 不断替换最后一条消息的文字,让人感觉是不断的出字 */
    updateLastRecord: (message: ChatMessage) => void
    /** 清空聊天记录 */
    clearChatRecord: () => void
}
export const useChatRecordStore = create<ChatRecordState>()(
    (set) => ({
        chatRecord: [],
        addChatRecord: (message: ChatMessage) => set((state) => ({ chatRecord: [...state.chatRecord, message] })),
        updateLastRecord: (message: ChatMessage) => set((state) => ({ chatRecord: [...state.chatRecord.slice(0, -1), message] })),
        clearChatRecord: () => set((state) => ({ chatRecord: [] })),
    })
)

// ==================== agent引擎 ==================
interface AgentEngineState {
    agentEngine: string
    fetchDefaultAgent: () => Promise<void>;
    setAgentEngine: (engine: string) => void
}
export const useAgentModeStore = create<AgentEngineState>()(
    persist(
        (set) => ({
            agentEngine: "RepeaterAgent",
            // 获取默认的agent引擎
            fetchDefaultAgent: async () => {
                HttpTool.getInstance().getDefaultAgent().then((res) => {
                    if (res) {
                        set({ agentEngine: res })
                    }
                })
            },
            setAgentEngine: (engine: string) => set((state) => ({ agentEngine: engine })),
        }),
        {
            name: 'agentEngine-storage',
        }
    )
)

// ==================== agent设置 ==================
interface AgentEngineSettings {
    agentSettings: { [key: string]: { [key: string]: string }[] }
    fetchAgentSettings: () => Promise<void>;
    setAgentSettings: (engine: string, settings: { [key: string]: string }[]) => void
}

export const useAgentEngineSettingsStore = create<AgentEngineSettings>()(
    persist(
        (set) => ({
            agentSettings: {},
            fetchAgentSettings: async () => {
                HttpTool.getInstance().getAgentsList().then((agents) => {
                    agents.forEach((agent) => {
                        HttpTool.getInstance().getAgentSettings(agent).then((res) => {
                            if (res) {
                                set((state) => {
                                    // 未做持久化存储和后端参数变更的值
                                    if (!(agent in state.agentSettings) || state.agentSettings[agent].length != res.length) {
                                        return { agentSettings: { ...state.agentSettings, [agent]: res } }
                                    }
                                    // 持久化存储值只对非空字段更新
                                    const newAgentSetting = state.agentSettings;
                                    for (const item of res) {
                                        if (item.DEFAULT != "") {
                                            // 需要更新的值
                                            for (let i = 0; i < newAgentSetting[agent].length; i++) {
                                                if (newAgentSetting[agent][i].NAME == item.NAME) {
                                                    newAgentSetting[agent][i].DEFAULT = item.DEFAULT;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    return { agentSettings: newAgentSetting }
                                })
                            }
                        })
                    })
                })
            },
            setAgentSettings: (agent: string, newSettings: { [key: string]: string }[]) => set(
                (state) => ({agentSettings: {...state.agentSettings, [agent]: newSettings}})
            )
        }),
        {
            name: 'agentEngineSettings-storage',
        }
    )
)

// ==================== 静音设置 ==================
interface MuteState {
    mute: boolean
    setMute: (mute: boolean) => void
}
export const useMuteStore = create<MuteState>()(
    persist(
        (set) => ({
            mute: false,
            setMute: (mute: boolean) => set((state) => ({ mute: mute })),
        }),
        {
            name: 'mute-storage', // name of the item in the storage (must be unique)
        }
    )
)

// ==================== 后续语音自动结束设置 ==================
interface AudioAutoStopState {
    audioAutoStop: boolean
    setAudioAutoStop: (audioAutoStop: boolean) => void
}
export const useAudioAutoStopStore = create<AudioAutoStopState>()(
    persist(
        (set) => ({
            audioAutoStop: true, // 默认开启
            setAudioAutoStop: (audioAutoStop: boolean) => set((state) => ({ audioAutoStop: audioAutoStop })),
        }),
        {
            name: 'audioAutoStop-storage', // name of the item in the storage (must be unique)
        }
    )
)

// ==================== 聊天状态设置 ==================
interface ChatProcessState {
    /** 聊天解析状态（是否已提交AI等待反馈） */
    isProcessing: boolean,
    /** 录音状态 */
    micRecording:boolean,
    /** 设置解析状态 */
    setProcess: (isProcessing: boolean) => void,
    /** 设置录音状态 */
    setMicRecord:(micRecording:boolean)=>void
}
export const useProcessingStore = create<ChatProcessState>()(
    (set) => ({
        isProcessing: false,
        micRecording: false,
        setProcess: (p: boolean) => set((state) => ({isProcessing: p})),
        setMicRecord: (m: boolean) => set((state) => ({micRecording: m}))
    })
)