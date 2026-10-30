import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/ui/screen';
import { UserEventsTabs } from '@/features/events/user-events-tabs';

export default function EventsScreen() {
  return (
    <Screen ads>
      <AppHeader title="Events" />
      <UserEventsTabs />
    </Screen>
  );
}
