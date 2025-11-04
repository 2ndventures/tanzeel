# App Icons and Splash Screens

This directory is for your app's icon and splash screen source files.

## Quick Setup

### Option 1: Automatic Generation (Recommended)

1. **Create your app icon**:
   - Create a 1024x1024px PNG file named `icon.png` in this directory
   - Should have no transparency for iOS
   - Include padding to account for iOS rounded corners

2. **Create your splash screen** (optional):
   - Create a 2732x2732px PNG file named `splash.png` in this directory
   - Center your logo/branding in the middle
   - Use a solid background color

3. **Install the assets tool**:
   ```bash
   npm install -D @capacitor/assets
   ```

4. **Generate all sizes**:
   ```bash
   npx capacitor-assets generate --iconBackgroundColor '#FFFFFF' --splashBackgroundColor '#FFFFFF'
   ```

This will automatically create all required icon and splash screen sizes for iOS and Android.

### Option 2: Manual Placement

If you prefer to manually create icons and splash screens:

**iOS**: Place assets in `ios/App/App/Assets.xcassets/`
- App Icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Splash: `ios/App/App/Assets.xcassets/Splash.imageset/`

**Android**: Place assets in `android/app/src/main/res/`
- Icons: `mipmap-*` folders (various densities)
- Splash: `drawable-*` folders

## Image Requirements

### App Icon
- **Size**: 1024x1024px (for generation) or multiple sizes for manual
- **Format**: PNG with no transparency (iOS requirement)
- **Content**: Simple, recognizable design
- **Padding**: Leave ~10% padding from edges for iOS rounded corners

### Splash Screen
- **Size**: 2732x2732px (for generation)
- **Format**: PNG
- **Content**: Centered logo with safe area
- **Background**: Solid color matching your app theme

## Current Logo

The app currently uses a book icon (solar:book-bold) as a placeholder. Replace this with your actual Simple Quran logo design.

## Testing

After generating assets:
1. Build the project: `vite build`
2. Sync to platforms: `npx cap sync`
3. Open in Xcode/Android Studio to verify icons appear correctly
