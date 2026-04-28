import { Tabs } from 'expo-router'
import { Home, Search, ShoppingCart, User } from 'lucide-react-native'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#e5e7eb' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Search', tabBarIcon: ({ color }) => <Search size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="cart"
        options={{ title: 'Cart', tabBarIcon: ({ color }) => <ShoppingCart size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={24} color={color} /> }}
      />
    </Tabs>
  )
}
