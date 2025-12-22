/**
 * Device Settings
 */
export interface OscDeviceSetting {
    name: string;
    ip: string;
    inPort: number;
    outPort: number;
}

export interface MidiDeviceSetting {
    name: string;      // User defined alias (e.g. "My Keyboard")
    inputName: string; // System Input Name (e.g. "Keystation 49")
    outputName: string;// System Output Name
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
    obsDebugPort_Text: string;
    obsAppPath_Text: string;
    serverPort: string;
    serverEnabled: boolean;
    oscDevices: OscDeviceSetting[];
    midiDevices: MidiDeviceSetting[];
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

export interface ISlidesStudioPlugin {
    manifest: {
        dir: string;
    };
    settings: SlidesStudioPluginSettings;
}