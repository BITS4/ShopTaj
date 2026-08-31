import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import type { ComponentType, PropsWithChildren } from 'react'
import type { ViewProps } from 'react-native'

// npm hoists the gesture-handler declaration above React Native's workspace.
// Rebind its documented children/ViewProps contract to the mobile type tree.
const MobileGestureHandlerRootView = GestureHandlerRootView as unknown as ComponentType<
  PropsWithChildren<ViewProps>
>

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

export default function RootLayout() {
  return (
    <MobileGestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="product/[id]" options={{ headerShown: true, title: '' }} />
            <Stack.Screen name="orders" options={{ headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </MobileGestureHandlerRootView>
  )
}
