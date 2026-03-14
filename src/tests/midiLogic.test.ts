import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MidiManager } from '../utils/midiLogic';
import { WebMidi } from 'webmidi';

vi.mock('webmidi', () => {
    const mockOutput = {
        name: 'Test Output',
        playNote: vi.fn(),
        stopNote: vi.fn(),
        sendControlChange: vi.fn(),
        send: vi.fn()
    };
    return {
        WebMidi: {
            enable: vi.fn().mockResolvedValue(undefined),
            inputs: [],
            outputs: [mockOutput],
            getOutputByName: vi.fn().mockReturnValue(mockOutput),
            getInputByName: vi.fn()
        }
    };
});

vi.mock('obsidian', () => ({
    Notice: vi.fn()
}));

describe('MidiManager', () => {
    let midiManager: MidiManager;
    const mockOnMessage = vi.fn();

    beforeEach(async () => {
        vi.clearAllMocks();
        midiManager = new MidiManager(mockOnMessage);
        await midiManager.enable();
    });

    it('should send Note On messages', () => {
        const deviceList = [{ name: 'LP', inputName: 'IN', outputName: 'Test Output' }];
        midiManager.sendMidiMessage('LP', deviceList, { type: 'noteon', note: 60, velocity: 127 });
        
        const output = WebMidi.getOutputByName('Test Output');
        expect(output.playNote).toHaveBeenCalledWith(60, expect.objectContaining({ attack: 127 }));
    });

    it('should send CC messages', () => {
        const deviceList = [{ name: 'LP', inputName: 'IN', outputName: 'Test Output' }];
        midiManager.sendMidiMessage('LP', deviceList, { type: 'cc', controller: 19, value: 127 });
        
        const output = WebMidi.getOutputByName('Test Output');
        expect(output.sendControlChange).toHaveBeenCalledWith(19, 127, expect.anything());
    });

    it('should send SysEx messages', () => {
        const deviceList = [{ name: 'LP', inputName: 'IN', outputName: 'Test Output' }];
        const sysexData = [0xF0, 0x00, 0x20, 0x29, 0x02, 0x0D, 0x0E, 0x01, 0xF7];
        midiManager.sendMidiMessage('LP', deviceList, { type: 'sysex', data: sysexData });
        
        const output = WebMidi.getOutputByName('Test Output');
        expect(output.send).toHaveBeenCalledWith(sysexData);
    });

    it('should send raw MIDI messages', () => {
        const deviceList = [{ name: 'LP', inputName: 'IN', outputName: 'Test Output' }];
        const rawData = [0x90, 0x3C, 0x7F];
        midiManager.sendMidiMessage('LP', deviceList, { type: 'raw', data: rawData });
        
        const output = WebMidi.getOutputByName('Test Output');
        expect(output.send).toHaveBeenCalledWith(rawData);
    });
});
