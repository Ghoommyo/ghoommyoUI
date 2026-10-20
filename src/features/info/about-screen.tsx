import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Step = { image: number; alt: string; title: string; text: string };

// The same screenshots as the website's About page (captured from the running app).
const CUSTOMER_STEPS: Step[] = [
  {
    image: require('@/assets/images/about/home.png'),
    alt: 'Home screen listing store types with their best rated stores',
    title: 'Find a store',
    text: 'Home groups stores by what they offer (bakeries, tailors, electricians…) with the best rated ones first. Tap Book to start.',
  },
  {
    image: require('@/assets/images/about/dashboard.png'),
    alt: 'Dashboard with a store selected and time slots showing how many people are booked',
    title: "Pick a time that isn't crowded",
    text: 'Choose a day and see how many people (or orders) each time slot already has. Full slots are marked, so you can skip the crowd.',
  },
  {
    image: require('@/assets/images/about/products.png'),
    alt: "A store's products with prices and plus/minus buttons",
    title: 'Choose products or services',
    text: 'Add what you need, with quantities. Prices and the total are shown before you book.',
  },
  {
    image: require('@/assets/images/about/booking.png'),
    alt: 'Booking form with order type Porter and a saved delivery address',
    title: 'Say how you want it',
    text: 'Book a table, pick it up, get it delivered by Porter, book an appointment or a home visit. For deliveries and home visits, choose a saved address or type a new one.',
  },
  {
    image: require('@/assets/images/about/notifications.png'),
    alt: 'Notifications panel with new notifications highlighted',
    title: 'Stay updated',
    text: 'The bell tells you when a store accepts or rejects your request. Rate your visit afterwards, and get a reminder before it starts.',
  },
];

const STORE_STEPS: Step[] = [
  {
    image: require('@/assets/images/about/store-dashboard.png'),
    alt: "Store dashboard with a month calendar and today's bookings",
    title: 'See your day at a glance',
    text: "A calendar shows how busy each day is, with today's requests below. Accept or reject in one tap, or let Ghoomyo auto-approve.",
  },
  {
    image: require('@/assets/images/about/store-settings.png'),
    alt: 'Store settings with store type, category, limits and the dark store switch',
    title: 'Set up your store your way',
    text: "Choose whether you sell products or services, your category, opening hours, how many visitors per hour, and whether you're a delivery-only (dark) store.",
  },
  {
    image: require('@/assets/images/about/store-items.png'),
    alt: "The store's list of products with prices",
    title: 'List what you offer',
    text: 'Add products or services with prices, pictures and limits. Customers pick them when they book, so you know exactly what to prepare.',
  },
];

function Steps({ steps }: { steps: Step[] }) {
  const theme = useTheme();
  return (
    <View style={styles.steps}>
      {steps.map((step, i) => (
        <View key={step.title} style={styles.step}>
          <Image
            source={step.image}
            accessibilityLabel={step.alt}
            contentFit="cover"
            style={[styles.shot, { borderColor: theme.border }]}
          />
          <View style={styles.stepTitle}>
            <View style={[styles.number, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                {i + 1}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={styles.flex} accessibilityRole="header">
              {step.title}
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary">{step.text}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export function AboutScreen() {
  return (
    <Screen>
      <AppHeader title="About Ghoomyo" />
      <ThemedText>
        Ghoomyo makes visiting local stores simple. Customers see how busy a store is, book a slot, and choose whether to visit,
        pick up, get a delivery or have someone come home. Stores get a clear list of requests and a calendar to manage them.
      </ThemedText>
      <ThemedText themeColor="textSecondary">It works in the Android and iOS apps and on the website, with the same account.</ThemedText>
      <ThemedText type="subtitle" style={styles.section} accessibilityRole="header">
        For customers
      </ThemedText>
      <Steps steps={CUSTOMER_STEPS} />
      <ThemedText type="subtitle" style={styles.section} accessibilityRole="header">
        For stores
      </ThemedText>
      <Steps steps={STORE_STEPS} />
      <View style={styles.actions}>
        <Button label="Browse stores" onPress={() => router.navigate('/home')} />
        <Button label="Contact us" variant="secondary" onPress={() => router.navigate('/contact')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 24,
    lineHeight: 32,
    marginTop: Spacing.three,
  },
  steps: {
    gap: Spacing.five,
  },
  step: {
    gap: Spacing.two,
  },
  shot: {
    width: 220,
    aspectRatio: 390 / 844,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 3,
  },
  stepTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    fontSize: 17,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
