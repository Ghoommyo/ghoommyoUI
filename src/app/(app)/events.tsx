import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/ui/screen';
import { UserEventsTabs } from '@/features/events/user-events-tabs';
import { useT } from '@/i18n/language-provider';

export default function EventsScreen() {
  const { t } = useT();
  return (
    <Screen ads>
      <AppHeader title={t('eventsPage.title')} />
      <UserEventsTabs />
    </Screen>
  );
}
