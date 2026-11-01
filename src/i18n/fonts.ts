import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

/**
 * Noto Sans Devanagari (it has Latin too), one file per weight, built into the app by the expo-font
 * plugin in app.json; on Android the family name is the file name.
 */
const FAMILY_BY_WEIGHT: Record<number, string> = {
  400: 'NotoSansDevanagari_400Regular',
  500: 'NotoSansDevanagari_500Medium',
  600: 'NotoSansDevanagari_600SemiBold',
  700: 'NotoSansDevanagari_700Bold',
};

/**
 * Hindi and Marathi text on Android in Noto Sans Devanagari, one font file per weight. Android draws
 * its own Devanagari font wider in bold than it measures it, so a label's last word wrapped onto a
 * hidden line. Text with its own family (e.g. monospace) is left alone.
 */
export function devanagariStyle(style: StyleProp<TextStyle>): TextStyle | null {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return null;
  const weight = flat.fontWeight === 'bold' ? 700 : Number(flat.fontWeight ?? 400);
  const family = FAMILY_BY_WEIGHT[Math.min(700, Math.max(400, Math.round(weight / 100) * 100))];
  return { fontFamily: family, fontWeight: 'normal' };
}
