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

// Support for multiple input sources via query param ?inputSource=audio or ?inputSource=keyboard (default)
const urlParams = new URLSearchParams(window.location.search);
const inputSource = urlParams.get('inputSource') || 'keyboard';

if (inputSource === 'audio') {
    console.log('STG: Listening to audio_stt channel');
    const audioChannel = new BroadcastChannel('audio_stt');
    audioChannel.onmessage = (event) => {
        const data = event.data;
        if (data && data.stt) {
            console.log('Audio STT received:', data.stt);
            setHotkeyText(data.stt);
            hotKeyTimer = 5; // Display for 5 seconds
        }
    };
} else {
    // Default to keyboard
    console.log('STG: Listening to keyboard_events channel');
    const keyboardChannel = new BroadcastChannel('keyboard_events');
    keyboardChannel.onmessage = (event) => {
        const data = event.data;
        // The master_listener sends { type, data: { key, combo } }
        if (data && data.type === 'keyboardPress') {
            const keyData = data.data;
            // Support both direct key if it contains + or combo
            const displayKey = keyData.combo || keyData.key;
            if (displayKey && displayKey.includes("+")) {
                console.log('Hotkey broadcast received:', displayKey);
                setHotkeyText(displayKey);
                hotKeyTimer = 3;
            }
        }
    };
}
