Here is a comprehensive technical documentation for the Novation Launchpad Mini [MK3] MIDI implementation, structured for easy reference during application development.

# **Novation Launchpad Mini [MK3] - Developer Reference**

### **1. Device Overview & MIDI Interfaces**
The Launchpad Mini [MK3] communicates using standard MIDI over USB. It exposes two distinct MIDI interfaces to the host:
*   **LPMiniMK3 DAW In / Out (Interface 1):** Used by DAWs (Digital Audio Workstations) to interact with the device's Session mode and DAW Faders.
*   **LPMiniMK3 MIDI In / Out (Interface 2):** Used for receiving MIDI from Custom modes and providing external MIDI input or LED lighting controls in Lighting Custom Modes and Programmer mode.

**Basic MIDI Conventions:**
*   **Note On:** `90h` - `9Fh` (144-159).
*   **Note Off:** `80h` - `8Fh` (128-143), or Note On with velocity `00h`.
*   **Control Change (CC):** `B0h` - `BFh` (176-191).

---

### **2. Bootloader Configuration**
The bootloader is accessed by holding the **Capture MIDI** button while plugging the device in.
*   **Device ID (Top 2 Rows):** Ranging from 1 to 16. Factory default is 1. 
*   **Mass Storage/Onboarding (Middle-right Yellow Pad):** Toggles whether the device mounts as a Mass Storage Device on connection.
*   **Brightness (Blue Row):** Sets the default hardware brightness level.
*   **Versions (Bottom-left Green Pads):** Displays Bootloader and Application versions.
*   **Start App (Bottom-right Green Pad):** Exits bootloader and starts the application.

---

### **3. System Exclusive (SysEx) Foundation**
All proprietary SysEx messages for the Launchpad Mini [MK3] begin with the following 6-byte header:
**Header:** `F0h 00h 20h 29h 02h 0Dh`

#### **Device Inquiry**
Standard Universal Device Inquiry can be used to identify the device and its firmware version.
*   **Host Sends:** `F0h 7Eh 7Fh 06h 01h F7h`
*   **Device Responds (App Mode):** `F0h 7Eh 00h 06h 02h 00h 20h 29h 13h 01h 00h 00h <app_version> F7h`
*   *(Note: `<app_version>` is 4 bytes representing digits 0-9)*.

---

### **4. Global Device Modes & Layouts**

#### **Programmer vs. Live Mode**
Programmer Mode is the recommended state for custom scripts and apps. It sends out a message for every pad/button pressed and lights pads corresponding to incoming messages.
*   **Format:** `[Header] 0Eh <mode> F7h`
*   **Values:** `00h` = Live Mode, `01h` = Programmer Mode.

#### **Selecting Layouts**
Changes the current physical layout mapping of the grid.
*   **Format:** `[Header] 00h <layout> F7h`
*   **Layout IDs:** 
    *   `00h`: Session (DAW mode only)
    *   `04h`: Custom mode 1 (Drum Rack)
    *   `05h`: Custom mode 2 (Keys)
    *   `06h`: Custom mode 3 (User / Lighting)
    *   `0Dh`: DAW Faders (DAW mode only)
    *   `7Fh`: Programmer mode

---

### **5. LED Lighting Control (Outbound)**

Lighting can be controlled using standard MIDI messages on specific MIDI channels, or via bulk SysEx messages.

#### **A. Standard MIDI Channel Lighting**
The MIDI channel determines the behavior of the LED (Static, Flashing, or Pulsing). The **Velocity** (or Value for CC) dictates the color using the Launchpad's fixed 128-color palette.
*   **Channel 1 (`90h` Note / `B0h` CC):** Static Color.
*   **Channel 2 (`91h` Note / `B1h` CC):** Flashing Color (Flashes between the current Static/Pulsing color and this new color at 120bpm/MIDI beat clock).
*   **Channel 3 (`92h` Note / `B2h` CC):** Pulsing Color (Pulses between dark and full intensity).
*   *Turning Off an LED:* Send Note On/CC with Velocity/Value `00h`.

#### **B. Bulk LED Lighting via SysEx**
Use this to update the entire surface or apply 24-bit RGB colors. Valid in Lighting Custom Modes and Programmer mode.
*   **Format:** `[Header] 03h <colourspec> [<colourspec> ...] F7h`
*   **`<colourspec>` Structure:** `[Lighting Type] [LED Index] [Lighting Data...]`
    *   **Type `00h` (Static):** 1 byte data (Palette Index).
    *   **Type `01h` (Flashing):** 2 bytes data (Color B, Color A).
    *   **Type `02h` (Pulsing):** 1 byte data (Palette Index).
    *   **Type `03h` (RGB):** 3 bytes data (Red, Green, Blue) — ranges `00h` to `7Fh`.

#### **C. Text Scrolling**
Displays scrolling text across the 8x8 grid and right-side buttons.
*   **Format:** `[Header] 07h <loop> <speed> <colourspec> <text> F7h`
*   **Parameters:**
    *   `<loop>`: `00h` (Don't loop), `01h` (Loop).
    *   `<speed>`: Scrolling speed in pads/second (`40h`+ is negative/right-to-left).
    *   `<colourspec>`: `00h <Palette ID>` OR `01h <Red> <Green> <Blue>`.
    *   `<text>`: Standard ASCII text bytes.
*   *To terminate a scroll:* Send an empty scroll command `[Header] 07h F7h`.

---

### **6. Software Interaction (DAW Mode)**

DAW Mode allows a host application to set up a dedicated UI, complete with faders, without interfering with the standard MIDI interface.
*   **Enable/Disable DAW Mode:** `[Header] 10h <mode> F7h` (`00h` = Standalone, `01h` = DAW).

#### **DAW Faders**
Sets up a bank of up to 8 vertical or horizontal faders on the grid.
*   **Format:** `[Header] 01h 00h <orientation> <fader> [<fader> ...] F7h`
*   **`<orientation>`:** `00h` (Vertical), `01h` (Horizontal).
*   **`<fader>` Structure:** `[Index (0-7)] [Type (0=Unipolar, 1=Bipolar)] [CC Number] [Color Palette ID]`. (Set color to `00h` to disable the fader).

#### **Clearing DAW State**
Quickly clears the active session state without needing to send 128 individual Note Off messages.
*   **Format:** `[Header] 12h <session> 00h <controlchanges> F7h`
*   *(Set `<session>` or `<controlchanges>` to `01h` to clear those respective states)*.

---

### **7. Power & Configuration Control**

*   **Sleep Mode (Turn off all LEDs):** 
    *   `[Header] 09h <mode> F7h` (`00h` = Sleep/Off, `01h` = Wake/On).
*   **Set Brightness Level:** 
    *   `[Header] 08h <brightness> F7h` (Scale of `00h` to `7Fh`).
*   **Set LED Feedbacks:** Controls if the device automatically lights pads when pressed (Internal) or when MIDI is received on the MIDI interface (External).
    *   `[Header] 0Ah <internal> <external> F7h` (`00h` = Off, `01h` = On).

### **8. Special Features**
*   **Ghost Mode:** In Lighting Custom Modes, Ghost Mode allows lighting to bleed/expand beyond the primary 8x8 grid into the top/side buttons and the logo. This is automatically enabled if the host sends any CC message on the MIDI interface or utilizes the LED Lighting SysEx command (`03h`). You can manually trigger it by pressing Session + Custom buttons rapidly.