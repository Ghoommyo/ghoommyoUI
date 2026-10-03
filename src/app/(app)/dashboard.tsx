import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/ui/screen';

export default function DashboardScreen() {
  return (
    <Screen>
      <AppHeader title="Dashboard" />
      <ThemedText themeColor="textSecondary">Coming in phase 3.</ThemedText>
    </Screen>
  );
}
