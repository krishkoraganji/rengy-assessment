import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

const ProductDetailScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const [expanded, setExpanded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [inCart, setInCart] = useState(false);
  const [inFavorites, setInFavorites] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);
  const scrollTimer = useRef(null);
console.log("product",product)
  const images = product?.images || (product?.thumbnail ? [product.thumbnail] : []);

  useEffect(() => {
    checkCartStatus();
    checkFavoriteStatus();
    
    if (images.length > 1) {
      startAutoScroll();
    }
    
    return () => {
      if (scrollTimer.current) {
        clearInterval(scrollTimer.current);
      }
    };
  }, []);

  const startAutoScroll = () => {
    scrollTimer.current = setInterval(() => {
      setCurrentImageIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % images.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 3000);
  };

  const checkCartStatus = async () => {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      if (cartData) {
        const cart = JSON.parse(cartData);
        const itemInCart = cart.find(item => item.id === product.id);
        setInCart(!!itemInCart);
      }
    } catch (error) {
      console.error('Error checking cart:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const favoritesData = await AsyncStorage.getItem('favorites');
      if (favoritesData) {
        const favorites = JSON.parse(favoritesData);
        const isFavorite = favorites.find(item => item.id === product.id);
        setInFavorites(!!isFavorite);
      }
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  };

  const handleAddToCart = async () => {
    if (product.stock < quantity) {
      Alert.alert('Out of Stock', 'This product is currently out of stock');
      return;
    }

    setLoading(true);
    try {
      const cartData = await AsyncStorage.getItem('cart');
      let cart = cartData ? JSON.parse(cartData) : [];
      
      const existingItemIndex = cart.findIndex(item => item.id === product.id);
      
      if (existingItemIndex >= 0) {
        cart[existingItemIndex].quantity += quantity;
      } else {
        cart.push({
          ...product,
          quantity,
          addedAt: new Date().toISOString(),
        });
      }
      
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      setInCart(true);
      Alert.alert('Success', 'Product added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToFavorites = async () => {
    setLoading(true);
    try {
      const favoritesData = await AsyncStorage.getItem('favorites');
      let favorites = favoritesData ? JSON.parse(favoritesData) : [];
      
      if (inFavorites) {
        favorites = favorites.filter(item => item.id !== product.id);
        setInFavorites(false);
        Alert.alert('Removed', 'Product removed from favorites');
      } else {
        favorites.push({
          ...product,
          addedAt: new Date().toISOString(),
        });
        setInFavorites(true);
        Alert.alert('Added', 'Product added to favorites');
      }
      
      await AsyncStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error updating favorites:', error);
      Alert.alert('Error', 'Failed to update favorites');
    } finally {
      setLoading(false);
    }
  };

  const renderImageItem = ({ item, index }) => (
    <View style={styles.imageContainer}>
      <Image 
        source={{ uri: item }} 
        style={styles.productImage} 
        onError={(e) => console.log('Image failed to load:', e.nativeEvent.error)}
      />
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== undefined && newIndex !== currentImageIndex) {
        setCurrentImageIndex(newIndex);
        
        if (scrollTimer.current) {
          clearInterval(scrollTimer.current);
        }
        if (images.length > 1) {
          startAutoScroll();
        }
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const calculateDiscountPrice = () => {
    if (!product?.price || !product?.discountPercentage) {
      return product?.price || 0;
    }
    return (product.price * (100 - product.discountPercentage)) / 100;
  };

  const safeProduct = product || {};
  const safeTitle = safeProduct.title || 'No Title';
  const safeBrand = safeProduct.brand || 'No Brand';
  const safeRating = safeProduct.rating || 0;
  const safePrice = safeProduct.price || 0;
  const safeDiscount = safeProduct.discountPercentage || 0;
  const safeStock = safeProduct.stock || 0;
  const safeDescription = safeProduct.description || 'No description available';
  const safeCategory = safeProduct.category || 'Uncategorized';
  const safeWarranty = safeProduct.warrantyInformation || '1 Year';
  const safeReturnPolicy = safeProduct.returnPolicy || '30 Days Return Policy';

  if (!product) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text>Loading product details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {images.length > 0 ? (
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={images}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => `image-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialScrollIndex={0}
            getItemLayout={(data, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
          />
          
          {images.length > 1 && (
            <View style={styles.indicatorContainer}>
              {images.map((_, index) => (
                <View
                  key={`indicator-${index}`}
                  style={[
                    styles.indicator,
                    currentImageIndex === index && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Icon name="image" size={80} color="#CCC" />
          <Text style={styles.placeholderText}>No Image Available</Text>
        </View>
      )}
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.productTitle}>{safeTitle}</Text>
          <TouchableOpacity 
            onPress={handleAddToFavorites}
            disabled={loading}
          >
            <Icon
              name={inFavorites ? 'favorite' : 'favorite-border'}
              size={28}
              color={inFavorites ? '#FF6B6B' : '#666'}
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.brandContainer}>
          <Text style={styles.brandText}>Brand: {safeBrand}</Text>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={20} color="#FFD700" />
            <Text style={styles.ratingText}>{safeRating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({safeStock} in stock)</Text>
          </View>
        </View>
        
        <View style={styles.priceContainer}>
          {safeDiscount > 0 ? (
            <>
              <Text style={styles.currentPrice}>
                ${calculateDiscountPrice().toFixed(2)}
              </Text>
              <Text style={styles.originalPrice}>
                ${safePrice.toFixed(2)}
              </Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {safeDiscount}% OFF
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.currentPrice}>
              ${safePrice.toFixed(2)}
            </Text>
          )}
        </View>
        
        <View style={styles.stockContainer}>
          <Text style={[styles.stockText, safeStock === 0 && styles.outOfStock]}>
            {safeStock > 0 ? `${safeStock} items available` : 'Out of Stock'}
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text
            style={styles.descriptionText}
            numberOfLines={expanded ? undefined : 3}
          >
            {safeDescription}
          </Text>
          {safeDescription.length > 100 && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={styles.readMoreText}>
                {expanded ? 'Read Less' : 'Read More'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Category:</Text>
            <Text style={styles.specValue}>{safeCategory}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Warranty:</Text>
            <Text style={styles.specValue}>{safeWarranty}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Return Policy:</Text>
            <Text style={styles.specValue}>{safeReturnPolicy}</Text>
          </View>
        </View>
        
        <View style={styles.actionContainer}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[styles.quantityButton, quantity === 1 && styles.disabledButton]}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity === 1}
            >
              <Icon name="remove" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.quantityButton, quantity >= safeStock && styles.disabledButton]}
              onPress={() => setQuantity(Math.min(safeStock, quantity + 1))}
              disabled={quantity >= safeStock}
            >
              <Icon name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[
              styles.addToCartButton, 
              inCart && styles.inCartButton,
              (safeStock === 0 || loading) && styles.disabledButton
            ]}
            onPress={handleAddToCart}
            disabled={safeStock === 0 || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon
                  name={inCart ? 'check-circle' : 'shopping-cart'}
                  size={24}
                  color="#fff"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>
                  {inCart ? 'Added to Cart' : safeStock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselContainer: {
    height: 300,
    position: 'relative',
  },
  imageContainer: {
    width: screenWidth,
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: screenWidth,
    height: 300,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#FF6B6B',
    width: 16,
  },
  contentContainer: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandText: {
    fontSize: 16,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
    marginRight: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 12,
  },
  discountBadge: {
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  discountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  stockContainer: {
    marginBottom: 20,
  },
  stockText: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 4,
  },
  outOfStock: {
    color: '#F44336',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  readMoreText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  specLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  specValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    padding: 4,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
  },
  inCartButton: {
    backgroundColor: '#4CAF50',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default ProductDetailScreen;