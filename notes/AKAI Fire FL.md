Here is a comprehensive technical documentation for the AKAI Fire MIDI controller, structured specifically for app development reference. 

# **AKAI Fire - Developer Reference & MIDI Implementation**

### **1. Device Overview**
The AKAI Fire is a dedicated controller originally designed for FL Studio. While Akai does not officially document its MIDI protocol, it operates as a fully class-compliant USB MIDI device. It features an OLED display, touch-sensitive rotary encoders, a 4x16 velocity-sensitive pad matrix, and various single-color/dual-color LED buttons.

---

### **2. Hardware Inputs (Inbound: Device to Host)**

#### **Buttons (Note On/Off)**
Buttons send standard MIDI Note-On (`0x90`) when pressed and Note-Off (`0x80`) when released. 
*   **Velocity:** `0x7F` for press, `0x00` for release.
*   **Button Mapping (Hex Note Values):**
    *   **STEP:** `0x2C` | **NOTE:** `0x2D` | **DRUM:** `0x2E` | **PERFORM:** `0x2F`
    *   **SHIFT:** `0x30` | **ALT:** `0x31` | **PATTERN:** `0x32` | **PLAY:** `0x33`
    *   **STOP:** `0x34` | **REC:** `0x35` | **BANK:** `0x1A` | **BROWSER:** `0x21`
    *   **SOLO 1-4:** `0x24` through `0x27`
    *   **PAT UP:** `0x1F` | **PAT DOWN:** `0x20`
    *   **GRID LEFT:** `0x22` | **GRID RIGHT:** `0x23`

#### **Rotary Encoders**
The 4 main rotary knobs are capacitive/touch-sensitive. They send Note events for touch/press and Control Change (CC) events for rotation.
*   **Rotation Values:** Uses 7-bit two's complement relative values. Clockwise turn = `0x01` to `0x3F`. Counter-clockwise turn = `0x7F` down to `0x40`.
*   **Encoder Mapping:**
    *   **VOLUME:** Touch = Note `0x10`, Turn = CC `0x10`
    *   **PAN:** Touch = Note `0x11`, Turn = CC `0x11`
    *   **FILTER:** Touch = Note `0x12`, Turn = CC `0x12`
    *   **RESONANCE:** Touch = Note `0x13`, Turn = CC `0x13`
    *   **SELECT:** Press = Note `0x19`, Turn = CC `0x76`

#### **Pad Matrix (4x16 Grid)**
Pads transmit standard Note-On/Off messages. **Note on velocity:** Akai calls them "velocity-sensitive", but the reported velocity is erratic and hard to control.
*   **Row 1 (Top):** Notes `0x36` to `0x45`
*   **Row 2:** Notes `0x46` to `0x55`
*   **Row 3:** Notes `0x56` to `0x65`
*   **Row 4 (Bottom):** Notes `0x66` to `0x75`

---

### **3. LED Output Control (Outbound: Host to Device)**

Standard Note-On messages do **not** illuminate pads or buttons. Output requires Control Change (CC) messages for standard buttons and System Exclusive (SysEx) messages for RGB pads and the OLED.

#### **Button LEDs (Control Change)**
Button LEDs are addressed using CC messages on MIDI Channel 1 (`0xB0`). The CC number corresponds 1:1 with the input Note number.
*   **Global Reset:** Send CC `127` (`0x7F`). Value `0x00` turns all LEDs off. Any other value (e.g., `0x7F`) turns all LEDs and pads on (white).
*   **Specific Button LEDs (Format: `B0 [Controller] [Color Value]`):**
    *   **Value `00`** always turns the LED **Off**.
    *   **Red-Only** *(PAT BACK/NEXT, BROWSER, GRID LEFT/RIGHT)*: `01` = Dull Red, `02` = High Red.
    *   **Green-Only** *(SOLO 1-4)*: `01` = Dull Green, `02` = High Green.
    *   **Yellow-Only** *(ALT, STOP)*: `01` = Dull Yellow, `02` = High Yellow.
    *   **Yellow-Red** *(STEP, NOTE, DRUM, PERFORM, SHIFT, LOOP REC)*: `01` = Dull Yellow, `02` = Dull Red, `03` = High Yellow, `04` = High Red.
    *   **Yellow-Green** *(PATTERN, PLAY)*: `01` = Dull Yellow, `02` = Dull Green, `03` = High Yellow, `04` = High Green.

#### **Special Indicator LEDs**
*   **Rectangular LEDs (Above Pad Matrix):** CC `0x28` to `0x2B`. Values: `01` = Dull Red, `02` = Dull Green, `03` = High Red, `04` = High Green.
*   **Bank LEDs (4 Circular Red LEDs):** Addressed collectively via CC `0x1B`. 
    *   Values: `00` = All Off, `01` = Channel On, `02` = Mixer On, `03` = User 1 On, `04` = User 2 On. 
    *   *Bitmask alternative:* `0x10` (All off) to `0x1F` (All on). E.g., `13` = Channel + Mixer On.

---

### **4. Pad Array RGB Control (SysEx)**

Because standard 7-bit MIDI velocity cannot hold true RGB values, **pad colors must be set using SysEx messages**.
*   **Pad Indexing:** `0x00` (Top Left) through `0x3F` (Bottom Right).
*   **Message Format for Updating Pads:**
    `F0 47 7F 43 65 <Length MSB> <Length LSB> [<Pad Index> <Red> <Green> <Blue>] ... F7`
*   **Byte Breakdown:**
    *   `F0 47 7F`: SysEx Start, Akai Manufacturer ID, All-Call Address.
    *   `43 65`: Fire Sub-ID, **Write Pad Array** Command.
    *   `Length MSB / LSB`: Encoded length of the payload using 7-bit MIDI constraints (e.g., updating all 64 pads takes 256 bytes, encoded as `02 00`).
    *   `Pad Index`: `0x00` to `0x3F`.
    *   `Red, Green, Blue`: Color levels from `0x00` to `0x7F`.
*   *Example (Set Pad 4, Row 2 to full Blue):* `F0 47 7F 43 65 00 04 23 00 00 7F F7`.

---

### **5. OLED Display Control (SysEx)**

The OLED is a 128x64 monochrome screen (pixels are taller than they are wide). The host must render the bitmap and send it to the device via SysEx.

*   **SysEx Command Structure:**
    `F0 47 7F 43 0E <Length MSB> <Length LSB> 00 07 00 7F <Bitmap Data> F7`
*   **Byte Breakdown:**
    *   `0E`: **Write OLED** Command.
    *   `Length`: Size of the bitmap payload.
    *   `00 07`: Start/End 8-pixel horizontal bands (8 bands total = 64 pixels high).
    *   `00 7F`: Start/End columns (0 to 127).
*   **Warped Pixel Mapping:**
    The internal pixel arrangement is non-linear. The display is divided into blocks of 8x7 pixels where the bit position in the SysEx message bears no linear relationship with the display pixel. App logic must use a lookup table to mutate a standard (X,Y) coordinate to the correct bit position in the 1024-byte payload.

---

### **6. Hidden Hardware Modes**
*   **Color-Balance Mode:** Unplug USB, hold `PATTERN`, `PLAY`, `STOP`, and `REC` simultaneously, then plug in the USB. 
*   **STM32 Bootloader Mode:** Unplug USB, hold `STEP`, `NOTE`, `DRUM`, and `PERFORM` simultaneously, then plug in the USB.