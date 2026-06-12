/**
 * Global Jest setup — runs once before every test file.
 *
 * ALL mocks live here (never inline in the tests) so that every suite shares
 * the exact same fakes for native modules, navigation and storage.
 *
 * How tests interact with these mocks:
 *   - AsyncStorage: a real in-memory store (cleared after each test).
 *   - expo-router:  `useRouter()` always returns the same `mockRouter`, so a
 *                   test can do `useRouter().replace` and assert on it.
 *   - Alert.alert:  spied so tests can assert it was shown.
 */

import '@testing-library/jest-native/extend-expect'
import { Alert } from 'react-native'

/* ------------------------------------------------------------------ *
 * AsyncStorage — official in-memory mock from the package itself.
 * ------------------------------------------------------------------ */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

/* ------------------------------------------------------------------ *
 * expo-router — single shared router instance so navigation calls can
 * be asserted from the tests (`useRouter().replace`, `.push`, ...).
 * ------------------------------------------------------------------ */
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
}

jest.mock('expo-router', () => {
  const React = require('react')
  return {
    __esModule: true,
    useRouter: () => mockRouter,
    usedRouter: () => mockRouter,
    usePathname: () => '/',
    useLocalSearchParams: () => ({}),
    useSegments: () => [],
    useFocusEffect: () => {},
    // Lightweight stand-ins for the navigation primitives.
    Link: ({ children }) => children,
    Stack: Object.assign(
      ({ children }) => React.createElement(React.Fragment, null, children),
      { Screen: () => null },
    ),
    Tabs: Object.assign(
      ({ children }) => React.createElement(React.Fragment, null, children),
      { Screen: () => null },
    ),
    Redirect: () => null,
  }
})

// Exposed so individual tests can grab the same instance if they prefer.
global.mockRouter = mockRouter

/* ------------------------------------------------------------------ *
 * react-native-safe-area-context — official passthrough mock so screens
 * using <SafeAreaView> / useSafeAreaInsets() render without a provider.
 * ------------------------------------------------------------------ */
jest.mock('react-native-safe-area-context', () =>
  // The shipped mock exposes everything under `default`; spread it so the
  // named imports (`SafeAreaView`, `SafeAreaProvider`, ...) resolve correctly.
  require('react-native-safe-area-context/jest/mock').default,
)

/* ------------------------------------------------------------------ *
 * react-native-reanimated — the app does not depend on it yet, so we
 * register a *virtual* stub. This guarantees that the moment a reanimated
 * component is introduced the test suite won't crash on import.
 *
 * When you actually add `react-native-reanimated` to the project, replace
 * the block below with the official mock:
 *
 *   jest.mock('react-native-reanimated', () => {
 *     const Reanimated = require('react-native-reanimated/mock')
 *     Reanimated.default.call = () => {}
 *     return Reanimated
 *   })
 * ------------------------------------------------------------------ */
jest.mock(
  'react-native-reanimated',
  () => {
    const React = require('react')
    const { View, Text, Image, ScrollView } = require('react-native')
    const noop = () => {}
    return {
      __esModule: true,
      default: {
        View, Text, Image, ScrollView,
        createAnimatedComponent: (c) => c,
        call: noop,
      },
      useSharedValue: (v) => ({ value: v }),
      useAnimatedStyle: () => ({}),
      withTiming: (v) => v,
      withSpring: (v) => v,
      withDelay: (_, v) => v,
      Easing: { linear: noop, ease: noop, inOut: () => noop },
      runOnJS: (fn) => fn,
    }
  },
  { virtual: true },
)

/* ------------------------------------------------------------------ *
 * expo-image-picker — used by the Perfil screen (gallery / camera).
 * Defaults to "permission granted" + "user cancelled".
 * ------------------------------------------------------------------ */
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  MediaTypeOptions: { Images: 'Images' },
}))

/* ------------------------------------------------------------------ *
 * expo-location — used by the Mapa screen. Defaults to a denied
 * permission so the map renders without trying to geolocate.
 * ------------------------------------------------------------------ */
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: -22.4, longitude: -43.5 },
  })),
  Accuracy: { Balanced: 3, High: 4 },
}))

/* ------------------------------------------------------------------ *
 * react-native-maps — replace the native map with plain Views so the
 * Mapa screen can render in the JS test environment.
 * ------------------------------------------------------------------ */
jest.mock('react-native-maps', () => {
  const React = require('react')
  const { View } = require('react-native')
  const MapView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      fitToCoordinates: jest.fn(),
      animateToRegion: jest.fn(),
    }))
    return React.createElement(View, props, props.children)
  })
  const Marker = (props) => React.createElement(View, props, props.children)
  return { __esModule: true, default: MapView, Marker, PROVIDER_GOOGLE: 'google' }
})

/* ------------------------------------------------------------------ *
 * @expo/vector-icons — render icons as a simple View (no font loading).
 * Declared `virtual` because the package lives nested under expo's own
 * node_modules and is not resolvable from the project root in Jest.
 * ------------------------------------------------------------------ */
jest.mock(
  '@expo/vector-icons',
  () => {
    const React = require('react')
    const { View } = require('react-native')
    const Icon = (props) => React.createElement(View, props)
    return { Ionicons: Icon, MaterialIcons: Icon, FontAwesome: Icon, Feather: Icon }
  },
  { virtual: true },
)

/* ------------------------------------------------------------------ *
 * Alert — spy so tests can assert dialogs were shown without a UI.
 * ------------------------------------------------------------------ */
jest.spyOn(Alert, 'alert').mockImplementation(() => {})

/* ------------------------------------------------------------------ *
 * Wipe the in-memory AsyncStorage between tests for full isolation.
 * ------------------------------------------------------------------ */
const AsyncStorage = require('@react-native-async-storage/async-storage')
afterEach(async () => {
  await AsyncStorage.clear()
})

// Quieter logs: the app uses console.log for non-critical avatar errors.
jest.spyOn(console, 'log').mockImplementation(() => {})
