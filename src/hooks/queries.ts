import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api';
import { useSession } from '@/auth/session';
import type {
  AppNotification,
  BookingChanges,
  BookingRating,
  BookingStatus,
  DateKey,
  NewBooking,
  ServiceInput,
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
  storeReviews: (storeId: string) => ['stores', storeId, 'reviews'] as const,
  storeServices: (storeId: string) => ['stores', storeId, 'services'] as const,
  serviceTypes: ['service-types'] as const,
  notifications: (accountId: string) => ['me', accountId, 'notifications'] as const,
  reminderBookings: (accountId: string) => ['me', accountId, 'reminder-bookings'] as const,
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

export function useServiceTypes() {
  return useQuery({ queryKey: queryKeys.serviceTypes, queryFn: () => api.getServiceTypes() });
}

export function useStoreServices(storeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.storeServices(storeId ?? ''),
    queryFn: () => api.getStoreServices(storeId!),
    enabled: !!storeId,
  });
}

/** Service edits refresh every store query, including the services lists. */
export function useCreateService(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceInput) => api.createService(storeId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stores }),
  });
}

export function useUpdateService(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, input }: { serviceId: string; input: ServiceInput }) =>
      api.updateService(storeId, serviceId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stores }),
  });
}

export function useDeleteService(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => api.deleteService(storeId, serviceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stores }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores });
      // A new "Other" type joins the shared list.
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceTypes });
    },
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

/** The customer edits their own booking; refreshes the store's lists and the customer's own. */
export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, changes }: { bookingId: string; changes: BookingChanges }) =>
      api.updateBooking(bookingId, changes),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store(booking.storeId) });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useRateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, rating }: { bookingId: string; storeId: string; rating: BookingRating }) =>
      api.rateBooking(bookingId, rating),
    onSuccess: (_rating, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores });
      queryClient.invalidateQueries({ queryKey: queryKeys.storeReviews(storeId) });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

/** A store's reviews, 10 per page; `fetchNextPage()` loads more. */
export function useStoreReviews(storeId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.storeReviews(storeId ?? ''),
    queryFn: ({ pageParam }) => api.getReviews(storeId!, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!storeId,
  });
}

/**
 * The signed-in account's notifications: fetched once when the app starts (so the bell can show the
 * unseen count), then only on explicit refetch (opening the panel, Refresh). No polling.
 */
export function useNotifications() {
  const { session } = useSession();
  return useQuery({
    queryKey: queryKeys.notifications(session?.accountId ?? ''),
    queryFn: () => api.getNotifications(),
    enabled: !!session,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** Marks notifications seen on the server; the cache is updated separately (see `useShowNotificationsRead`). */
export function useMarkNotificationsRead() {
  return useMutation({ mutationFn: (ids: string[]) => api.markNotificationsRead(ids) });
}

/** Shows the given notifications as seen in the cache, so the bell's count clears without a refetch. */
export function useShowNotificationsRead() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  return (ids: string[]) =>
    queryClient.setQueryData<AppNotification[]>(queryKeys.notifications(session?.accountId ?? ''), (list) =>
      list?.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
    );
}

/** Accepted bookings from today on, for scheduling reminders (native only). */
export function useReminderBookings(enabled: boolean) {
  const { session } = useSession();
  return useQuery({
    queryKey: queryKeys.reminderBookings(session?.accountId ?? ''),
    queryFn: () => api.getReminderBookings(),
    enabled: enabled && !!session,
  });
}
