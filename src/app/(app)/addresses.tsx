import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/ui/screen';
import { AddressBook } from '@/features/addresses/address-book';

export default function AddressesScreen() {
  return (
    <Screen>
      <AppHeader title="Addresses" />
      <AddressBook />
    </Screen>
  );
}
