# How to Build Your App (iOS & Android)

Since you are using Expo, the easiest way to build your app for iOS and Android is using **EAS Build** (Expo Application Services).

## Prerequisites

1.  **Expo Account**: You need an account at [expo.dev](https://expo.dev).
2.  **EAS CLI**: Install the EAS command line tool globally:
    ```bash
    npm install -g eas-cli
    ```

## Step 1: Login to EAS

Run the following command in your terminal and log in with your Expo credentials:

```bash
eas login
```

## Step 2: Configure the Project

Run this command to generate the `eas.json` configuration file:

```bash
eas build:configure
```
*   Select `All` when asked which platforms to configure.

## Step 3: Build for Android (APK)

To build an APK that you can install directly on your Android device:

1.  Open `eas.json` and add a `preview` profile if it doesn't exist (or modify the default). It should look something like this:
    ```json
    {
      "build": {
        "preview": {
          "android": {
            "buildType": "apk"
          }
        },
        "production": {}
      }
    }
    ```
2.  Run the build command:
    ```bash
    eas build -p android --profile preview
    ```
3.  Wait for the build to finish. You will get a link to download the `.apk` file.

## Step 4: Build for iOS

Building for iOS requires an Apple Developer Account ($99/year) to deploy to the App Store or TestFlight.

To build for the App Store:
```bash
eas build -p ios
```

To build a simulator build (for testing on Mac without a dev account):
```bash
eas build -p ios --profile simulator
```

## Step 5: Free Testing on iOS (Expo Go)

If you do not have a paid Apple Developer Account ($99/year), you **cannot** build a standalone app (`.ipa`) for iOS.

However, you can test and use the app for **FREE** using the **Expo Go** app:

1.  Download **Expo Go** from the App Store on your iPhone.
2.  Run the development server on your computer:
    ```bash
    npx expo start
    ```
3.  Scan the QR code shown in the terminal with your iPhone's Camera app.
4.  The app will open inside Expo Go.

**Note**: This requires your phone and computer to be on the same Wi-Fi network.

## Troubleshooting

*   **"package" name**: Ensure `android.package` and `ios.bundleIdentifier` in `app.json` are unique to you (e.g., `com.yourname.coupleapp`).
*   **Assets**: Make sure all your assets (icons, splash screens) are in the `assets` folder.

For more details, check the [EAS Build Documentation](https://docs.expo.dev/build/introduction/).
