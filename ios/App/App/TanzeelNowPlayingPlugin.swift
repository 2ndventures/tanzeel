import Foundation
import Capacitor
import MediaPlayer
import AVFoundation
import UIKit

@objc(TanzeelNowPlayingPlugin)
public class TanzeelNowPlayingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TanzeelNowPlayingPlugin"
    public let jsName = "TanzeelNowPlaying"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setMetadata", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPlaybackState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPosition", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setNavEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    private var nowPlayingInfo: [String: Any] = [:]
    private var cachedArtwork: MPMediaItemArtwork?
    private var commandsRegistered = false
    private var nextEnabled = false
    private var prevEnabled = false
    /// Tracks whether the JS layer believes audio is currently playing. Used
    /// by the interruption handler to (a) avoid auto-resuming after a real
    /// interruption when the user had paused before it began, and (b) avoid
    /// emitting spurious pause events on session activation noise.
    private var jsBelievesPlaying = false
    private var wasPlayingBeforeInterruption = false

    override public func load() {
        DispatchQueue.main.async { [weak self] in
            self?.activateAudioSession()
            self?.registerCommands()
            // Interruption observer intentionally disabled — even with the
            // defensive guard it was misbehaving on real iOS devices (audio
            // would stutter / fail to play). The "auto-resume after phone
            // call" feature it provided was a polish nicety, not core
            // functionality. Leaving the observer code in place so it can
            // be re-enabled and debugged on a real device later.
            // self?.registerInterruptionObserver()
            self?.registerRouteChangeObserver()
            self?.preloadArtwork()
        }
    }

    /// Observe audio-route changes (headphones unplugged, Bluetooth
    /// disconnect, AirPlay device removed). When the previously-routed
    /// device disappears, Apple's HIG says playback should pause — this
    /// is what every major audio app does. We just forward a `pause`
    /// event to JS; no setActive() calls (which would re-trigger the
    /// real-device stutter that the interruption observer caused).
    private func registerRouteChangeObserver() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange(_:)),
            name: AVAudioSession.routeChangeNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        guard
            let info = notification.userInfo,
            let reasonRaw = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
            let reason = AVAudioSession.RouteChangeReason(rawValue: reasonRaw)
        else { return }

        if reason == .oldDeviceUnavailable && jsBelievesPlaying {
            notifyListeners("pause", data: [:])
        }
    }

    /// Observe phone-call / Siri / other-app interruptions so playback resumes
    /// automatically when the interruption ends (e.g. user finishes a call).
    /// iOS pauses the WKWebView <audio> element on its own at interruption
    /// start, but does not auto-resume — without this, users would have to
    /// manually tap play after every call. We forward the same `pause` /
    /// `play` events the lock-screen buttons use so the JS layer stays in
    /// sync with the actual audio engine state.
    private func registerInterruptionObserver() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard
            let info = notification.userInfo,
            let typeRaw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
            let type = AVAudioSession.InterruptionType(rawValue: typeRaw)
        else { return }

        switch type {
        case .began:
            // iOS already auto-pauses the WKWebView <audio> element on a real
            // interruption — we do NOT need to forward a `pause` event to JS.
            // Forwarding a pause was causing playback to die on TestFlight
            // because spurious `.began` notifications fire when the audio
            // session is first activated by the WebView, killing audio ~0.5s
            // after the user pressed play. We just record state so we know
            // whether to auto-resume on `.ended`.
            wasPlayingBeforeInterruption = jsBelievesPlaying
        case .ended:
            // Only auto-resume if the system explicitly says so AND the user
            // was actually playing when the interruption began. This prevents
            // re-starting playback after the user had manually paused.
            guard
                wasPlayingBeforeInterruption,
                let optionsRaw = info[AVAudioSessionInterruptionOptionKey] as? UInt
            else { return }
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsRaw)
            if options.contains(.shouldResume) {
                do {
                    try AVAudioSession.sharedInstance().setActive(true, options: [])
                } catch {
                    // Non-fatal — JS play() will retry activation indirectly.
                }
                notifyListeners("play", data: [:])
            }
            wasPlayingBeforeInterruption = false
        @unknown default:
            break
        }
    }

    private func activateAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .spokenAudio, options: [])
            try session.setActive(true, options: [])
        } catch {
            CAPLog.print("TanzeelNowPlaying: failed to activate AVAudioSession", error.localizedDescription)
        }
    }

    private func preloadArtwork() {
        // Capacitor copies webDir into the app bundle as `public/`.
        let candidates: [(String, String, String?)] = [
            ("tanzeel-logo-media", "jpg", "public/icons"),
            ("tanzeel-logo-media", "jpg", "public"),
            ("tanzeel-logo-media", "jpg", nil),
        ]
        for (name, ext, sub) in candidates {
            if let url = Bundle.main.url(forResource: name, withExtension: ext, subdirectory: sub),
               let image = UIImage(contentsOfFile: url.path) {
                cachedArtwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                return
            }
        }
    }

    private func registerCommands() {
        guard !commandsRegistered else { return }
        commandsRegistered = true
        let center = MPRemoteCommandCenter.shared()

        center.playCommand.isEnabled = true
        center.playCommand.addTarget { [weak self] _ in
            self?.notifyListeners("play", data: [:])
            return .success
        }

        center.pauseCommand.isEnabled = true
        center.pauseCommand.addTarget { [weak self] _ in
            self?.notifyListeners("pause", data: [:])
            return .success
        }

        center.togglePlayPauseCommand.isEnabled = true
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            self?.notifyListeners("togglePlayPause", data: [:])
            return .success
        }

        center.nextTrackCommand.addTarget { [weak self] _ in
            guard let self = self, self.nextEnabled else { return .commandFailed }
            self.notifyListeners("nexttrack", data: [:])
            return .success
        }

        center.previousTrackCommand.addTarget { [weak self] _ in
            guard let self = self, self.prevEnabled else { return .commandFailed }
            self.notifyListeners("previoustrack", data: [:])
            return .success
        }

        center.changePlaybackPositionCommand.isEnabled = true
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let self = self,
                  let posEvent = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            self.notifyListeners("seekto", data: ["time": posEvent.positionTime])
            return .success
        }
    }

    @objc func setMetadata(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? ""
        let artist = call.getString("artist") ?? ""
        let album = call.getString("album") ?? "Tanzeel"
        let duration = call.getDouble("duration") ?? 0

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.nowPlayingInfo[MPMediaItemPropertyTitle] = title
            self.nowPlayingInfo[MPMediaItemPropertyArtist] = artist
            self.nowPlayingInfo[MPMediaItemPropertyAlbumTitle] = album
            if duration > 0 {
                self.nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = duration
            }
            // The "natural" playback rate for this item is 1.0×. iOS uses this
            // to decide what counts as "playing back faster/slower than normal"
            // for the system speed indicator and to set its scrubber's
            // extrapolation baseline correctly when the user changes speed.
            self.nowPlayingInfo[MPNowPlayingInfoPropertyDefaultPlaybackRate] = 1.0
            if let art = self.cachedArtwork {
                self.nowPlayingInfo[MPMediaItemPropertyArtwork] = art
            }
            MPNowPlayingInfoCenter.default().nowPlayingInfo = self.nowPlayingInfo
            call.resolve()
        }
    }

    @objc func setPlaybackState(_ call: CAPPluginCall) {
        let isPlaying = call.getBool("isPlaying") ?? false
        let speed = call.getDouble("speed") ?? 1.0
        let position = call.getDouble("position")
        let duration = call.getDouble("duration")

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.jsBelievesPlaying = isPlaying
            self.nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? speed : 0.0
            if let pos = position {
                self.nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = pos
            }
            if let d = duration, d > 0 {
                self.nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = d
            }
            MPNowPlayingInfoCenter.default().nowPlayingInfo = self.nowPlayingInfo

            // NOTE: Do NOT call AVAudioSession.setActive(true) here. The session
            // is already activated once at launch (AppDelegate) and once in
            // load(). Calling it on every JS state push causes the WKWebView's
            // <audio> element to lose its audio session on real iOS devices —
            // playback starts, then dies after ~0.5s, and subsequent play()
            // calls silently reject. Simulator does not exhibit this; only
            // physical hardware does.
            call.resolve()
        }
    }

    @objc func setPosition(_ call: CAPPluginCall) {
        let position = call.getDouble("position") ?? 0
        let duration = call.getDouble("duration")
        let speed = call.getDouble("speed") ?? 1.0
        let isPlaying = call.getBool("isPlaying") ?? true

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = position
            self.nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? speed : 0.0
            if let d = duration, d > 0 {
                self.nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = d
            }
            MPNowPlayingInfoCenter.default().nowPlayingInfo = self.nowPlayingInfo
            call.resolve()
        }
    }

    @objc func setNavEnabled(_ call: CAPPluginCall) {
        let next = call.getBool("next") ?? false
        let prev = call.getBool("previous") ?? false
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.nextEnabled = next
            self.prevEnabled = prev
            MPRemoteCommandCenter.shared().nextTrackCommand.isEnabled = next
            MPRemoteCommandCenter.shared().previousTrackCommand.isEnabled = prev
            call.resolve()
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.nowPlayingInfo = [:]
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            do {
                try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
            } catch {
                // Non-fatal.
            }
            call.resolve()
        }
    }
}
