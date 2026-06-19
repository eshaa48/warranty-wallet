import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Warranty = {
  id: string;
  user_id?: string;
  product_name: string;
  brand?: string | null;
  category?: string | null;
  purchase_date?: string | null;
  expiry_date?: string | null;
  shop_name?: string | null;
  price?: string | number | null;
  image_url?: string | null;
  notes?: string | null;
  notification_ids?: string[] | null;
  created_at?: string | null;
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warranties, setWarranties] = useState<Warranty[]>([]);

  const loadWarranties = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        setLoading(false);
        setRefreshing(false);
        router.replace('/login' as any);
        return;
      }

      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setWarranties(data || []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Warranties load nahi hui.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadWarranties();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadWarranties();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login' as any);
  };

  const deleteWarranty = async (id: string) => {
    Alert.alert(
      'Delete Warranty',
      'Kya aap is warranty ko delete karna chahti hain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('warranties')
              .delete()
              .eq('id', id);

            if (error) {
              Alert.alert('Error', error.message);
              return;
            }

            loadWarranties();
          },
        },
      ]
    );
  };

  const viewDetails = (item: Warranty) => {
    Alert.alert(
      item.product_name || 'Warranty Details',
      `Brand: ${item.brand || 'N/A'}

Category: ${item.category || 'N/A'}

Purchase Date: ${item.purchase_date || 'N/A'}

Expiry Date: ${item.expiry_date || 'N/A'}

Shop: ${item.shop_name || 'N/A'}

Price: ${item.price || 'N/A'}

Notes: ${item.notes || 'N/A'}`
    );
  };

  const renderWarranty = ({ item }: { item: Warranty }) => {
    return (
      <View style={styles.card}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <View style={styles.noImageBox}>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <Text style={styles.productName}>{item.product_name}</Text>

          <Text style={styles.metaText}>
            {item.brand ? item.brand : 'No brand'} 
            {item.category ? ` • ${item.category}` : ''}
          </Text>

          <Text style={styles.dateText}>
            Expiry: {item.expiry_date || 'N/A'}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => viewDetails(item)}
            >
              <Text style={styles.actionText}>View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() =>
                router.push(`/add-warranty?editId=${item.id}` as any)
              }
            >
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteWarranty(item.id)}
            >
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D5BE3" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>WarrantyWallet</Text>
          <Text style={styles.subtitle}>Your saved warranties</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/add-warranty' as any)}
      >
        <Text style={styles.addButtonText}>+ Add New Warranty</Text>
      </TouchableOpacity>

      {warranties.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No warranties yet</Text>
          <Text style={styles.emptyText}>
            Add your first warranty card or receipt.
          </Text>
        </View>
      ) : (
        <FlatList
          data={warranties}
          keyExtractor={(item) => item.id}
          renderItem={renderWarranty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
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
    marginTop: 10,
    color: '#666',
  },

  header: {
    backgroundColor: '#2D5BE3',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#DCE6FF',
    fontSize: 14,
    marginTop: 4,
  },

  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },

  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  },

  addButton: {
    backgroundColor: '#2D5BE3',
    margin: 20,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },

  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E1E6F5',
  },

  cardImage: {
    width: '100%',
    height: 170,
    backgroundColor: '#EEE',
  },

  noImageBox: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF3FF',
  },

  noImageText: {
    color: '#777',
  },

  cardContent: {
    padding: 14,
  },

  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },

  metaText: {
    color: '#666',
    marginTop: 4,
  },

  dateText: {
    marginTop: 8,
    color: '#2D5BE3',
    fontWeight: 'bold',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  viewBtn: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  editBtn: {
    flex: 1,
    backgroundColor: '#2D5BE3',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  deleteBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  actionText: {
    color: 'white',
    fontWeight: 'bold',
  },

  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },

  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});