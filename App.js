import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Platform, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProductListScreen from './src/screens/productsList';
import ProductDetailScreen from './src/screens/productDetails';
import CartScreen from './src/screens/cart';
import FavoritesScreen from './src/screens/favorites';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

// Products Stack
const ProductsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProductList" 
        component={ProductListScreen} 
        options={{ 
          title: 'Products',
          headerStyle: { 
            backgroundColor: '#FF6B6B',
            height: 60,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
          },
        }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ 
          title: 'Product Details',
          headerStyle: { 
            backgroundColor: '#FF6B6B',
            height: 60,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
        }}
      />
    </Stack.Navigator>
  );
};

// Cart Stack (to add header)
const CartStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="CartScreen" 
        component={CartScreen}
        options={{
          title: 'Shopping Cart',
          headerStyle: { 
            backgroundColor: '#FF6B6B',
            height: 60,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
          },
        }}
      />
    </Stack.Navigator>
  );
};

// Favorites Stack (to add header)
const FavoritesStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="FavoritesScreen" 
        component={FavoritesScreen}
        options={{
          title: 'My Favorites',
          headerStyle: { 
            backgroundColor: '#FF6B6B',
            height: 60,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
          },
        }}
      />
    </Stack.Navigator>
  );
};

// Custom Tab Component
const CustomTabBarIcon = ({ focused, iconName, label }) => (
  <View style={{ 
    alignItems: 'center', 
    justifyContent: 'center',
    width: width / 3 - 20,
  }}>
    <Icon 
      name={iconName} 
      size={24} 
      color={focused ? '#FF6B6B' : '#666'} 
    />
    <Text 
      style={{ 
        fontSize: 10, 
        color: focused ? '#FF6B6B' : '#666',
        marginTop: 2,
        textAlign: 'center',
      }}
      numberOfLines={1}
    >
      {label}
    </Text>
  </View>
);

const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false, // Hide header from Tab Navigator
          tabBarStyle: {
            backgroundColor: '#fff',
            height: Platform.OS === 'ios' ? 85 : 60,
            paddingBottom: Platform.OS === 'ios' ? 25 : 5,
            paddingTop: 5,
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen 
          name="Products" 
          component={ProductsStack}
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabBarIcon 
                focused={focused} 
                iconName="store" 
                label="Products" 
              />
            ),
          }}
        />
        <Tab.Screen 
          name="Cart" 
          component={CartStack} // Changed to CartStack
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabBarIcon 
                focused={focused} 
                iconName="shopping-cart" 
                label="Cart" 
              />
            ),
          }}
        />
        <Tab.Screen 
          name="Favorites" 
          component={FavoritesStack} // Changed to FavoritesStack
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabBarIcon 
                focused={focused} 
                iconName="favorite" 
                label="Favorites" 
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default App;