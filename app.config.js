import 'dotenv/config';

export default {
  expo: {
    name: "WarrantyWallet",
    slug: "WarrantyWallet",

    extra: {
      geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    },
  },
};