import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAudioSession()
        return true
    }

    private func configureAudioSession() {
        // Required for HTML5 <audio> in WKWebView to (a) keep playing while the
        // device is locked / app is backgrounded and (b) bind to the iOS lock-screen
        // Now Playing card and MPRemoteCommandCenter so play/pause/next/previous
        // and Bluetooth headset transport buttons reach the Web MediaSession API
        // handlers we register in JS.
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .spokenAudio, options: [])
            try session.setActive(true, options: [])
        } catch {
            print("Tanzeel: failed to configure AVAudioSession: \(error)")
        }
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Intentionally a no-op. Do NOT call AVAudioSession.setActive(true)
        // here. iOS fires applicationDidBecomeActive on every transition
        // out of the inactive state — including when the user merely
        // dismisses Control Center or returns from the home screen — and
        // re-activating the session yanks it out from under the WKWebView's
        // HTML5 <audio> element on real devices, which fires a native
        // 'pause' event and stops playback. The session is activated once
        // at launch in didFinishLaunchingWithOptions and again in the
        // TanzeelNowPlaying plugin's load(); that is sufficient for the
        // entire app lifecycle. See the matching NOTE in
        // TanzeelNowPlayingPlugin.setPlaybackState for the same trap.
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
