Here is the comprehensive technical documentation for the AKAI Professional APC mini mk2, organized for easy reference during app development.

# AKAI Professional APC mini mk2 - Developer Reference

### 1. Overview and Glossary
The APC mini mk2 is a USB bus-powered compact MIDI controller featuring an 8x8 RGB clip launch matrix, 9 faders, and 17 single-color UI buttons. 
*   **Outbound**: Messages sent from the PC/Mac Host to the APC device (controlling LEDs).
*   **Inbound**: Messages sent from the APC device to the PC/Mac Host (physical hardware interactions).

### 2. Communication Ports & Modes
The device utilizes different MIDI ports and channels depending on the active mode:
*   **Session View:** Uses Port 0, MIDI Channels 00-0F (0x00 to 0x0F).
*   **Drum Mode:** Uses Port 0, MIDI Channel 09 (0x09).
*   **Note Mode:** Uses Port 1, MIDI Channel 00 (0x00).

---

### 3. Hardware Inputs (Inbound)

#### Faders
The 8 Channel Faders and 1 Master Fader send absolute position values via MIDI Continuous Controller (CC) messages on USB Port 0.
*   **Fader 1 to 8**: CC# `0x30` to `0x37` (Channel 0).
*   **Fader 9 (Master)**: CC# `0x38` (Channel 0).

#### Pads and Buttons
Hardware buttons transmit MIDI Note-On and Note-Off messages when pressed and released.
*   **8x8 Pad Matrix (Clip Launch 0-63):** Note # `0x00` to `0x3F`.
*   **Track Buttons 1-8:** Note # `0x64` to `0x6B`.
*   **Scene Launch Buttons 1-8:** Note # `0x70` to `0x77`.
*   **Shift Button:** Note # `0x7A` (Note: The shift button does not have an LED).

---

### 4. LED Control (Outbound)

LEDs are controlled by sending standard 3-byte MIDI Note-On messages to Port 0. You can control LEDs individually or sequentially in bulk.

#### A. RGB Matrix Pads (Note # `0x00` to `0x3F`)
Message Construction: `[Behavior/Channel] [Pad Value] [Color Velocity]`.

**Byte 1: Behavior (MIDI Channel)**
The MIDI Channel (0x90–0x9F) dictates the pad's lighting behavior (solid, pulse, or blink).
*   **Solid:** `0x90` (10%), `0x91` (25%), `0x92` (50%), `0x93` (65%), `0x94` (75%), `0x95` (90%), `0x96` (100% brightness).
*   **Pulsing:** `0x97` (1/16), `0x98` (1/8), `0x99` (1/4), `0x9A` (1/2).
*   **Blinking:** `0x9B` (1/24), `0x9C` (1/16), `0x9D` (1/8), `0x9E` (1/4), `0x9F` (1/2).

**Byte 3: Color (Velocity)**
The matrix pads use a fixed 128-color palette mapped to the velocity value.
*   *Examples:* `0` = Off/Black, `3` = White, `5` = Red, `9` = Orange, `21` = Green, `45` = Blue, `53` = Magenta. *(Reference the device manual's Velocity to RGB Color Chart for all 128 values)*.

*Example Message:* To pulse Pad 1 (0x00) Red (0x05) at 1/16 speed (0x97): Send `97 00 05`.

#### B. Single-Color UI Buttons (Note # `0x64` to `0x77`)
Peripheral buttons (Track 1-8 = Red; Scene 1-8 = Green) have a simpler control format.
Message Construction: `[0x90] [Button Value] [State Velocity]`.

*   **Byte 1 (Behavior):** Must *always* be `0x90` (MIDI Channel 00). RGB blink/pulse behaviors do not apply.
*   **Byte 2 (Button):** `0x64` to `0x77`.
*   **Byte 3 (State):** `0x00` = LED Off, `0x01` (or `0x03`-`0x7F`) = LED Solid On, `0x02` = LED Blink.

---

### 5. Advanced Configuration (SysEx Commands)

Standard SysEx format for the APC mini mk2 usually follows:
`F0 47 7F 4F <Message ID> <Length MSB> <Length LSB> <Data...> F7`.

#### A. Custom RGB LED Lighting
If the 128-color palette is insufficient, custom 24-bit RGB values can be set. Because standard MIDI is 7-bit, the 8-bit RGB components must be split into MSB and LSB.
**Format:**
*   Bytes 1-7: `F0 47 7F 4F 24 <Total Bytes MSB> <Total Bytes LSB>`
*   Bytes 8-15: `<Start Pad> <End Pad> <Red MSB> <Red LSB> <Green MSB> <Green LSB> <Blue MSB> <Blue LSB>` (Pad ranges: `0x00` - `0x3F`)
*   *(Repeat bytes 8-15 for additional pad color changes)*
*   Terminator: `F7`

#### B. Introduction Message (Initialization)
Sent by the host before typical communications to trigger device initialization and inform the firmware of the application's version.
*   **Host Sends:** `F0 47 7F 4F 60 00 04 00 <App Version High> <App Version Low> <Bugfix Level> F7`.
*   **Device Responds:** Message ID `0x61` containing the physical, absolute positions of Faders 1 through 9.
    *   *Response Format:* `F0 47 7F 4F 61 00 04 <Fader 1> <Fader 2> <Fader 3> <Fader 4> <Fader 5> <Fader 6> <Fader 7> <Fader 8> <Fader 9> F7`.

#### C. Device Enquiry (MMC Standard)
Used to identify the hardware.
*   **Host Sends:** `F0 7E 00 06 01 F7`.
*   **Device Responds:** `F0 7E <Channel> 06 02 47 4F 00 19 <Version1> <Version2> <Version3> <Version4> <DeviceID> <Serial1-4> <Manufacturing1-16> F7`.