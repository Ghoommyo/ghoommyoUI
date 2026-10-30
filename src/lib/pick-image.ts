import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { PickedImage } from '@/types/domain';

/** Longest side of an uploaded picture; the server accepts up to 2 MB. */
const MAX_SIDE = 1280;
const QUALITY = 0.8;

/**
 * Lets the user choose a picture (or take one; not on web), then shrinks it to a JPEG of at most
 * 1280 px. Null when they cancel. Must run straight from a button press (web browsers require it).
 */
export async function pickImage(source: 'library' | 'camera'): Promise<PickedImage | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Allow camera access in Settings to take a photo.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
  let result: ImagePicker.ImagePickerResult;
  try {
    result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : // Android's system photo picker is missing on some devices (e.g. emulators without Google
          // services) and a failed launch breaks the next one, so use the file picker (GET_CONTENT),
          // which works everywhere and offers the same photos.
          await ImagePicker.launchImageLibraryAsync({ ...options, legacy: true });
  } catch {
    throw new Error(
      source === 'camera' ? "Couldn't open the camera on this device." : "Couldn't open your photos on this device.",
    );
  }
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  // Width and height can be 0 when unknown; then only render, which still re-encodes as JPEG.
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY });

  if (Platform.OS === 'web') {
    const blob = await (await fetch(saved.uri)).blob();
    return { file: blob, previewUri: saved.uri };
  }
  // Expo's fetch sends a file-system File (it has `bytes()`), not React Native's `{ uri }` parts.
  return { file: new File(saved.uri), previewUri: saved.uri };
}
