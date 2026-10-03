import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export function StoreDashboard() {
  return (
    <Screen>
      <AppHeader />
      <ThemedText themeColor="textSecondary">Store dashboard coming in phase 4.</ThemedText>
    </Screen>
  );
}
