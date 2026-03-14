Here is a comprehensive technical documentation for the **original Novation Launchpad**, organized specifically for easy reference during application development.

# **Novation Launchpad (Original) - Developer Reference**

### **1. Device Overview & Constraints**
The original Launchpad consists of an 8x8 grid of square buttons, 8 round "scene launch" buttons on the right, and 8 round "Automap/Live" buttons on the top row. 
*   **LEDs:** Every button is backlit by a bi-colored LED containing a Red and Green element. Turning both on mixes the light to create Amber.
*   **Communication:** Uses standard MIDI Note-On (`90h`/144), Note-Off (`80h`/128), and Control Change (`B0h`/176) messages on **MIDI Channel 1**.
*   **Bandwidth Constraint:** The device uses low-speed USB and accepts a maximum of 400 messages per second. Updating all 80 LEDs individually takes ~200ms. To achieve faster updates, utilize the **Rapid LED Update** or **Double-buffering** features.

---

### **2. Hardware Inputs (Inbound: Device to Host)**

When buttons are pressed or released, the Launchpad sends 3-byte MIDI messages. 
*   **Button Press:** Velocity/Data is `7Fh` (127).
*   **Button Release:** Velocity/Data is `00h` (0).

#### **A. Grid and Scene Launch Buttons (Note On)**
These send standard Note-On messages (`90h`). The key number depends on the active Mapping Mode.
*   **Format:** `90h [Key] [Velocity 7Fh or 00h]`

#### **B. Top Row Automap/Live Buttons (Control Change)**
The top 8 round buttons always send Control Change messages on Channel 1.
*   **Format:** `B0h [Controller Number] [Velocity 7Fh or 00h]`
*   **Controller Numbers:** `68h` (104) to `6Fh` (111), increasing left to right.

---

### **3. Mapping Modes**

The Launchpad has two coordinate layouts. You can switch between them using a Control Change message: 
*   **Format:** `B0h 00h [Mode Data]`
    *   **`01h` (1) - X-Y Layout (Default):** Best for standard grid mapping. The origin (top-left) is `00h`. Formula for any grid pad: `Key = (16 * Row) + Column`. The right-side Scene Launch buttons are treated as Column 8.
    *   **`02h` (2) - Drum Rack Layout:** Best for musical MIDI notes. Lays out 6 continuous octaves in a regular pattern.

---

### **4. LED Output Control (Outbound: Host to Device)**

#### **A. Standard Grid and Scene LEDs (Note On)**
*   **Format:** `90h [Key] [Velocity Color]`
*   **Key:** Addressed via the X-Y or Drum Rack formula.

#### **B. Top Row Automap/Live LEDs (Control Change)**
*   **Format:** `B0h [Controller Number] [Velocity Color]`
*   **Controller Number:** `68h` to `6Fh` (104 to 111).

#### **C. Calculating the Color / Velocity Byte**
The Velocity/Data byte controls Red brightness, Green brightness, and buffer flags.
Brightness levels are: `0` (Off), `1` (Low), `2` (Medium), and `3` (Full).

**Formula:** 
`Velocity = (16 * Green) + Red + Flags`
*   **Normal Flags:** `12` (`0Ch`)
*   **Flashing Flags:** `8` (`08h`) (Requires Double-buffering Flash mode to be active)
*   **Double-buffering Flags:** `0` (See Double-buffering section)

**Pre-calculated Common Colors (Normal Flag):**
*   **Off:** `0Ch` (12)
*   **Red (Low):** `0Dh` (13) | **Red (Full):** `0Fh` (15)
*   **Green (Low):** `1Ch` (28) | **Green (Full):** `3Ch` (60)
*   **Amber (Low):** `1Dh` (29) | **Amber (Full):** `3Fh` (63)
*   **Yellow (Full):** `3Eh` (62)

---

### **5. Rapid LED Update Mode**

To bypass the 200ms full-grid update limit, you can update all 80 LEDs using a single stream of 40 MIDI messages, updating two LEDs per message.
*   **Initialization/Format:** Send a MIDI Channel 3 Note-On (`92h` / 146) followed by sequential Velocity pairs: `92h [Vel 1] [Vel 2]`.
*   **Order of Operations:** The stream updates the 8x8 grid (Left to Right, Top to Bottom), then the 8 Scene buttons (Top to Bottom), and finally the 8 Top Row buttons (Left to Right).
*   **Exit Mode:** Send any standard message beginning with `80h`, `90h`, or `B0h`. Sending `92h` again resets the cursor back to the top left.

---

### **6. Double-Buffering & Flashing**

The Launchpad maintains two internal LED buffers (0 and 1). You can write to one invisibly while displaying the other, then instantly swap them. You can also use this to automate flashing.
*   **Format:** `B0h 00h [Data]`
*   **Data Calculation:** `Data = (4 * UpdateBuffer) + DisplayBuffer + 32 + Flags`.
    *   **UpdateBuffer:** `0` or `1` (Buffer to write to)
    *   **DisplayBuffer:** `0` or `1` (Buffer to show to the user)
    *   **Flags:** `16` (`10h`) for Copy (copies new display buffer to new update buffer), `8` (`08h`) for Flash, `0` for none.

**Common Double-Buffer / Flash Sequences:**
*   **Instant Full Grid Swap Setup:** 
    1. Send `B0h 00h 31h` (Display 1, Update 0).
    2. Send all LED data (ensure Copy/Clear flags in your velocity calculations are set to `0`).
    3. Send `B0h 00h 34h` (Display 0, Update 1). The grid updates instantly.
*   **Enable Automatic Flashing:** `B0h 00h 28h` (40 decimal).
*   **Disable Automatic Flashing:** `B0h 00h 20h` (32 decimal).
*   *(Note: Sending a buffer command resets the internal flash timer, allowing you to sync flash rates across multiple Launchpads)*.

---

### **7. System Configurations**

**Turn All LEDs On (Test Mode)**
Resets mapping, buffer, and duty cycle, and tests the LEDs.
*   **Format:** `B0h 00h [Brightness]`
*   **Brightness Values:** `7Dh` (125 = Low), `7Eh` (126 = Medium), `7Fh` (127 = Full).

**Reset Launchpad**
Turns off all LEDs and resets everything to default mapping, buffers, and duty cycles.
*   **Format:** `B0h 00h 00h`.

**Set Duty Cycle (Brightness/Contrast Adjustment)**
Alters multiplexing times to change contrast between "Low" and "Full" brightness, or to eliminate flicker. Care should be used to avoid creating strobing effects.
*   **Fraction:** Duty Cycle = Numerator (1 to 16) / Denominator (3 to 18).
*   **If Numerator < 9:** Send `B0h 1Eh [Data]` | Data = `(16 * (Num - 1)) + (Denom - 3)`.
*   **If Numerator >= 9:** Send `B0h 1Fh [Data]` | Data = `(16 * (Num - 9)) + (Denom - 3)`.
*   *(Default is 1/5: `B0h 1Eh 02h`)*.