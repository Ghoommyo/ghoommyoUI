import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function BookingScreen() {
  return (
    <Screen>
      <ThemedText type="subtitle">Book a visit</ThemedText>
      <ThemedText themeColor="textSecondary">Coming in phase 3.</ThemedText>
    </Screen>
  );
}
