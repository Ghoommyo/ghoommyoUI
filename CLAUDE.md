# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

Ghoomyo is an Expo SDK 57 app (React Native 0.86, React 19.2, TypeScript strict) that is still on the `create-expo-app` starter template. `npm run reset-project` moves `src/` and `scripts/` into `example/` and scaffolds a blank `src/app/` — don't run it unless asked.

## Commands

The project uses npm (`package-lock.json`), so use `npx`, not `bunx`.

```bash
npm start                 # expo start (also: npm run ios | android | web)
npm run lint              # expo lint
npx tsc --noEmit          # typecheck
npx expo install <pkg>    # add dependencies
```

No test runner is set up yet (see the Expo "Unit Testing with Jest" guide if one is needed).

## Architecture

- **Routing**: Expo Router with `src/app/` as the routes root (`main` is `expo-router/entry`). `app.json` enables `typedRoutes` and `reactCompiler` experiments — rely on typed `href`s, and avoid manual `useMemo`/`useCallback` unless there's a specific reason.
- **Tabs are platform-split**: `src/app/_layout.tsx` renders `AppTabs` from `@/components/app-tabs`. Native uses `NativeTabs` from `expo-router/unstable-native-tabs` (`app-tabs.tsx`); web uses the headless `expo-router/ui` `Tabs`/`TabList`/`TabTrigger` with a custom top bar (`app-tabs.web.tsx`). Adding a tab means updating **both** files plus adding the route file.
- **Platform-specific files**: `.web.tsx`/`.web.ts` siblings override native implementations (`app-tabs`, `animated-icon`, `use-color-scheme`). The web `useColorScheme` returns `'light'` until hydration because web output is static (`web.output: "static"`).
- **Theming**: `src/constants/theme.ts` defines `Colors` (light/dark), `Spacing`, `Fonts`, `BottomTabInset`, and `MaxContentWidth`. Use `useTheme()` (`@/hooks/use-theme`) or the `ThemedText`/`ThemedView` components rather than hard-coding colors. `theme.ts` imports `src/global.css`, which defines the web font CSS variables.
- **Splash**: the root layout calls `SplashScreen.preventAutoHideAsync()`; `AnimatedSplashOverlay` in `components/animated-icon` calls `SplashScreen.hideAsync()` on native. If you replace the root layout, keep a `hideAsync()` call or the app stays on the splash screen.
- **Path aliases**: `@/*` → `src/*`, `@/assets/*` → `assets/*`.
