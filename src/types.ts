/**
 * @fileoverview Type definitions for Slides Studio.
 */

import {TFile} from 'obsidian';

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
  name: string;
  inputDevice: string;
  outputDevice: string;
  autoStart?: boolean;
}

export interface AudioDeviceSetting {
  name: string;
  inputDevice: string;
  autoStart?: boolean;
}

/**
 * Plugin Settings
 */
export interface SlidesStudioPluginSettings {
  fastifyPort: number;
  pythonPath: string;
  pythonSocketPort: number;
  obsIP: string;
  obsPort: number;
  obsPassword?: string;
  obsCollection: string;
  obsDebugPort: number;
  obsDebugMode: boolean;
  oscDevices: OscDeviceSetting[];
  midiDevices: MidiDeviceSetting[];
  audioDevices: AudioDeviceSetting[];
  mouseMonitor: {
    enabled: boolean;
    trackPosition: boolean;
    trackClick: boolean;
    trackScroll: boolean;
  };
  keyboardMonitor: {
    enabled: boolean;
    showCombinations: boolean;
  };
  uvcUtilBridge: {
    enabled: boolean;
    libraryPath: string;
  };
  settingsFolder: string;
  settingsFile: string;
}

export const DEFAULT_SETTINGS: SlidesStudioPluginSettings = {
  fastifyPort: 8080,
  pythonPath: 'python3',
  pythonSocketPort: 50007,
  obsIP: '127.0.0.1',
  obsPort: 4455,
  obsCollection: '',
  obsDebugPort: 4444,
  obsDebugMode: false,
  oscDevices: [],
  midiDevices: [],
  audioDevices: [],
  mouseMonitor: {
    enabled: false,
    trackPosition: true,
    trackClick: true,
    trackScroll: true,
  },
  keyboardMonitor: {
    enabled: false,
    showCombinations: true,
  },
  uvcUtilBridge: {
    enabled: false,
    libraryPath: '/usr/local/lib/libuvc.dylib',
  },
  settingsFolder: 'SlidesStudio',
  settingsFile: 'settings.json',
};

/**
 * Server API Interfaces
 */
export interface SaveFileBody {
  folder: string;
  filename: string;
  content: string;
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
  args: Array<{
    type: string;
    value: string | number | boolean;
  }>;
}

export interface MidiSendBody {
  deviceName: string;
  message: number[];
}

export interface MidiPayload {
  command: number;
  data1: number;
  data2: number;
}

export interface CustomMessageBody {
  name: string;
  data: Record<string, unknown>;
}

export interface ReadFileRequest {
  path: string;
}

export interface WriteFileRequest {
  path: string;
  content: string;
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
  isObsConnected: boolean;
}

/**
 * Obsidian Tag View Types
 */
export interface SlideTag {
  id: string;
  type: 'scene' | 'camera' | 'custom';
  value: string;
}

export interface SlideData {
  tags: SlideTag[];
}

/**
 * Helper to get the base path from Obsidian adapter
 */
export interface ObsidianFileSystemAdapter {
  getBasePath(): string;
}
