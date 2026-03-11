/**
 * Device Settings
 */
export interface OscDeviceSetting {
    name: string;
    ip: string;
    inPort: number;
    outPort: number;
    autoStart?: boolean;
}

export interface MidiDeviceSetting {
    name: string;      // User defined alias (e.g. "My Keyboard")
    inputName: string; // System Input Name (e.g. "Keystation 49")
    outputName: string;// System Output Name
    autoStart?: boolean;
}

export interface AudioDeviceSetting {
    name: string;      // User defined alias (e.g. "My Mic")
    deviceId: string;  // System Device ID
    sampleRate: number;// Sample Rate (e.g. 44100)
    fftSize: number;   // FFT Size (e.g. 2048)
    smoothingTimeConstant: number; // Smoothing (0-1)
    fftEnabled: boolean;
    sttEnabled: boolean;
    autoStart?: boolean;
}

export interface GamepadDeviceSetting {
    name: string;      // User defined alias (e.g. "Player 1")
    index: number;     // The gamepad index (0, 1, 2, 3)
    enabled: boolean;  // Whether this gamepad is broadcasting
}

export interface MediaPipeDeviceSetting {
    name: string;      // User defined alias / channel name
    type: 'face' | 'hand' | 'pose';
    sourceName: string; // OBS Source or Scene name
    fps: number;
    width: number;
    enabled: boolean;
    autoStart?: boolean;
}

export interface UvcDeviceSetting {
    name: string;      // User defined alias / channel name
    index: number;     // Hardware index
    enabled: boolean;
    pollingEnabled: boolean;
    pollsPerSecond: number;
    mapEnabled?: boolean;
    mapMin?: number;
    mapMax?: number;
}

/**
 * Main Plugin Settings
 */
export interface SlidesStudioPluginSettings {
    websocketIP_Text: string;
    websocketPort_Text: string;
    websocketPW_Text: string;
    slidesPort_Text: string;
    slide_tags: string[];
    scene_tags: string[];
    camera_tags: string[];
    camera_shape_tags: string[];
    newTag: string;
    newTagKey: string;   // Added to support dynamic UI keys
    newTagValue: string; // Added to support dynamic UI values
    user_tags: string[];
    obsAppName_Text: string;
    obsCollection_Text: string;
    obsProfile_Text: string;
    obsCollections_List: string[];
    obsProfiles_List: string[];
    obsDebugPort_Text: string;
    obsAppPath_Text: string;
    obsRequestLimit: number;
    serverPort: string;
    serverEnabled: boolean;
    pythonPath: string;
    mouseMonitorEnabled: boolean;
    mouseMonitorPosition: boolean;
    mouseMonitorClicks: boolean;
    mouseMonitorScroll: boolean;
    keyboardMonitorEnabled: boolean;
    keyboardMonitorShowCombinations: boolean;
    uvcUtilEnabled: boolean;
    uvcUtilLibPath: string;
    settingsFolder: string;
    settingsFile: string;
    oscDevices: OscDeviceSetting[];
    midiDevices: MidiDeviceSetting[];
    audioDevices: AudioDeviceSetting[];
    gamepadDevices: GamepadDeviceSetting[];
    mediapipeDevices: MediaPipeDeviceSetting[];
    uvcDevices: UvcDeviceSetting[];
    all_sources: string[];
}

/**
 * Message Payloads for OSC/MIDI
 */
export interface MidiPayload {
    type: string;
    data?: number[];
    channel?: number;
    command?: number;
    note?: number | null;
    velocity?: number;
    value?: number;
    controller?: number | null;
}

/**
 * OBS WebSocket Connection Details
 */
export interface WssDetails {
    IP: string;
    PORT: string;
    PW: string;
}

/**
 * OBS Internal Data Structures
 */
export interface OBSScene {
    sceneName: string;
}

export interface OBSSceneList {
    scenes: OBSScene[];
}

export interface OBSSceneItem {
    sourceName: string;
}

export interface OBSSceneItemList {
    sceneItems: OBSSceneItem[];
}

export interface OBSSource {
    inputUuid: string;
    inputName: string;
}

export interface OBSInputListResponse {
    inputs: OBSSource[];
}

export interface OBSInputSettingsResponse {
    inputSettings: {
        url: string;
        css: string;
    };
}

/**
 * OBS Custom Events
 */
export interface OBSCustomEvent {
    event_name: string;
    osc_name?: string;
    midi_name?: string;
    address?: string;
    arg1?: string | number;
    arg2?: string | number;
    arg3?: string | number;
    arg4?: string | number;
    arg5?: string | number;
    arg6?: string | number;
    arg7?: string | number;
}

/**
 * Server API Interfaces
 */
export interface SaveFileBody {
    folder: string;
    filename: string;
    data: unknown;
}

export interface FileListQuery {
    folder: string;
}

export interface GetFileQuery {
    folder: string;
    filename: string;
}

export interface OscSendBody {
    deviceName: string;
    address: string;
    args: (string | number | boolean)[];
}

export interface MidiSendBody {
    deviceName: string;
    message: MidiPayload;
}

export interface CustomMessageBody {
    name: string;
    data: Record<string, unknown>;
}

export interface MouseEventData {
    topic: string;
    data: unknown;
}

export interface ISlidesStudioPlugin {
    manifest: {
        dir: string;
    };
    settings: SlidesStudioPluginSettings;
}