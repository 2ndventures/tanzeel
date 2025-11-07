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
}
