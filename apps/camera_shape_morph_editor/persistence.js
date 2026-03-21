/**
 * Persistence Layer for Camera Shape Morph Editor
 */

const STORAGE_PATH = 'apps/slide-studio-app/camera_shapes.json';

/**
 * Loads shapes from the JSON storage file.
 * @returns {Promise<Object>} An object containing the shapes.
 */
export async function loadShapes() {
  try {
    const response = await window.scSocket.invoke('readFile', { path: STORAGE_PATH });
    if (response && response.content) {
      return JSON.parse(response.content);
    }
  } catch (error) {
    console.error('Error loading shapes:', error);
  }
  return {};
}

/**
 * Saves shapes to the JSON storage file.
 * @param {Object} shapes - The shapes object to save.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function saveShapes(shapes) {
  try {
    await window.scSocket.invoke('writeFile', {
      path: STORAGE_PATH,
      content: JSON.stringify(shapes, null, 2)
    });
    return true;
  } catch (error) {
    console.error('Error saving shapes:', error);
    return false;
  }
}
