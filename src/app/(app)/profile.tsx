import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/ui/screen';

export default function ProfileScreen() {
  return (
    <Screen>
      <AppHeader title="Profile" />
      <ThemedText themeColor="textSecondary">Coming in phase 6.</ThemedText>
    </Screen>
  );
}
