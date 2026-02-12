import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [filteredFavorites, setFilteredFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFavorites();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    filterAndSortFavorites();
  }, [favorites, searchQuery, sortOrder]);

  const loadFavorites = async () => {
    try {
      console.log('Loading favorites from AsyncStorage...');
      const favoritesData = await AsyncStorage.getItem('favorites');
      console.log('Favorites data:', favoritesData);
      
      if (favoritesData) {
        const favs = JSON.parse(favoritesData);
        console.log('Parsed favorites:', favs);
        setFavorites(favs);
        setFilteredFavorites(favs);
      } else {
        console.log('No favorites data found');
        setFavorites([]);
        setFilteredFavorites([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Error', 'Failed to load favorites');
      setLoading(false);
    }
  };

  const filterAndSortFavorites = () => {
    let result = [...favorites];
    
    if (searchQuery) {
      result = result.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (sortOrder === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOrder === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortOrder === 'newest') {
      result.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }
    
    setFilteredFavorites(result);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const handleSortChange = (order) => {
    setSortOrder(order);
  };

  const removeFromFavorites = async (id) => {
    Alert.alert(
      'Remove from Favorites',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedFavorites = favorites.filter(item => item.id !== id);
              await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavorites));
              setFavorites(updatedFavorites);
              Alert.alert('Success', 'Item removed from favorites');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  const addToCartFromFavorites = async (item) => {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      let cart = cartData ? JSON.parse(cartData) : [];
      
      const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingItemIndex >= 0) {
        cart[existingItemIndex].quantity += 1;
        Alert.alert('Info', 'Product quantity increased in cart');
      } else {
        cart.push({
          ...item,
          quantity: 1,
          addedAt: new Date().toISOString(),
        });
        Alert.alert('Success', 'Product added to cart');
      }
      
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to add product to cart');
    }
  };

  const renderFavoriteItem = ({ item }) => {
    const discountedPrice = (item.price * (100 - item.discountPercentage)) / 100;

    return (
      <View style={styles.favoriteItem}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ProductDetail', { product: item })}
          style={styles.imageContainer}
        >
          <Image 
            source={{ uri: item.thumbnail || item.images?.[0] }} 
            style={styles.itemImage} 
            
          />
        </TouchableOpacity>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.itemBrand}>{item.brand}</Text>
          
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating?.toFixed(1) || 'N/A'}</Text>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>${discountedPrice.toFixed(2)}</Text>
            {item.discountPercentage > 0 && (
              <Text style={styles.originalPrice}>
                ${item.price.toFixed(2)}
              </Text>
            )}
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => addToCartFromFavorites(item)}
            >
              <Icon name="shopping-cart" size={18} color="#fff" />
              <Text style={styles.buttonText}>Add to Cart</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFromFavorites(item.id)}
            >
              <Icon name="delete" size={18} color="#FF6B6B" />
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search favorites..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.sortContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'newest' && styles.activeSort]}
            onPress={() => handleSortChange('newest')}
          >
            <Text style={[styles.sortButtonText, sortOrder === 'newest' && styles.activeSortText]}>
              Newest
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'price-low' && styles.activeSort]}
            onPress={() => handleSortChange('price-low')}
          >
            <Text style={[styles.sortButtonText, sortOrder === 'price-low' && styles.activeSortText]}>
              Price: Low to High
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'price-high' && styles.activeSort]}
            onPress={() => handleSortChange('price-high')}
          >
            <Text style={[styles.sortButtonText, sortOrder === 'price-high' && styles.activeSortText]}>
              Price: High to Low
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'rating' && styles.activeSort]}
            onPress={() => handleSortChange('rating')}
          >
            <Text style={[styles.sortButtonText, sortOrder === 'rating' && styles.activeSortText]}>
              Top Rated
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="favorite-border" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>
            Add products to your favorites list by tapping the heart icon
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Products')}
          >
            <Text style={styles.shopButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
          renderItem={renderFavoriteItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noResultsContainer}>
              <Icon name="search-off" size={60} color="#E0E0E0" />
              <Text style={styles.noResultsText}>No favorites match your search</Text>
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  sortContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sortButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
    minWidth: 100,
  },
  activeSort: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  sortButtonText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  activeSortText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  favoriteItem: {
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
  imageContainer: {
    marginRight: 12,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPrice: {
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cartButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  buttonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  removeButton: {
    flexDirection: 'row',
    backgroundColor: '#FFE8E8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  removeButtonText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 6,
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
    paddingHorizontal: 20,
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
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    marginTop: 50,
  },
  noResultsText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  clearSearchButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  clearSearchText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default FavoritesScreen;