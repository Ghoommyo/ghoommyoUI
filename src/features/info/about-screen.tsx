import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/language-provider';
import type { Language } from '@/i18n/languages';

type Step = { image: number; alt: string; title: string; text: string };
type StepText = Omit<Step, 'image'>;

// The same screenshots as the website's About page (captured from the running app).
const CUSTOMER_IMAGES = [
  require('@/assets/images/about/home.png'),
  require('@/assets/images/about/dashboard.png'),
  require('@/assets/images/about/products.png'),
  require('@/assets/images/about/booking.png'),
  require('@/assets/images/about/notifications.png'),
];
const STORE_IMAGES = [
  require('@/assets/images/about/store-dashboard.png'),
  require('@/assets/images/about/store-settings.png'),
  require('@/assets/images/about/store-items.png'),
];

/** The page text in each language (the same as the website's About page). */
const COPY: Record<
  Language,
  { intro: string; platforms: string; customers: string; stores: string; browse: string; customerSteps: StepText[]; storeSteps: StepText[] }
> = {
  en: {
    intro:
      'Ghoomyo makes visiting local stores simple. Customers see how busy a store is, book a slot, and choose whether to visit, pick up, get a delivery or have someone come home. Stores get a clear list of requests and a calendar to manage them.',
    platforms: 'It works in the Android and iOS apps and on the website, with the same account, in English, Hindi and Marathi.',
    customers: 'For customers',
    stores: 'For stores',
    browse: 'Browse stores',
    customerSteps: [
      {
        alt: 'Home screen listing store types with their best rated stores',
        title: 'Find a store',
        text: 'Home groups stores by what they offer (bakeries, tailors, electricians…) with the best rated ones first. Tap Book to start.',
      },
      {
        alt: 'Dashboard with a store selected and time slots showing how many people are booked',
        title: "Pick a time that isn't crowded",
        text: 'Choose a day and see how many people (or orders) each time slot already has. Full slots are marked, so you can skip the crowd.',
      },
      {
        alt: "A store's products with prices and plus/minus buttons",
        title: 'Choose products or services',
        text: 'Add what you need, with quantities. Prices and the total are shown before you book.',
      },
      {
        alt: 'Booking form with order type Porter and a saved delivery address',
        title: 'Say how you want it',
        text: 'Book a table, pick it up, get it delivered by Porter, book an appointment or a home visit. For deliveries and home visits, choose a saved address or type a new one.',
      },
      {
        alt: 'Notifications panel with new notifications highlighted',
        title: 'Stay updated',
        text: 'The bell tells you when a store accepts or rejects your request. Rate your visit afterwards, and get a reminder before it starts.',
      },
    ],
    storeSteps: [
      {
        alt: "Store dashboard with a month calendar and today's bookings",
        title: 'See your day at a glance',
        text: "A calendar shows how busy each day is, with today's requests below. Accept or reject in one tap, or let Ghoomyo auto-approve.",
      },
      {
        alt: 'Store settings with store type, category, limits and the dark store switch',
        title: 'Set up your store your way',
        text: "Choose whether you sell products or services, your category, opening hours, how many visitors per hour, and whether you're a delivery-only (dark) store.",
      },
      {
        alt: "The store's list of products with prices",
        title: 'List what you offer',
        text: 'Add products or services with prices, pictures and limits. Customers pick them when they book, so you know exactly what to prepare.',
      },
    ],
  },
  hi: {
    intro:
      'Ghoomyo पास के स्टोर पर जाना आसान बनाता है। ग्राहक देखते हैं कि स्टोर पर कितनी भीड़ है, समय बुक करते हैं, और चुनते हैं कि खुद जाएँगे, सामान ले जाएँगे, डिलीवरी मँगवाएँगे या किसी को घर बुलाएँगे। स्टोर को अनुरोधों की साफ़ सूची और उन्हें संभालने के लिए कैलेंडर मिलता है।',
    platforms: 'यह Android व iOS ऐप और वेबसाइट पर एक ही खाते से चलता है, अंग्रेज़ी, हिन्दी और मराठी में।',
    customers: 'ग्राहकों के लिए',
    stores: 'स्टोर के लिए',
    browse: 'स्टोर देखें',
    customerSteps: [
      {
        alt: 'होम स्क्रीन, जिसमें स्टोर के प्रकार और उनके सबसे अच्छी रेटिंग वाले स्टोर हैं',
        title: 'स्टोर ढूँढें',
        text: 'होम पर स्टोर उनकी चीज़ों या सेवाओं के हिसाब से (बेकरी, दर्ज़ी, इलेक्ट्रीशियन…) दिखते हैं, सबसे अच्छी रेटिंग वाले पहले। शुरू करने के लिए बुक करें दबाएँ।',
      },
      {
        alt: 'डैशबोर्ड, जिसमें एक स्टोर चुना है और हर समय पर बुक हुए लोगों की गिनती है',
        title: 'ऐसा समय चुनें जब भीड़ न हो',
        text: 'दिन चुनें और देखें कि हर समय पर पहले से कितने लोग (या ऑर्डर) हैं। भरे हुए समय पर निशान होता है, ताकि आप भीड़ से बच सकें।',
      },
      {
        alt: 'स्टोर के प्रोडक्ट, दाम और प्लस/माइनस बटन के साथ',
        title: 'प्रोडक्ट या सेवाएँ चुनें',
        text: 'जो चाहिए, गिनती के साथ जोड़ें। बुक करने से पहले दाम और कुल रकम दिखती है।',
      },
      {
        alt: 'बुकिंग फ़ॉर्म, जिसमें पोर्टर ऑर्डर और सेव किया डिलीवरी पता है',
        title: 'बताएँ कि आपको कैसे चाहिए',
        text: 'टेबल बुक करें, खुद ले जाएँ, पोर्टर से मँगवाएँ, अपॉइंटमेंट लें या घर पर बुलाएँ। डिलीवरी और घर पर बुलाने के लिए सेव किया पता चुनें या नया लिखें।',
      },
      {
        alt: 'सूचनाओं का पैनल, जिसमें नई सूचनाएँ अलग दिखती हैं',
        title: 'हर ख़बर पाएँ',
        text: 'स्टोर आपका अनुरोध स्वीकार या अस्वीकार करे, तो घंटी बताती है। बाद में अपनी विज़िट को रेट करें, और शुरू होने से पहले रिमाइंडर पाएँ।',
      },
    ],
    storeSteps: [
      {
        alt: 'स्टोर का डैशबोर्ड, महीने के कैलेंडर और आज की बुकिंग के साथ',
        title: 'अपना दिन एक नज़र में देखें',
        text: 'कैलेंडर दिखाता है कि हर दिन कितना व्यस्त है, और नीचे आज के अनुरोध। एक टैप में स्वीकार या अस्वीकार करें, या Ghoomyo को अपने आप स्वीकार करने दें।',
      },
      {
        alt: 'स्टोर सेटिंग्स, जिसमें स्टोर का प्रकार, कैटेगरी, सीमाएँ और डार्क स्टोर स्विच है',
        title: 'अपने स्टोर को अपने तरीके से सेट करें',
        text: 'चुनें कि आप प्रोडक्ट बेचते हैं या सेवाएँ देते हैं, आपकी कैटेगरी, खुलने का समय, हर घंटे कितने लोग, और क्या आप सिर्फ़ डिलीवरी वाले (डार्क) स्टोर हैं।',
      },
      {
        alt: 'स्टोर के प्रोडक्ट की सूची, दाम के साथ',
        title: 'जो देते हैं, उसकी सूची बनाएँ',
        text: 'प्रोडक्ट या सेवाएँ दाम, फ़ोटो और सीमाओं के साथ जोड़ें। ग्राहक बुक करते समय इन्हें चुनते हैं, ताकि आपको ठीक पता हो कि क्या तैयार करना है।',
      },
    ],
  },
  mr: {
    intro:
      'Ghoomyo जवळच्या स्टोअरमध्ये जाणे सोपे करते. ग्राहक पाहतात की स्टोअरमध्ये किती गर्दी आहे, वेळ बुक करतात, आणि निवडतात की स्वतः जायचे, सामान घेऊन जायचे, डिलिव्हरी मागवायची की कोणाला घरी बोलवायचे. स्टोअरना विनंत्यांची स्पष्ट यादी आणि त्या सांभाळण्यासाठी कॅलेंडर मिळते.',
    platforms: 'हे Android व iOS ॲपमध्ये आणि वेबसाइटवर एकाच खात्याने चालते, इंग्रजी, हिंदी आणि मराठीत.',
    customers: 'ग्राहकांसाठी',
    stores: 'स्टोअरसाठी',
    browse: 'स्टोअर पाहा',
    customerSteps: [
      {
        alt: 'होम स्क्रीन, ज्यात स्टोअरचे प्रकार आणि त्यांची सर्वात चांगले रेटिंग असलेली स्टोअर आहेत',
        title: 'स्टोअर शोधा',
        text: 'होम वर स्टोअर ते काय देतात त्यानुसार (बेकरी, शिंपी, इलेक्ट्रिशियन…) दिसतात, सर्वात चांगले रेटिंग असलेली आधी. सुरू करण्यासाठी बुक करा दाबा.',
      },
      {
        alt: 'डॅशबोर्ड, ज्यात एक स्टोअर निवडले आहे आणि प्रत्येक वेळेवर बुक झालेल्या लोकांची संख्या आहे',
        title: 'गर्दी नसलेली वेळ निवडा',
        text: 'दिवस निवडा आणि पाहा की प्रत्येक वेळेवर आधीच किती लोक (किंवा ऑर्डर) आहेत. भरलेल्या वेळांवर खूण असते, म्हणजे तुम्ही गर्दी टाळू शकता.',
      },
      {
        alt: 'स्टोअरची उत्पादने, किंमती आणि प्लस/मायनस बटणांसह',
        title: 'उत्पादने किंवा सेवा निवडा',
        text: 'जे हवे ते संख्येसह जोडा. बुक करण्याआधी किंमती आणि एकूण रक्कम दिसते.',
      },
      {
        alt: 'बुकिंग फॉर्म, ज्यात पोर्टर ऑर्डर आणि सेव्ह केलेला डिलिव्हरी पत्ता आहे',
        title: 'तुम्हाला कसे हवे ते सांगा',
        text: 'टेबल बुक करा, स्वतः घेऊन जा, पोर्टरने मागवा, अपॉइंटमेंट घ्या किंवा घरी बोलवा. डिलिव्हरी आणि घरी बोलवण्यासाठी सेव्ह केलेला पत्ता निवडा किंवा नवीन लिहा.',
      },
      {
        alt: 'सूचनांचे पॅनल, ज्यात नवीन सूचना वेगळ्या दिसतात',
        title: 'प्रत्येक बातमी मिळवा',
        text: 'स्टोअरने तुमची विनंती स्वीकारली किंवा नाकारली की घंटी सांगते. नंतर तुमच्या भेटीला रेटिंग द्या, आणि सुरू होण्याआधी रिमाइंडर मिळवा.',
      },
    ],
    storeSteps: [
      {
        alt: 'स्टोअरचा डॅशबोर्ड, महिन्याच्या कॅलेंडर आणि आजच्या बुकिंगसह',
        title: 'तुमचा दिवस एका नजरेत पाहा',
        text: 'कॅलेंडर दाखवते की प्रत्येक दिवस किती व्यस्त आहे, आणि खाली आजच्या विनंत्या. एका टॅपमध्ये स्वीकारा किंवा नाकारा, किंवा Ghoomyo ला आपोआप स्वीकारू द्या.',
      },
      {
        alt: 'स्टोअर सेटिंग्ज, ज्यात स्टोअरचा प्रकार, श्रेणी, मर्यादा आणि डार्क स्टोअर स्विच आहे',
        title: 'तुमचे स्टोअर तुमच्या पद्धतीने सेट करा',
        text: 'तुम्ही उत्पादने विकता की सेवा देता, तुमची श्रेणी, उघडण्याची वेळ, दर तासाला किती लोक, आणि तुम्ही फक्त डिलिव्हरी करणारे (डार्क) स्टोअर आहात का, ते निवडा.',
      },
      {
        alt: 'स्टोअरच्या उत्पादनांची यादी, किंमतींसह',
        title: 'तुम्ही काय देता त्याची यादी करा',
        text: 'उत्पादने किंवा सेवा किंमती, फोटो आणि मर्यादांसह जोडा. ग्राहक बुक करताना त्या निवडतात, म्हणजे तुम्हाला नक्की काय तयार करायचे ते कळते.',
      },
    ],
  },
};

const withImages = (texts: StepText[], images: number[]): Step[] =>
  texts.map((text, i) => ({ ...text, image: images[i] }));

function Steps({ steps }: { steps: Step[] }) {
  const theme = useTheme();
  return (
    <View style={styles.steps}>
      {steps.map((step, i) => (
        <View key={step.image} style={styles.step}>
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
  const { t, language } = useT();
  const copy = COPY[language];
  return (
    <Screen>
      <AppHeader title={t('info.aboutTitle')} />
      <ThemedText>{copy.intro}</ThemedText>
      <ThemedText themeColor="textSecondary">{copy.platforms}</ThemedText>
      <ThemedText type="subtitle" style={styles.section} accessibilityRole="header">
        {copy.customers}
      </ThemedText>
      <Steps steps={withImages(copy.customerSteps, CUSTOMER_IMAGES)} />
      <ThemedText type="subtitle" style={styles.section} accessibilityRole="header">
        {copy.stores}
      </ThemedText>
      <Steps steps={withImages(copy.storeSteps, STORE_IMAGES)} />
      <View style={styles.actions}>
        <Button label={copy.browse} onPress={() => router.navigate('/home')} />
        <Button label={t('info.contact')} variant="secondary" onPress={() => router.navigate('/contact')} />
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
