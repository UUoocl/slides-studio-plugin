var hotKeyTimer;     
var PRESET_SETTINGS;

function setHotkeyText(newText){
  if (!PRESET_SETTINGS) {
    console.log("Initializing PRESET_SETTINGS from current state...");
    if (typeof getSketchSettings === 'function') {
      PRESET_SETTINGS = getSketchSettings(typeof filename !== 'undefined' ? filename : 'default');
    } else {
      PRESET_SETTINGS = { text: "" };
    }
  }

  // Restore previous settings before applying new text
  // This ensures that if the previous animation had faded out (e.g. ribbonCount went to 0),
  // it is restored to its preset state for the new text.
  if (typeof setSketchSettings === 'function' && PRESET_SETTINGS) {
      console.log("Restoring settings for new hotkey text");
      setSketchSettings(PRESET_SETTINGS);
  }
  
  PRESET_SETTINGS.text = newText;
  window.hotKeyTimer = 5; // Reset timer
  
  // Update UI input if it exists
  const textfield = document.getElementById("textfield") || document.getElementById("textArea");
  if (textfield) {
    textfield.value = newText;
  }

  // Surgical update: trigger specific sketch update functions if they exist.
  if (typeof setText === 'function') {
    setText(); // Used in Boost
  } else if (typeof createSplits === 'function') {
    createSplits(); // Used in Danger
  }
}
