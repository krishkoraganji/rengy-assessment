import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const CartScreen = ({ navigation }) => {
  const [cartItems, setCartItems] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  useEffect(() => {
    calculateTotals();
  }, [cartItems]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCartData(),
        loadFavorites(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load cart data');
    } finally {
      setLoading(false);
    }
  };

  const loadCartData = async () => {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      if (cartData) {
        const cart = JSON.parse(cartData);
        setCartItems(cart);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      throw error;
    }
  };

  const loadFavorites = async () => {
    try {
      const favoritesData = await AsyncStorage.getItem('favorites');
      if (favoritesData) {
        const favs = JSON.parse(favoritesData);
        setFavorites(favs);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      throw error;
    }
  };

  const calculateTotals = () => {
    let itemsCount = 0;
    let priceTotal = 0;

    cartItems.forEach(item => {
      itemsCount += item.quantity || 1;
      const discountedPrice = (item.price * (100 - (item.discountPercentage || 0))) / 100;
      priceTotal += discountedPrice * (item.quantity || 1);
    });

    setTotalItems(itemsCount);
    setTotalPrice(priceTotal);
  };

  const updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(id);
      return;
    }

    try {
      const updatedCart = cartItems.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      );
      
      setCartItems(updatedCart);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  const removeItem = async (id) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedCart = cartItems.filter(item => item.id !== id);
              setCartItems(updatedCart);
              await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  const moveToFavorites = async (item) => {
    try {
      const favoritesData = await AsyncStorage.getItem('favorites');
      let favoritesList = favoritesData ? JSON.parse(favoritesData) : [];
      
      const exists = favoritesList.find(fav => fav.id === item.id);
      if (!exists) {
        const itemToAdd = {
          ...item,
          quantity: 1,
          addedAt: new Date().toISOString(),
        };
        
        favoritesList.push(itemToAdd);
        await AsyncStorage.setItem('favorites', JSON.stringify(favoritesList));
        setFavorites(favoritesList);
        
        const updatedCart = cartItems.filter(cartItem => cartItem.id !== item.id);
        setCartItems(updatedCart);
        await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
        
        Alert.alert('Success', 'Item moved to favorites');
      } else {
        Alert.alert('Info', 'Item already in favorites');
      }
    } catch (error) {
      console.error('Error moving to favorites:', error);
      Alert.alert('Error', 'Failed to move item to favorites');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleCheckout = () => {
    const tax = totalPrice * 0.1;
    const finalTotal = totalPrice + tax;
    
    Alert.alert('Checkout', 
      `Items: ${totalItems}\nSubtotal: $${totalPrice.toFixed(2)}\nTax: $${tax.toFixed(2)}\n\nTotal: $${finalTotal.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed to Payment', 
          onPress: () => {
            Alert.alert('Success', 'Order placed successfully!');
            clearCart();
          }
        },
      ]
    );
  };

  const clearCart = async () => {
    try {
      await AsyncStorage.removeItem('cart');
      setCartItems([]);
      setTotalItems(0);
      setTotalPrice(0);
    } catch (error) {
      console.error('Error clearing cart:', error);
      Alert.alert('Error', 'Failed to clear cart');
    }
  };

  const renderCartItem = ({ item }) => {
    const discountedPrice = (item.price * (100 - (item.discountPercentage || 0))) / 100;
    const itemTotal = discountedPrice * (item.quantity || 1);

    return (
      <View style={styles.cartItem}>
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.itemImage}
        />
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title || 'Unnamed Product'}
          </Text>
          <Text style={styles.itemBrand}>{item.brand || 'No Brand'}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.itemPrice}>${discountedPrice.toFixed(2)}</Text>
            {(item.discountPercentage || 0) > 0 && (
              <Text style={styles.originalPrice}>
                ${item.price.toFixed(2)}
              </Text>
            )}
          </View>
          
          <View style={styles.actionContainer}>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={[styles.quantityButton, (item.quantity || 1) <= 1 && styles.disabledButton]}
                onPress={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                disabled={(item.quantity || 1) <= 1}
              >
                <Icon name="remove" size={20} color={(item.quantity || 1) <= 1 ? '#999' : '#FF6B6B'} />
              </TouchableOpacity>
              <View style={styles.quantityValue}>
                <Text style={styles.quantityText}>{item.quantity || 1}</Text>
              </View>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
              >
                <Icon name="add" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.itemTotal}>${itemTotal.toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => moveToFavorites(item)}
          >
            <Icon name="favorite-border" size={22} color="#FF6B6B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => removeItem(item.id)}
          >
            <Icon name="delete" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLoading = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    </SafeAreaView>
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Icon name="shopping-cart" size={80} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptyText}>
        Add some products to your cart
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => navigation.navigate('ProductsTab')}
      >
        <Text style={styles.shopButtonText}>Shop Now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartWithItems = () => (
    <>
      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
        ListFooterComponent={
          <View style={styles.footerSpace} />
        }
      />
      
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items ({totalItems})</Text>
          <Text style={styles.summaryValue}>${totalPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>$0.00</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax (10%)</Text>
          <Text style={styles.summaryValue}>
            ${(totalPrice * 0.1).toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            ${(totalPrice * 1.1).toFixed(2)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          <Icon name="arrow-forward" size={22} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.clearCartButton}
          onPress={() => {
            Alert.alert(
              'Clear Cart',
              'Are you sure you want to clear all items from cart?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: clearCart
                },
              ]
            );
          }}
        >
          <Text style={styles.clearCartText}>Clear Cart</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="shopping-cart" size={26} color="#FF6B6B" />
          <Text style={styles.statNumber}>{totalItems}</Text>
          <Text style={styles.statLabel}>Cart Items</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="favorite" size={26} color="#FF6B6B" />
          <Text style={styles.statNumber}>{favorites.length}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="attach-money" size={26} color="#FF6B6B" />
          <Text style={styles.statNumber}>${totalPrice.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Subtotal</Text>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.contentArea}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      ) : cartItems.length === 0 ? (
        renderEmptyCart()
      ) : (
        renderCartWithItems()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 12,
  },
  countBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  countText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  footerSpace: {
    height: 20,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  itemBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8E8',
    borderRadius: 20,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
  },
  quantityValue: {
    minWidth: 40,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemActions: {
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  checkoutButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 25,
    marginBottom: 12,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  clearCartButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    alignItems: 'center',
  },
  clearCartText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
});

export default CartScreen;