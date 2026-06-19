
import { decode } from 'base64-arraybuffer';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Appliances',
  'Mobile',
  'Vehicle',
  'Other',
];

const GEMINI_API_KEY =
  Constants.expoConfig?.extra?.geminiApiKey ||
  Constants.manifest?.extra?.geminiApiKey ||
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  '';

const GEMINI_MODEL = 'gemini-2.5-flash';

const setupNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('warranty-reminders', {
    name: 'Warranty Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2D5BE3',
  });
};

const isRemoteUrl = (uri: string) => {
  return uri.startsWith('http://') || uri.startsWith('https://');
};

const getImageExtension = (uri: string) => {
  const cleanUri = uri.split('?')[0];
  let ext = cleanUri.split('.').pop()?.toLowerCase() || 'jpg';

  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    ext = 'jpg';
  }

  if (ext === 'jpeg') {
    ext = 'jpg';
  }

  return ext;
};

const getMimeType = (uri: string) => {
  const ext = getImageExtension(uri);

  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';

  return 'image/jpeg';
};

const normalizeDateToDash = (date: string) => {
  return date.trim().replace(/\//g, '-');
};

const formatDateInput = (text: string) => {
  const digits = text.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};

const parseDateDMY = (date: string): Date | null => {
  const normalizedDate = normalizeDateToDash(date);
  const parts = normalizedDate.split('-');

  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (!day || !month || !year) return null;

  const parsed = new Date(year, month - 1, day);

  const isValid =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;

  return isValid ? parsed : null;
};

export default function AddWarranty() {
  const [editLoading, setEditLoading] = useState(false);
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [shopName, setShopName] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [originalNotificationIds, setOriginalNotificationIds] = useState<string[]>([]);

  const params = useLocalSearchParams();
  const editId = params.editId as string | undefined;
  const isEditMode = Boolean(editId);

  useEffect(() => {
    setupNotificationChannel();
  }, []);

  useEffect(() => {
    if (!editId) return;

    const loadWarrantyForEdit = async () => {
      setEditLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        setEditLoading(false);
        Alert.alert('Login Required', 'Pehle login karo.');
        router.replace('/login' as any);
        return;
      }

      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('id', editId)
        .eq('user_id', user.id)
        .single();

      setEditLoading(false);

      if (error || !data) {
        Alert.alert('Error', 'Edit warranty nahi mili.');
        router.replace('/' as any);
        return;
      }

      setProductName(data.product_name || '');
      setBrand(data.brand || '');
      setCategory(data.category || '');
      setPurchaseDate(normalizeDateToDash(data.purchase_date || ''));
      setExpiryDate(normalizeDateToDash(data.expiry_date || ''));
      setShopName(data.shop_name || '');
      setPrice(data.price ? String(data.price) : '');
      setNotes(data.notes || '');
      setPhoto(data.image_url || null);
      setPhotoBase64(null);

      setOriginalNotificationIds(
        Array.isArray(data.notification_ids) ? data.notification_ids : []
      );
    };

    loadWarrantyForEdit();
  }, [editId]);

  const uploadImageToSupabase = async (
    imageUri: string,
    userId: string
  ): Promise<string | null> => {
    try {
      const fileExt = getImageExtension(imageUri);
      const contentType = getMimeType(imageUri);

      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error } = await supabase.storage
        .from('warranty-images')
        .upload(filePath, decode(base64), {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error('UPLOAD ERROR:', error);
        return null;
      }

      const { data } = supabase.storage
        .from('warranty-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      console.error('IMAGE UPLOAD ERROR:', err);
      return null;
    }
  };

  const analyzeWarrantyPhoto = async (
    imageUri: string,
    base64Data: string | null
  ) => {
    if (!base64Data) {
      Alert.alert(
        'Naya Photo Chahiye',
        'AI auto-fill ke liye naya photo lo ya gallery se pick karo.'
      );
      return;
    }

    if (!GEMINI_API_KEY) {
      Alert.alert(
        'API Key Missing',
        'Gemini API key app.config.js ya .env mein set nahi hai. Expo restart karo: npx expo start -c'
      );
      return;
    }

    setAiLoading(true);

    try {
      const mediaType = getMimeType(imageUri);

      const apiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: mediaType,
                      data: base64Data,
                    },
                  },
                  {
                    text: `Analyze this warranty card or receipt image.

Return ONLY valid JSON.
Do not add markdown.
Do not add explanation.
Dates must be in DD-MM-YYYY format only.

{
  "productName": "",
  "brand": "",
  "category": "Electronics|Furniture|Appliances|Mobile|Vehicle|Other",
  "shopName": "",
  "price": "",
  "purchaseDate": "DD-MM-YYYY",
  "expiryDate": "DD-MM-YYYY"
}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
            },
          }),
        }
      );

      if (!apiResponse.ok) {
        const errText = await apiResponse.text();
        throw new Error(`Gemini API error: ${apiResponse.status} ${errText}`);
      }

      const data = await apiResponse.json();

      const text = Array.isArray(data?.candidates)
        ? data.candidates
            .flatMap((c: any) => c?.content?.parts ?? [])
            .map((p: any) => p?.text ?? '')
            .join('\n')
            .trim()
        : '';

      const cleaned = text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const extracted = JSON.parse(cleaned);

      if (extracted.productName) setProductName(String(extracted.productName));
      if (extracted.brand) setBrand(String(extracted.brand));

      if (extracted.category && CATEGORIES.includes(String(extracted.category))) {
        setCategory(String(extracted.category));
      }

      if (extracted.shopName) setShopName(String(extracted.shopName));
      if (extracted.price) setPrice(String(extracted.price));

      if (extracted.purchaseDate) {
        setPurchaseDate(formatDateInput(String(extracted.purchaseDate)));
      }

      if (extracted.expiryDate) {
        setExpiryDate(formatDateInput(String(extracted.expiryDate)));
      }

      Alert.alert(
        'AI Done',
        'AI ne fields fill kar di hain. Check karo aur zaroorat ho toh correct karo.'
      );
    } catch (error: any) {
      console.error('AI Error:', error);
      Alert.alert('AI Error', error?.message || 'AI data extract nahi kar saki.');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePickerResult = (asset: ImagePicker.ImagePickerAsset) => {
    setPhoto(asset.uri);
    setPhotoBase64(asset.base64 ?? null);

    Alert.alert(
      'AI Se Fill Karein?',
      'AI warranty details automatically fill karega.',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Haan',
          onPress: () => analyzeWarrantyPhoto(asset.uri, asset.base64 ?? null),
        },
      ]
    );
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Chahiye', 'Camera permission do.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      handlePickerResult(result.assets[0]);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Chahiye', 'Gallery permission do.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      handlePickerResult(result.assets[0]);
    }
  };

  const sendTestNotification = async () => {
    try {
      await setupNotificationChannel();

      const { status } = await Notifications.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Phone settings se notification permission allow karo.'
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'WarrantyWallet Test Notification',
          body: 'Notification system sahi kaam kar raha hai ✅',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
          repeats: false,
          channelId: 'warranty-reminders',
        } as any,
      });

      Alert.alert('Done', '2 seconds mein test notification show hogi.');
    } catch (error: any) {
      Alert.alert(
        'Notification Error',
        error?.message || 'Test notification nahi chali.'
      );
    }
  };

  const cancelScheduledNotifications = async (ids: string[]) => {
    for (const id of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    }
  };

  const scheduleWarrantyNotifications = async (
    name: string,
    date: string
  ): Promise<string[]> => {
    const ids: string[] = [];

    try {
      const { status } = await Notifications.requestPermissionsAsync();

      if (status !== 'granted') return ids;

      const expiry = parseDateDMY(date);

      if (!expiry) return ids;

      expiry.setHours(9, 0, 0, 0);

      const reminderDays = [30, 7, 1, 0];
      const now = new Date();

      for (const dayBefore of reminderDays) {
        const reminderDate = new Date(expiry);
        reminderDate.setDate(reminderDate.getDate() - dayBefore);

        if (reminderDate <= now) continue;

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title:
              dayBefore === 0
                ? 'Warranty aaj expire ho rahi hai!'
                : `Warranty ${dayBefore} din mein expire hogi`,
            body: `${name} ki warranty ka reminder`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
            channelId: 'warranty-reminders',
          } as any,
        });

        ids.push(notificationId);
      }
    } catch (error) {
      console.error('Notification scheduling error:', error);
    }

    return ids;
  };

  const persistWarranty = async (
    userId: string,
    imageUrl: string | null,
    notificationIds: string[]
  ) => {
    const cleanPurchaseDate = normalizeDateToDash(purchaseDate);
    const cleanExpiryDate = normalizeDateToDash(expiryDate);

    const cleanPrice = price.trim()
      ? Number(price.replace(/[^0-9.]/g, ''))
      : null;

    const payload = {
      user_id: userId,
      product_name: productName.trim(),
      brand: brand.trim(),
      category,
      purchase_date: cleanPurchaseDate,
      expiry_date: cleanExpiryDate,
      shop_name: shopName.trim(),
      price: cleanPrice,
      image_url: imageUrl,
      notes: notes.trim(),
      notification_ids: notificationIds,
    };

    if (isEditMode) {
      const { error } = await supabase
        .from('warranties')
        .update(payload)
        .eq('id', editId)
        .eq('user_id', userId);

      if (error) throw error;
    } else {
      const { error } = await supabase.from('warranties').insert([payload]);

      if (error) throw error;
    }
  };

  const saveWarrantyAfterImageDecision = async (
    userId: string,
    finalImageUrl: string | null
  ) => {
    try {
      if (isEditMode && originalNotificationIds.length > 0) {
        await cancelScheduledNotifications(originalNotificationIds);
      }

      const notificationIds = await scheduleWarrantyNotifications(
        productName.trim(),
        expiryDate.trim()
      );

      await persistWarranty(userId, finalImageUrl, notificationIds);

      Alert.alert(
        'Success',
        isEditMode ? 'Warranty update ho gayi.' : 'Warranty save ho gayi.'
      );

      router.replace('/' as any);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error?.message || 'Save nahi hua.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Product name zaroori hai.');
      return;
    }

    if (!purchaseDate.trim() || !expiryDate.trim()) {
      Alert.alert(
        'Error',
        'Purchase date aur expiry date zaroori hain. Format: DD-MM-YYYY'
      );
      return;
    }

    const cleanPurchaseDate = normalizeDateToDash(purchaseDate);
    const cleanExpiryDate = normalizeDateToDash(expiryDate);
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;

    if (!dateRegex.test(cleanPurchaseDate) || !dateRegex.test(cleanExpiryDate)) {
      Alert.alert(
        'Date Format Galat',
        'Date format DD-MM-YYYY hona chahiye. Jaise: 15-05-2026'
      );
      return;
    }

    if (!parseDateDMY(cleanPurchaseDate) || !parseDateDMY(cleanExpiryDate)) {
      Alert.alert('Invalid Date', 'Date valid honi chahiye.');
      return;
    }

    setSaving(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        setSaving(false);
        Alert.alert('Login Required', 'Pehle login karo.');
        router.replace('/login' as any);
        return;
      }

      let finalImageUrl: string | null = null;

      if (photo) {
        if (isRemoteUrl(photo)) {
          finalImageUrl = photo;
        } else {
          const uploaded = await uploadImageToSupabase(photo, user.id);

          if (!uploaded) {
            Alert.alert(
              'Image Upload Failed',
              'Image Supabase mein upload nahi hui. Kya aap warranty bina image ke save karna chahti hain?',
              [
                {
                  text: 'Nahi',
                  style: 'cancel',
                  onPress: () => setSaving(false),
                },
                {
                  text: 'Haan, Save Karo',
                  onPress: () => saveWarrantyAfterImageDecision(user.id, null),
                },
              ]
            );

            return;
          }

          finalImageUrl = uploaded;
        }
      }

      await saveWarrantyAfterImageDecision(user.id, finalImageUrl);
    } catch (error: any) {
      console.error('Save error:', error);
      setSaving(false);
      Alert.alert('Error', error?.message || 'Save nahi hua.');
    }
  };

  if (editLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D5BE3" />
        <Text style={styles.loadingText}>Warranty load ho rahi hai...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/' as any)}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerText}>
            {isEditMode ? 'Edit Warranty' : 'Add New Warranty'}
          </Text>

          <Text style={styles.headerSub}>AI auto-fill is available</Text>
        </View>

        <View style={styles.form}>
          <TouchableOpacity
            style={styles.testNotificationBtn}
            onPress={sendTestNotification}
          >
            <Text style={styles.testNotificationBtnText}>
              🔔 Send Test Notification
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Warranty Card / Receipt Photo</Text>

          {photo ? (
            <View>
              <Image source={{ uri: photo }} style={styles.photoPreview} />

              {photoBase64 ? (
                <TouchableOpacity
                  style={styles.aiBtn}
                  onPress={() => analyzeWarrantyPhoto(photo, photoBase64)}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.aiBtnText}>🤖 AI Se Auto-Fill Karo</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.aiDisabledBtn}>
                  <Text style={styles.aiDisabledText}>
                    AI: Naya photo lo auto-fill ke liye
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.removePhoto}
                onPress={() => {
                  setPhoto(null);
                  setPhotoBase64(null);
                }}
              >
                <Text style={styles.removePhotoText}>Photo Hatao</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Text style={styles.photoBtnText}>📷 Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <Text style={styles.photoBtnText}>🖼️ Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            value={productName}
            onChangeText={setProductName}
            placeholder="e.g. Samsung TV"
          />

          <Text style={styles.label}>Brand</Text>
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Samsung"
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryBtn,
                  category === cat && styles.categoryBtnActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryBtnText,
                    category === cat && styles.categoryBtnTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Purchase Date * (DD-MM-YYYY)</Text>
          <TextInput
            style={styles.input}
            value={purchaseDate}
            onChangeText={(text) => setPurchaseDate(formatDateInput(text))}
            placeholder="DD-MM-YYYY"
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.label}>Expiry Date * (DD-MM-YYYY)</Text>
          <TextInput
            style={styles.input}
            value={expiryDate}
            onChangeText={(text) => setExpiryDate(formatDateInput(text))}
            placeholder="DD-MM-YYYY"
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.label}>Shop Name</Text>
          <TextInput
            style={styles.input}
            value={shopName}
            onChangeText={setShopName}
            placeholder="e.g. Carrefour"
          />

          <Text style={styles.label}>Price</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 5000"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Update Warranty' : 'Save Warranty'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
  },

  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },

  header: {
    backgroundColor: '#2D5BE3',
    padding: 30,
    paddingTop: 60,
    alignItems: 'center',
  },

  backBtn: {
    position: 'absolute',
    left: 16,
    top: 60,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  backBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },

  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },

  headerSub: {
    fontSize: 13,
    color: '#BDD0FF',
    marginTop: 4,
  },

  form: {
    padding: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 16,
    color: '#333',
  },

  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    fontSize: 15,
    color: '#222',
  },

  notesInput: {
    height: 90,
  },

  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },

  photoBtn: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D5BE3',
  },

  photoBtnText: {
    fontSize: 15,
  },

  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginBottom: 10,
  },

  aiBtn: {
    backgroundColor: '#7C3AED',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },

  aiBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },

  aiDisabledBtn: {
    backgroundColor: '#E5E7EB',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },

  aiDisabledText: {
    color: '#6B7280',
    fontSize: 13,
  },

  removePhoto: {
    backgroundColor: '#FFE5E5',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  removePhotoText: {
    color: '#FF4444',
    fontWeight: 'bold',
  },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },

  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
  },

  categoryBtnActive: {
    backgroundColor: '#2D5BE3',
    borderColor: '#2D5BE3',
  },

  categoryBtnText: {
    fontSize: 13,
    color: '#555',
  },

  categoryBtnTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },

  saveButton: {
    backgroundColor: '#2D5BE3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 50,
  },

  saveButtonDisabled: {
    backgroundColor: '#93B4F5',
  },

  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  testNotificationBtn: {
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },

  testNotificationBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
});