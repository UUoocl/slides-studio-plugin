import { Command } from 'obsidian';
import slidesStudioPlugin from '../main';

export const ConnectOscCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'connect-all-osc-devices',
    name: 'Connect to all osc devices',
    callback: () => {
        plugin.settings.oscDevices.forEach(device => {
            if (device.name && device.ip && device.inPort && device.outPort) {
                plugin.oscManager.connectDevice(device);
            }
        });
    }
});

export const ConnectMidiCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'connect-all-midi-devices',
    name: 'Connect to all midi devices',
    callback: () => {
        plugin.settings.midiDevices.forEach(device => {
            plugin.midiManager.connectDevice(device);
        });
    }
});

export const ConnectAudioCommand = (plugin: slidesStudioPlugin): Command => ({
    id: 'connect-all-audio-devices',
    name: 'Connect to all audio devices',
    callback: () => {
        plugin.settings.audioDevices.forEach(device => {
            void plugin.audioManager.connectDevice(device);
        });
    }
});