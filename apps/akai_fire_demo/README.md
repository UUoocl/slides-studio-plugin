# AKAI Fire MIDI Demo App

This application demonstrates full control over the **AKAI Fire** MIDI controller, featuring a virtual interactive UI and dual-mode connectivity.

## Features
- **Dual Connectivity**: Switch between **Direct WebMIDI** (low latency browser API) and **SocketCluster Bridge** (remote control via Slides-Studio plugin).
- **Interactive Virtual Device**: Real-time 2-way sync between hardware and UI.
- **Paint Mode**: Manually set RGB colors for any of the 64 pads.
- **Sequencer Demo**: Visual 16-step animation across the pad grid.
- **OLED Control**: Custom text rendering on the 128x64 monochrome display.

## Technical Implementation

### MIDI Mapping
- **Pad Matrix (4x16)**: Standard Note-On messages for input. Output requires SysEx for RGB.
  - Row 1: `0x36` - `0x45`
  - Row 2: `0x46` - `0x55`
  - Row 3: `0x56` - `0x65`
  - Row 4: `0x66` - `0x75`
- **Buttons**: CC messages on MIDI Channel 1 (`0xB0`). CC number matches the input Note number.
- **Knobs**: 7-bit two's complement relative CC values (`0x10` to `0x13` and `0x76`).

### SysEx Protocols

#### RGB Pad Control
Set individual pad colors using the following SysEx format:
`F0 47 7F 43 65 00 04 <Pad Index> <Red> <Green> <Blue> F7`
- Pad Index: `0x00` to `0x3F`
- RGB values: `0x00` to `0x7F` (7-bit MIDI range)

#### OLED Display
The OLED is updated using a 1171-byte bit-packed buffer.
`F0 47 7F 43 0E 09 17 00 07 00 7F <1171 bytes data> F7`
- **Bit Packing**: Pixels are linearized into a 1024x8 strip, divided into 7-column blocks, and packed into 8 MIDI bytes (7 bits each).
- **Mapping**: Uses a hardware-specific mutation table to map `(x, y)` to the correct bit position in the buffer.

## Project Structure
- `index.html`: UI and styles.
- `app.js`: Main application logic and event orchestration.
- `connectionManager.js`: Handles WebMIDI and SocketCluster lifecycles.
- `midiLogic.js`: MIDI message encoding/decoding.
- `appLogic.js`: State management for Paint and Sequencer modes.
- `oledLogic.js`: Complex bitmap encoding and font rendering.
