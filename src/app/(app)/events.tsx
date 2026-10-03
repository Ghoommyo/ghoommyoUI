import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/ui/screen';

export default function EventsScreen() {
  return (
    <Screen>
      <AppHeader title="Events" />
      <ThemedText themeColor="textSecondary">Coming in phase 5.</ThemedText>
    </Screen>
  );
}
