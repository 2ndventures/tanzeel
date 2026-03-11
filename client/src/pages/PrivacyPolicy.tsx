import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrivacyPolicyProps {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-background via-background/95 to-background">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background/50 to-background/90 dark:from-indigo-900/30 dark:via-slate-900/50 dark:to-black/70 pointer-events-none" />

      <div className="relative bg-card/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-border header-safe-padding shrink-0 z-10">
        <div className="px-8 pt-4 pb-6">
          <div className="flex items-center gap-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={onBack}
              className="size-12 rounded-full"
              aria-label="Go back"
              data-testid="button-back"
            >
              <ArrowLeft className="size-6" />
            </Button>
            <h1 className="font-heading text-4xl font-black tracking-tighter text-foreground">
              Privacy Policy
            </h1>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto min-h-0">
        <div className="px-8 max-w-3xl mx-auto pt-6">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-sm text-muted-foreground mb-8">
              <strong>Last Updated:</strong> November 14, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
              <p className="text-foreground/90 leading-relaxed">
                2nd Ventures, LLC ("we," "us," or "our") operates the Tanzeel mobile application (the "App"). 
                This Privacy Policy explains our practices regarding the collection, use, and disclosure of information 
                when you use our App. We are committed to protecting your privacy and complying with applicable privacy 
                laws, including GDPR (General Data Protection Regulation) and CCPA (California Consumer Privacy Act).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Information We Collect</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                <strong>Tanzeel does not collect, store, or transmit any personal data to our servers.</strong>
              </p>
              <p className="text-foreground/90 leading-relaxed">
                All app functionality operates entirely on your device using local storage. This includes:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2 mt-4">
                <li>Reading progress and bookmarks</li>
                <li>User preferences (theme, font size, reciter selection)</li>
                <li>Reading statistics and history</li>
                <li>Application settings</li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-4">
                This data is stored exclusively on your device and is never transmitted to us or any third party.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Third-Party Services</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                The App uses the following third-party service:
              </p>
              <div className="bg-muted/30 dark:bg-black/40 p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-3">Quran.com API</h3>
                <p className="text-foreground/90 leading-relaxed mb-3">
                  We use the Quran.com API to provide audio recitation and word-level timing data. When you play audio 
                  in the app, your device connects directly to Quran.com's content delivery network to stream the audio files.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  This connection may expose your IP address to Quran.com's servers. We recommend reviewing Quran.com's 
                  privacy policy for information about how they handle this data.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Data Storage and Security</h2>
              <p className="text-foreground/90 leading-relaxed">
                All user data is stored locally on your device using your device's native storage mechanisms. This data 
                remains under your control and can be deleted at any time by uninstalling the app or clearing the app's 
                data through your device settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">In-App Purchases</h2>
              <p className="text-foreground/90 leading-relaxed">
                The App may offer a one-time purchase option in the future. If implemented, all purchase transactions 
                will be processed through Apple's App Store or Google Play Store. We do not collect or store any payment 
                information. Please refer to Apple's or Google's privacy policies for information about how they handle 
                payment data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Children's Privacy</h2>
              <p className="text-foreground/90 leading-relaxed">
                Our App is suitable for users of all ages, including children. Because we do not collect any personal 
                information, we do not knowingly collect data from children under 13 (or the applicable age in your jurisdiction). 
                All data is stored locally on the device and remains under the control of the device owner.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                Since we do not collect or store any personal data on our servers, the following rights are inherently 
                protected:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li><strong>Right to Access:</strong> All your data is stored on your device and accessible to you at all times</li>
                <li><strong>Right to Delete:</strong> You can delete all app data by uninstalling the app or clearing app data in device settings</li>
                <li><strong>Right to Portability:</strong> Your data never leaves your device</li>
                <li><strong>Right to Opt-Out:</strong> No data collection means no opt-out is necessary</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">International Data Transfers</h2>
              <p className="text-foreground/90 leading-relaxed">
                We do not transfer any personal data internationally because we do not collect or store personal data. 
                The only data transfer that occurs is when your device connects to Quran.com's servers to stream audio 
                content, which is governed by Quran.com's privacy policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Changes to This Privacy Policy</h2>
              <p className="text-foreground/90 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the 
                new Privacy Policy in the app and updating the "Last Updated" date. You are advised to review this Privacy 
                Policy periodically for any changes. Changes are effective when posted in the app.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <div className="bg-muted/30 dark:bg-black/40 p-6 rounded-xl border border-border">
                <p className="text-foreground/90 mb-2"><strong>2nd Ventures, LLC</strong></p>
                <p className="text-foreground/90">Email: support@thirdventures.com</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">GDPR Compliance</h2>
              <p className="text-foreground/90 leading-relaxed">
                For users in the European Economic Area (EEA), we comply with GDPR requirements. Since we do not collect 
                personal data, most GDPR obligations do not apply. However, we maintain this privacy policy to ensure 
                transparency about our practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">CCPA Compliance</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                For California residents, we comply with the California Consumer Privacy Act (CCPA). We do not:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li>Collect personal information</li>
                <li>Sell personal information</li>
                <li>Share personal information for behavioral advertising</li>
                <li>Retain personal information</li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-4">
                Therefore, the rights to opt-out, delete, and access do not apply as there is no data collection.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
