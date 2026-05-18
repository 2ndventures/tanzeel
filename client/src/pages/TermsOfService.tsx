import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TermsOfServiceProps {
  onBack: () => void;
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background via-background/95 to-background">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--glow-primary)/0.10)] via-background/50 to-background/90 pointer-events-none" />

      <div className="relative bg-card/90 backdrop-blur-xl border-b border-border header-safe-padding shrink-0 z-10">
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
              Terms of Service
            </h1>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto min-h-0 pb-nav-clearance">
        <div className="px-8 max-w-3xl mx-auto pt-6">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-sm text-muted-foreground mb-8">
              <strong>Last Updated:</strong> November 14, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Agreement to Terms</h2>
              <p className="text-foreground/90 leading-relaxed">
                These Terms of Service ("Terms") constitute a legally binding agreement between you and 2nd Ventures, LLC 
                ("Company," "we," "us," or "our") concerning your access to and use of the Tanzeel mobile application 
                (the "App"). By downloading, installing, or using the App, you agree to be bound by these Terms. If you do 
                not agree to these Terms, you may not access or use the App.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">License Grant</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, 
                non-sublicensable, revocable license to:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li>Download, install, and use the App on compatible devices that you own or control</li>
                <li>Access and use the App's features for your personal, non-commercial purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Restrictions</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                You agree that you will not:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li>Copy, modify, distribute, sell, or lease any part of the App</li>
                <li>Reverse engineer, decompile, or attempt to extract the source code of the App</li>
                <li>Remove, alter, or obscure any proprietary notices on the App</li>
                <li>Use the App for any illegal or unauthorized purpose</li>
                <li>Violate any applicable laws or regulations while using the App</li>
                <li>Interfere with or disrupt the App or servers or networks connected to the App</li>
                <li>Use any automated system to access the App</li>
                <li>Attempt to gain unauthorized access to any portion of the App</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Intellectual Property Rights</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                The App and its entire contents, features, and functionality (including but not limited to all information, 
                software, text, displays, images, video, audio, design, and selection and arrangement thereof) are owned by 
                2nd Ventures, LLC, its licensors, or other providers of such material and are protected by United States 
                and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary 
                rights laws.
              </p>
              <p className="text-foreground/90 leading-relaxed">
                The Quranic text, translations, and audio recitations are provided by third-party sources and remain the 
                intellectual property of their respective owners.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Purchases and Payments</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                If we offer a one-time purchase option or any other paid features in the future:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li>All purchases are processed through the Apple App Store or Google Play Store</li>
                <li>Payment terms are governed by the respective platform's terms and conditions</li>
                <li>All purchases are final and non-refundable except as required by applicable law</li>
                <li>Refund requests must be directed to Apple or Google, not to us</li>
                <li>We reserve the right to modify pricing at any time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">User Content and Conduct</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                While using the App, you agree to:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li>Use the App in a manner consistent with Islamic values and respect for the Holy Quran</li>
                <li>Not use the App to store, display, or transmit offensive, defamatory, or unlawful content</li>
                <li>Respect the religious nature of the content provided</li>
                <li>Not misrepresent the source or meaning of Quranic verses</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Disclaimer of Warranties</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                THE APP IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li>Warranties of merchantability, fitness for a particular purpose, or non-infringement</li>
                <li>Warranties that the App will be uninterrupted, timely, secure, or error-free</li>
                <li>Warranties regarding the accuracy, completeness, or reliability of any content</li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-4">
                While we strive for accuracy in presenting the Quranic text and translations, we do not warrant that all 
                content is free from errors. Users should consult qualified Islamic scholars for religious guidance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Limitation of Liability</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL 2ND VENTURES, LLC, ITS AFFILIATES, DIRECTORS, 
                EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, 
                INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li>Loss of profits, data, use, or goodwill</li>
                <li>Service interruption or data loss</li>
                <li>Cost of substitute products or services</li>
                <li>Any damages arising from your use of or inability to use the App</li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-4">
                OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE APP SHALL NOT EXCEED THE AMOUNT 
                YOU PAID US TO USE THE APP, IF ANY, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS LESS.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Indemnification</h2>
              <p className="text-foreground/90 leading-relaxed">
                You agree to indemnify, defend, and hold harmless 2nd Ventures, LLC and its affiliates, officers, directors, 
                employees, and agents from and against any claims, liabilities, damages, losses, costs, expenses, or fees 
                (including reasonable attorneys' fees) arising from: (a) your use of the App; (b) your violation of these 
                Terms; (c) your violation of any rights of another; or (d) any content you provide through the App.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Termination</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                We reserve the right to suspend or terminate your access to the App at any time, with or without cause, 
                with or without notice, effective immediately. Upon termination:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li>Your license to use the App will immediately cease</li>
                <li>You must cease all use of the App and delete all copies from your devices</li>
                <li>All provisions of these Terms that by their nature should survive termination shall survive</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Governing Law and Jurisdiction</h2>
              <p className="text-foreground/90 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, 
                United States, without regard to its conflict of law provisions. You agree to submit to the exclusive 
                jurisdiction of the state and federal courts located in Delaware for the resolution of any disputes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Dispute Resolution</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                Any dispute arising from these Terms or your use of the App shall be resolved through:
              </p>
              <ol className="list-decimal pl-6 text-foreground/90 space-y-2">
                <li><strong>Informal Negotiation:</strong> Contact us at support@2ndventures.ai to resolve the dispute informally</li>
                <li><strong>Binding Arbitration:</strong> If informal negotiation fails, the dispute shall be resolved through binding arbitration in accordance with the American Arbitration Association's rules</li>
                <li><strong>Class Action Waiver:</strong> You agree to resolve disputes on an individual basis and waive any right to participate in class actions</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Changes to Terms</h2>
              <p className="text-foreground/90 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of any material changes by 
                posting the updated Terms in the App and updating the "Last Updated" date. Your continued use of the App 
                after such modifications constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Third-Party Services</h2>
              <p className="text-foreground/90 leading-relaxed">
                The App may contain links to or integrate with third-party services (such as Quran.com). We are not 
                responsible for the content, privacy policies, or practices of any third-party services. Your use of 
                third-party services is at your own risk and subject to their respective terms and conditions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Severability</h2>
              <p className="text-foreground/90 leading-relaxed">
                If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited 
                or eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force 
                and effect and enforceable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Entire Agreement</h2>
              <p className="text-foreground/90 leading-relaxed">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and 2nd 
                Ventures, LLC regarding the use of the App and supersede all prior agreements and understandings, whether 
                written or oral.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Contact Information</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="bg-muted/30 dark:bg-black/40 p-6 rounded-xl border border-border">
                <p className="text-foreground/90 mb-2"><strong>2nd Ventures, LLC</strong></p>
                <p className="text-foreground/90">Email: support@2ndventures.ai</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Acknowledgment</h2>
              <p className="text-foreground/90 leading-relaxed">
                BY USING THE APP, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND AGREE TO BE BOUND BY THEM.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
