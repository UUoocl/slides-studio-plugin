    let hotKeyTimer;     
        let PRESET_SETTINGS;
    
        function setHotkeyText(newText){
          if (!PRESET_SETTINGS) {
            console.log("Initializing PRESET_SETTINGS from current state...");
            // Attempt to get current settings if getSketchSettings is available
            if (typeof getSketchSettings === 'function') {
              PRESET_SETTINGS = getSketchSettings(filename || 'default');
            } else {
              PRESET_SETTINGS = { text: "" };
            }
          }
          
          PRESET_SETTINGS.text = newText;
          
          // Update UI input if it exists
          const textfield = document.getElementById("textfield") || document.getElementById("textArea");
          if (textfield) {
            textfield.value = newText;
          }
    
          if (typeof setSketchSettings === 'function') {
            setSketchSettings(PRESET_SETTINGS);
          }
        }
    
        const keyboardChannel = new BroadcastChannel('keyboard_event');
    
        keyboardChannel.onmessage = (event) => {
          const data = event.data;
          if (data && data.key && data.key.includes("+")) {
            console.log('Hotkey broadcast received:', data.key);
            setHotkeyText(data.key);
            hotKeyTimer = 3;
          }
        };
    