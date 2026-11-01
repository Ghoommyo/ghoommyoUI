import { defineMessages } from "../define";

/** Words many screens share: dates, weekdays, order types, counts and the catalog words. */
export const shared = defineMessages({
  "date.midnight": { en: "12:00 AM (midnight)", hi: "रात 12:00 (आधी रात)", mr: "रात्री 12:00 (मध्यरात्र)" },
  "date.justNow": { en: "just now", hi: "अभी", mr: "आत्ताच" },
  "date.minutesAgo": { en: "{count} min ago", hi: "{count} मिनट पहले", mr: "{count} मिनिटांपूर्वी" },
  "date.hoursAgo": { en: "{count} h ago", hi: "{count} घंटे पहले", mr: "{count} तासांपूर्वी" },
  "date.daysAgo": { en: "{count} d ago", hi: "{count} दिन पहले", mr: "{count} दिवसांपूर्वी" },
  "date.today": { en: "today", hi: "आज", mr: "आज" },

  "day.mon": { en: "Mon", hi: "सोम", mr: "सोम" },
  "day.tue": { en: "Tue", hi: "मंगल", mr: "मंगळ" },
  "day.wed": { en: "Wed", hi: "बुध", mr: "बुध" },
  "day.thu": { en: "Thu", hi: "गुरु", mr: "गुरु" },
  "day.fri": { en: "Fri", hi: "शुक्र", mr: "शुक्र" },
  "day.sat": { en: "Sat", hi: "शनि", mr: "शनि" },
  "day.sun": { en: "Sun", hi: "रवि", mr: "रवि" },
  "day.monLong": { en: "Monday", hi: "सोमवार", mr: "सोमवार" },
  "day.tueLong": { en: "Tuesday", hi: "मंगलवार", mr: "मंगळवार" },
  "day.wedLong": { en: "Wednesday", hi: "बुधवार", mr: "बुधवार" },
  "day.thuLong": { en: "Thursday", hi: "गुरुवार", mr: "गुरुवार" },
  "day.friLong": { en: "Friday", hi: "शुक्रवार", mr: "शुक्रवार" },
  "day.satLong": { en: "Saturday", hi: "शनिवार", mr: "शनिवार" },
  "day.sunLong": { en: "Sunday", hi: "रविवार", mr: "रविवार" },

  "slots.unitDay": { en: "day", hi: "दिन", mr: "दिवस" },
  "slots.unitHour": { en: "hour", hi: "घंटा", mr: "तास" },
  "slots.unitHalfHour": { en: "half hour", hi: "आधा घंटा", mr: "अर्धा तास" },
  "slots.everyDay": { en: "Every day", hi: "हर दिन", mr: "दररोज" },

  "orderType.table": { en: "Book table", hi: "टेबल बुक करें", mr: "टेबल बुक करा" },
  "orderType.pickup": { en: "Pickup", hi: "पिकअप", mr: "पिकअप" },
  "orderType.porter": { en: "Porter", hi: "पोर्टर", mr: "पोर्टर" },
  "orderType.appointment": { en: "Book appointment", hi: "अपॉइंटमेंट बुक करें", mr: "अपॉइंटमेंट बुक करा" },
  "orderType.homeVisit": { en: "Book home visit", hi: "घर पर बुलाएँ", mr: "घरी बोलवा" },

  "count.orders": { en: "{count} order|{count} orders", hi: "{count} ऑर्डर|{count} ऑर्डर", mr: "{count} ऑर्डर|{count} ऑर्डर" },
  "count.visitors": { en: "{count} visitor|{count} visitors", hi: "{count} विज़िटर|{count} विज़िटर", mr: "{count} भेट देणारा|{count} भेट देणारे" },
  "count.ordersWord": { en: "orders", hi: "ऑर्डर", mr: "ऑर्डर" },
  "count.visitorsWord": { en: "visitors", hi: "विज़िटर", mr: "भेट देणारे" },

  "catalog.Products": { en: "Products", hi: "प्रोडक्ट", mr: "उत्पादने" },
  "catalog.products": { en: "products", hi: "प्रोडक्ट", mr: "उत्पादने" },
  "catalog.Product": { en: "Product", hi: "प्रोडक्ट", mr: "उत्पादन" },
  "catalog.product": { en: "product", hi: "प्रोडक्ट", mr: "उत्पादन" },
  "catalog.Services": { en: "Services", hi: "सेवाएँ", mr: "सेवा" },
  "catalog.services": { en: "services", hi: "सेवाएँ", mr: "सेवा" },
  "catalog.Service": { en: "Service", hi: "सेवा", mr: "सेवा" },
  "catalog.service": { en: "service", hi: "सेवा", mr: "सेवा" },

  "status.accepted": { en: "✓ Accepted", hi: "✓ स्वीकार", mr: "✓ स्वीकारले" },
  "status.pending": { en: "◦ Pending", hi: "◦ बाकी", mr: "◦ प्रलंबित" },
  "status.rejected": { en: "✕ Rejected", hi: "✕ अस्वीकार", mr: "✕ नाकारले" },

  "hint.readOnly": { en: "Can't be changed yet — the server doesn't support it.", hi: "अभी बदला नहीं जा सकता — सर्वर इसे सपोर्ट नहीं करता।", mr: "अजून बदलता येत नाही — सर्व्हर याला सपोर्ट करत नाही." },
  "hint.inactiveStore": {
    en: "Your store is inactive: customers can't see it or book it. You can still manage your bookings and settings. Contact support to reactivate it.",
    hi: "आपका स्टोर निष्क्रिय है: ग्राहक इसे देख या बुक नहीं कर सकते। आप अब भी अपनी बुकिंग और सेटिंग्स संभाल सकते हैं। इसे फिर से चालू करने के लिए सपोर्ट से संपर्क करें।",
    mr: "तुमचे स्टोअर निष्क्रिय आहे: ग्राहक ते पाहू किंवा बुक करू शकत नाहीत. तुम्ही अजूनही तुमची बुकिंग आणि सेटिंग्ज सांभाळू शकता. ते पुन्हा सुरू करण्यासाठी सपोर्टशी संपर्क साधा.",
  },
  "hint.inactiveUser": {
    en: "Your account is inactive, so you can't submit or change booking requests. Contact support to reactivate it.",
    hi: "आपका खाता निष्क्रिय है, इसलिए आप बुकिंग अनुरोध भेज या बदल नहीं सकते। इसे फिर से चालू करने के लिए सपोर्ट से संपर्क करें।",
    mr: "तुमचे खाते निष्क्रिय आहे, त्यामुळे तुम्ही बुकिंग विनंती पाठवू किंवा बदलू शकत नाही. ते पुन्हा सुरू करण्यासाठी सपोर्टशी संपर्क साधा.",
  },

  "validation.storeNameRequired": { en: "Store name is required.", hi: "स्टोर का नाम ज़रूरी है।", mr: "स्टोअरचे नाव आवश्यक आहे." },
  "validation.storeNameChars": { en: "Use letters, numbers and spaces only.", hi: "सिर्फ़ अक्षर, अंक और स्पेस इस्तेमाल करें।", mr: "फक्त अक्षरे, अंक आणि स्पेस वापरा." },
  "validation.storeNameLength": { en: "Keep the store name under 60 characters.", hi: "स्टोर का नाम 60 अक्षरों से कम रखें।", mr: "स्टोअरचे नाव 60 अक्षरांपेक्षा कमी ठेवा." },
  "validation.emailRequired": { en: "Email is required.", hi: "ईमेल ज़रूरी है।", mr: "ईमेल आवश्यक आहे." },
  "validation.emailInvalid": { en: "Enter a valid email address.", hi: "सही ईमेल पता लिखें।", mr: "योग्य ईमेल पत्ता लिहा." },
  "validation.usernameRequired": { en: "Username is required.", hi: "यूज़रनेम ज़रूरी है।", mr: "युजरनेम आवश्यक आहे." },
  "validation.usernameLength": { en: "Username must be 2–40 characters.", hi: "यूज़रनेम 2–40 अक्षरों का होना चाहिए।", mr: "युजरनेम 2–40 अक्षरांचे असावे." },

  "error.generic": { en: "Something went wrong. Please try again.", hi: "कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।", mr: "काहीतरी चुकले. कृपया पुन्हा प्रयत्न करा." },
  "error.offline": { en: "Can't reach the server. Check your connection and try again.", hi: "सर्वर से कनेक्ट नहीं हो पा रहा। अपना इंटरनेट देखें और फिर से कोशिश करें।", mr: "सर्व्हरशी जोडता येत नाही. तुमचे इंटरनेट तपासा आणि पुन्हा प्रयत्न करा." },
  "error.shopsOnly": { en: "Only shops can sign in here. Places aren't supported on the web yet.", hi: "यहाँ सिर्फ़ दुकानें साइन इन कर सकती हैं। जगहें अभी वेब पर नहीं हैं।", mr: "इथे फक्त दुकाने साइन इन करू शकतात. ठिकाणे अजून वेबवर नाहीत." },
  "error.noStore": { en: "This store doesn't exist or is no longer taking bookings.", hi: "यह स्टोर मौजूद नहीं है या अब बुकिंग नहीं ले रहा।", mr: "हे स्टोअर अस्तित्वात नाही किंवा आता बुकिंग घेत नाही." },
  "home.otherStores": { en: "Other stores", hi: "अन्य स्टोर", mr: "इतर स्टोअर" },
});
