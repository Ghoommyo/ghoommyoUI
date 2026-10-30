import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/ui/screen';
import { AddressBook } from '@/features/addresses/address-book';
import { useT } from '@/i18n/language-provider';

export default function AddressesScreen() {
  const { t } = useT();
  return (
    <Screen>
      <AppHeader title={t('addresses.title')} />
      <AddressBook />
    </Screen>
  );
}
