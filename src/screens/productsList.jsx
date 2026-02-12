import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const API_URL = 'https://dummyjson.com/products';
const { width } = Dimensions.get('window'); // Move width here

const ProductListScreen = ({ navigation }) => {
  // State declarations
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingCart, setLoadingCart] = useState(true);
  const [autoScrollIndex, setAutoScrollIndex] = useState(0); // Move state declaration to top

  // Refs
  const scrollViewRef = useRef();
  const scrollX = useRef(new Animated.Value(0)).current;

  // Main data fetching effect
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await Promise.all([
          fetchProducts(),
          loadFavorites(),
          loadCart(),
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchAllData();
  }, []);

  // Filter and sort effect
  useEffect(() => {
    filterAndSortProducts();
  }, [searchQuery, selectedCategory, sortBy, products]);

  // Auto-scroll effect for featured products - FIXED
  useEffect(() => {
    let interval;
    
    if (filteredProducts.length > 0 && scrollViewRef.current) {
      interval = setInterval(() => {
        const maxIndex = Math.max(0, Math.ceil(filteredProducts.length / 4) - 1);
        setAutoScrollIndex(prev => {
          const nextIndex = (prev + 1) % (maxIndex + 1);
          
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              x: nextIndex * (width * 0.8 + 10),
              animated: true,
            });
          }
          
          return nextIndex;
        });
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [filteredProducts]); // Removed width dependency

  // Functions
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      const data = await response.json();
      setProducts(data.products);
      
      // Extract unique categories
      const uniqueCategories = ['All', ...new Set(data.products.map(p => p.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      setLoadingFavorites(true);
      const favoritesData = await AsyncStorage.getItem('favorites');
      if (favoritesData) {
        setFavorites(JSON.parse(favoritesData));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const loadCart = async () => {
    try {
      setLoadingCart(true);
      const cartData = await AsyncStorage.getItem('cart');
      if (cartData) {
        setCart(JSON.parse(cartData));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoadingCart(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProducts(),
      loadFavorites(),
      loadCart(),
    ]);
    setRefreshing(false);
  };

  const toggleFavorite = async (product) => {
    try {
      let updatedFavorites;
      if (favorites.some(fav => fav.id === product.id)) {
        updatedFavorites = favorites.filter(fav => fav.id !== product.id);
      } else {
        updatedFavorites = [...favorites, product];
      }
      setFavorites(updatedFavorites);
      await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const addToCart = async (product) => {
    try {
      const existingItem = cart.find(item => item.id === product.id);
      let updatedCart;
      
      if (existingItem) {
        updatedCart = cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updatedCart = [...cart, { ...product, quantity: 1 }];
      }
      
      setCart(updatedCart);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
      
      // Show success message
      alert('Product added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filter by search query - FIXED
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(product =>
        product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }
    
    setFilteredProducts(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortBy('default');
  };

  // Safe image render function
  const renderImage = (uri, style) => {
    if (!uri) {
      return (
        <View style={[style, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
          <Icon name="image" size={40} color="#CCC" />
        </View>
      );
    }
    return (
      <Image 
        source={{ uri }} 
        style={style}
        onError={() => console.log('Image failed to load')}
      />
    );
  };

  // Render functions
  const renderProductItem = ({ item }) => {
    const isFavorite = favorites.some(fav => fav.id === item.id);
    const discountPercentage = item.discountPercentage || 0;
    const discountedPrice = item.price - (item.price * discountPercentage) / 100;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
      >
        <View style={styles.imageContainer}>
          {renderImage(item.thumbnail, styles.productImage)}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item)}
          >
            <Icon
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={24}
              color={isFavorite ? '#FF6B6B' : '#666'}
            />
          </TouchableOpacity>
          {discountPercentage > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discountPercentage.toFixed(0)}%</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title || 'No Title'}
          </Text>
          <Text style={styles.productBrand} numberOfLines={1}>
            {item.brand || 'No Brand'}
          </Text>
          
          <View style={styles.priceContainer}>
            {discountPercentage > 0 ? (
              <>
                <Text style={styles.discountedPrice}>
                  ${discountedPrice.toFixed(2)}
                </Text>
                <Text style={styles.originalPrice}>
                  ${item.price.toFixed(2)}
                </Text>
              </>
            ) : (
              <Text style={styles.price}>${item.price?.toFixed(2) || '0.00'}</Text>
            )}
          </View>
          
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.ratingCount}>({item.stock || 0})</Text>
          </View>
          
          <TouchableOpacity
            style={styles.addToCartButton}
            onPress={() => addToCart(item)}
          >
            <Icon name="add-shopping-cart" size={20} color="#fff" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const sortOptions = [
    { label: 'Default', value: 'default' },
    { label: 'Price: Low to High', value: 'price-low' },
    { label: 'Price: High to Low', value: 'price-high' },
    { label: 'Highest Rated', value: 'rating' },
    { label: 'Name: A to Z', value: 'name' },
  ];

  // Loading state
  if (loading || loadingFavorites || loadingCart) {
    return (
      <View style={styles.fullScreenLoader}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading Products...</Text>
      </View>
    );
  }

  // Main render
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Favorites')}
          >
            <Icon name="favorite" size={28} color="#FF6B6B" />
            {favorites.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{favorites.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={() => navigation.navigate('Cart')}
          >
            <MaterialCommunityIcons name="cart" size={24} color="#FF6B6B" />
            {cart.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortModalVisible(true)}
        >
          <Icon name="sort" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextSelected,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Active Filters */}
      {(searchQuery || selectedCategory !== 'All' || sortBy !== 'default') && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {searchQuery && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>Search: {searchQuery}</Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCategory !== 'All' && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>Category: {selectedCategory}</Text>
                <TouchableOpacity onPress={() => setSelectedCategory('All')}>
                  <Icon name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            {sortBy !== 'default' && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>
                  Sort: {sortOptions.find(opt => opt.value === sortBy)?.label || sortBy}
                </Text>
                <TouchableOpacity onPress={() => setSortBy('default')}>
                  <Icon name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Featured Products Section */}
      {filteredProducts.length > 0 ? (
        <ScrollView
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#FF6B6B']}
              tintColor="#FF6B6B"
            />
          }
        >
          <View style={styles.autoScrollContainer}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.autoScrollContent}
              pagingEnabled
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
            >
              {filteredProducts.map((product, index) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.featuredProduct}
                  onPress={() => navigation.navigate('ProductDetail', { product })}
                >
                  {renderImage(product.thumbnail, styles.featuredImage)}
                  <View style={styles.featuredInfo}>
                    <Text style={styles.featuredTitle} numberOfLines={2}>
                      {product.title || 'No Title'}
                    </Text>
                    <Text style={styles.featuredBrand} numberOfLines={1}>
                      {product.brand || 'No Brand'}
                    </Text>
                    <Text style={styles.featuredPrice}>
                      ${product.price?.toFixed(2) || '0.00'}
                    </Text>
                    <View style={styles.featuredRating}>
                      <Icon name="star" size={14} color="#FFD700" />
                      <Text style={styles.featuredRatingText}>
                        {product.rating?.toFixed(1) || '0.0'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Dots Indicator */}
            <View style={styles.dotsContainer}>
              {filteredProducts.slice(0, 5).map((_, index) => {
                const inputRange = [
                  (index - 1) * width,
                  index * width,
                  (index + 1) * width,
                ];
                
                const dotWidth = scrollX.interpolate({
                  inputRange,
                  outputRange: [8, 16, 8],
                  extrapolate: 'clamp',
                });
                
                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        width: dotWidth,
                        opacity: opacity,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* All Products Section */}
          <View style={styles.productsSection}>
            <View style={styles.productsHeader}>
              <Text style={styles.sectionTitle}>All Products</Text>
              <Text style={styles.productCount}>({filteredProducts.length} items)</Text>
            </View>
            
            {filteredProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="inventory" size={60} color="#CCC" />
                <Text style={styles.emptyStateText}>No products available</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try changing your search or filters
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                renderItem={renderProductItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.productsList}
                ListFooterComponent={
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>
                      Showing {filteredProducts.length} products
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.noResultsContainer}>
          <Icon name="search-off" size={60} color="#CCC" />
          <Text style={styles.noResultsText}>No products found</Text>
          <Text style={styles.noResultsSubtext}>
            Try a different search or category
          </Text>
          <TouchableOpacity style={styles.clearFiltersButtonLarge} onPress={clearFilters}>
            <Text style={styles.clearFiltersTextLarge}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={sortModalVisible}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSortModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sort By</Text>
                  <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.sortOption}
                    onPress={() => {
                      setSortBy(option.value);
                      setSortModalVisible(false);
                    }}
                  >
                    <Text style={styles.sortOptionText}>{option.label}</Text>
                    {sortBy === option.value && (
                      <Icon name="check" size={24} color="#FF6B6B" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  fullScreenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    marginLeft: 15,
    position: 'relative',
    padding: 5,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 10,
    paddingHorizontal: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333',
  },
  sortButton: {
    padding: 5,
    marginLeft: 10,
  },
  categoriesContainer: {
    marginVertical: 10,
  },
  categoriesList: {
    paddingHorizontal: 10,
  },
  categoryChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryChipSelected: {
    backgroundColor: '#FF6B6B',
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  activeFiltersContainer: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    color: '#1E88E5',
    marginRight: 6,
  },
  clearFiltersButton: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  clearFiltersButtonLarge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  clearFiltersTextLarge: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  autoScrollContainer: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
    marginVertical: 10,
    color: '#333',
  },
  autoScrollContent: {
    paddingHorizontal: 10,
  },
  featuredProduct: {
    width: width * 0.8,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  featuredInfo: {
    padding: 15,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featuredBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    marginHorizontal: 4,
  },
  productsSection: {
    flex: 1,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 10,
  },
  productCount: {
    fontSize: 14,
    color: '#666',
  },
  productsList: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 5,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxWidth: (width - 40) / 2,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  favoriteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 5,
  },
  discountBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  productBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
    marginRight: 8,
  },
  ratingCount: {
    fontSize: 12,
    color: '#666',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 'auto',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
});

export default ProductListScreen;