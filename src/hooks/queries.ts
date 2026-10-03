import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api';
import { useSession } from '@/auth/session';
import type {
  BookingStatus,
  DateKey,
  NewBooking,
  StoreProfile,
  StoreSettings,
  UserProfile,
} from '@/types/domain';

// Account-scoped keys include the account id so switching accounts never shows stale data.
export const queryKeys = {
  stores: ['stores'] as const,
  store: (storeId: string) => ['stores', storeId] as const,
  storeSlots: (storeId: string, date: DateKey) => ['stores', storeId, 'slots', date] as const,
  storeMonth: (storeId: string, year: number, month: number) =>
    ['stores', storeId, 'month', year, month] as const,
  storeBookings: (storeId: string, dates: DateKey[]) =>
    ['stores', storeId, 'bookings', dates] as const,
  myBookings: (accountId: string) => ['me', accountId, 'bookings'] as const,
  myProfile: (accountId: string) => ['me', accountId, 'profile'] as const,
};

export function useStores() {
  return useQuery({ queryKey: queryKeys.stores, queryFn: () => api.listStores() });
}

export function useStore(storeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.store(storeId ?? ''),
    queryFn: () => api.getStore(storeId!),
    enabled: !!storeId,
  });
}

export function useStoreSlots(storeId: string | undefined, date: DateKey | undefined) {
  return useQuery({
    queryKey: queryKeys.storeSlots(storeId ?? '', date ?? ''),
    queryFn: () => api.getStoreSlots(storeId!, date!),
    enabled: !!storeId && !!date,
  });
}

export function useStoreMonthSummary(storeId: string | undefined, year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.storeMonth(storeId ?? '', year, month),
    queryFn: () => api.getStoreMonthSummary(storeId!, year, month),
    enabled: !!storeId,
  });
}

/** Store's bookings for the searched days; disabled until a search has been made. */
export function useStoreBookings(storeId: string | undefined, dates: DateKey[] | null) {
  return useQuery({
    queryKey: queryKeys.storeBookings(storeId ?? '', dates ?? []),
    queryFn: () => api.getStoreBookings(storeId!, dates!),
    enabled: !!storeId && !!dates && dates.length > 0,
  });
}

export function useMyBookings() {
  const { session } = useSession();
  return useQuery({
    queryKey: queryKeys.myBookings(session?.accountId ?? ''),
    queryFn: () => api.getMyBookings(),
    enabled: session?.role === 'user',
  });
}

export function useMyProfile() {
  const { session } = useSession();
  return useQuery({
    queryKey: queryKeys.myProfile(session?.accountId ?? ''),
    queryFn: () => api.getUserProfile(),
    enabled: !!session,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  return useMutation({
    mutationFn: (booking: NewBooking) => api.createBooking(booking),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store(booking.storeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myBookings(session?.accountId ?? '') });
    },
  });
}

export function useSetBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: BookingStatus }) =>
      api.setBookingStatus(bookingId, status),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store(booking.storeId) });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useUpdateStoreSettings(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: StoreSettings) => api.updateStoreSettings(storeId, settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stores }),
  });
}

export function useUpdateStoreProfile(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: StoreProfile) => api.updateStoreProfile(storeId, profile),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stores }),
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  return useMutation({
    mutationFn: (profile: UserProfile) => api.updateUserProfile(profile),
    onSuccess: (profile) =>
      queryClient.setQueryData(queryKeys.myProfile(session?.accountId ?? ''), profile),
  });
}
