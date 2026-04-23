import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Hide scroll indicators for native app feel (iOS WebView only)
        // CSS ::-webkit-scrollbar doesn't work in WKWebView
        if let scrollView = webView?.scrollView {
            scrollView.showsVerticalScrollIndicator = false
            scrollView.showsHorizontalScrollIndicator = false
        }
    }

    override open func capacitorDidLoad() {
        // Register in-app Swift plugins. App-local plugins (i.e. not installed
        // as Cocoapods) must be registered manually via the bridge in
        // Capacitor 6+; without this, JS calls to the plugin throw
        // "UNIMPLEMENTED" and remote-command listeners never fire.
        bridge?.registerPluginInstance(TanzeelNowPlayingPlugin())
    }
}
