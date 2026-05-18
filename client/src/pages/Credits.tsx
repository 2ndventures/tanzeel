import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditsProps {
  onBack: () => void;
}

export default function Credits({ onBack }: CreditsProps) {
  const reciters: Array<{ name: string; arabic: string; style: string; cdn: string }> = [
    { name: "Mishary Rashid Alafasy", arabic: "مشاري راشد العفاسي", style: "Murattal", cdn: "everyayah.com" },
    { name: "Abdul Basit Abdul Samad", arabic: "عبد الباسط عبد الصمد", style: "Murattal", cdn: "everyayah.com" },
    { name: "Abdul Basit Abdul Samad", arabic: "عبد الباسط عبد الصمد", style: "Mujawwad", cdn: "everyayah.com" },
    { name: "Abdurrahmaan As-Sudais", arabic: "عبد الرحمن السديس", style: "Murattal", cdn: "everyayah.com" },
    { name: "Abu Bakr Ash-Shaatree", arabic: "أبو بكر الشاطري", style: "Murattal", cdn: "everyayah.com" },
    { name: "Ali Al-Hudhaify", arabic: "علي الحذيفي", style: "Murattal", cdn: "everyayah.com" },
    { name: "Hani Rifai", arabic: "هاني الرفاعي", style: "Murattal", cdn: "everyayah.com" },
    { name: "Akram Al-Alaqimy", arabic: "أكرم العلاقمي", style: "Murattal", cdn: "everyayah.com" },
  ];

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
              Credits
            </h1>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto min-h-0 pb-nav-clearance">
        <div className="px-8 max-w-3xl mx-auto pt-6">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-sm text-muted-foreground mb-8">
              Tanzeel is a free Quran reading and listening app. Its content — the sacred text,
              translations, audio recitations, and word-level timing data — is made possible by the
              generous work of the organizations and individuals listed below. This page credits each
              source and links to its official terms of use.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Arabic Quran Text</h2>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li><strong>Script:</strong> Uthmani (Mushaf al-Madinah)</li>
                <li>
                  <strong>Primary source:</strong>{" "}
                  <a
                    href="https://api-docs.quran.com/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary underline hover:no-underline"
                    data-testid="link-quran-api"
                  >
                    Quran.com API
                  </a>{" "}
                  (verse text endpoints)
                </li>
                <li>
                  <strong>Upstream source:</strong>{" "}
                  <a
                    href="https://tanzil.net/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary underline hover:no-underline"
                    data-testid="link-tanzil"
                  >
                    Tanzil Project
                  </a>{" "}
                  — the canonical digital Mushaf used by Quran.com and most modern Quran applications
                </li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-4">
                The Tanzeel app also includes the <strong>IndoPak</strong> script and a color-coded{" "}
                <strong>Tajweed</strong> rendering, both derived from the same Tanzil project text data.
              </p>
              <div className="bg-muted/30 dark:bg-black/40 p-6 rounded-xl border border-border mt-4">
                <h3 className="text-lg font-semibold text-foreground mb-3">Terms of use</h3>
                <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                  <li>
                    Quran.com API:{" "}
                    <a
                      href="https://api-docs.quran.com/docs/quran.com_api/quran-text"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary underline hover:no-underline break-all"
                    >
                      api-docs.quran.com/docs/quran.com_api/quran-text
                    </a>
                  </li>
                  <li>
                    Tanzil terms of use:{" "}
                    <a
                      href="https://tanzil.net/docs/terms_of_use"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary underline hover:no-underline break-all"
                    >
                      tanzil.net/docs/terms_of_use
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">2. English Translation</h2>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li><strong>Translation:</strong> <em>The Qur'an: English Meanings</em></li>
                <li><strong>Translator:</strong> Saheeh International</li>
                <li>
                  <strong>Distributed via:</strong>{" "}
                  <a
                    href="https://api-docs.quran.com/docs/quran.com_api/translations"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary underline hover:no-underline"
                    data-testid="link-quran-translations"
                  >
                    Quran.com translations API
                  </a>
                </li>
              </ul>
              <div className="bg-muted/30 dark:bg-black/40 p-6 rounded-xl border border-border mt-4">
                <h3 className="text-lg font-semibold text-foreground mb-3">Terms of use</h3>
                <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                  <li>
                    Quran.com:{" "}
                    <a
                      href="https://quran.com/about-us"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary underline hover:no-underline break-all"
                    >
                      quran.com/about-us
                    </a>
                  </li>
                  <li>
                    Saheeh International publisher (Abul-Qasim Publishing House / Al-Muntada Al-Islami):
                    rights reserved for the print edition; digital distribution is permitted via the
                    Quran.com API under their stated terms.
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">3. Audio Recitations</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                Tanzeel ships with eight curated reciters. Verse-by-verse audio is streamed from the
                public CDNs operated by{" "}
                <a
                  href="https://everyayah.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary underline hover:no-underline"
                >
                  EveryAyah
                </a>{" "}
                and{" "}
                <a
                  href="https://quranicaudio.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary underline hover:no-underline"
                >
                  QuranicAudio
                </a>
                .
              </p>
              <div className="bg-muted/30 dark:bg-black/40 rounded-xl border border-border overflow-hidden mt-4">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                  <div className="col-span-6">Reciter</div>
                  <div className="col-span-3">Style</div>
                  <div className="col-span-3 text-right">CDN</div>
                </div>
                {reciters.map((r, i) => (
                  <div
                    key={`${r.name}-${r.style}-${i}`}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm ${
                      i < reciters.length - 1 ? "border-b border-border/50" : ""
                    }`}
                    data-testid={`row-reciter-${i}`}
                  >
                    <div className="col-span-6">
                      <div className="text-foreground font-medium">{r.name}</div>
                      <div className="text-foreground/70 font-arabic text-base mt-0.5">{r.arabic}</div>
                    </div>
                    <div className="col-span-3 text-foreground/80">{r.style}</div>
                    <div className="col-span-3 text-right text-foreground/80 break-all">{r.cdn}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                QuranicAudio is referenced as a fallback / alternate source for the same recitations.
              </p>
              <div className="bg-muted/30 dark:bg-black/40 p-6 rounded-xl border border-border mt-4">
                <h3 className="text-lg font-semibold text-foreground mb-3">Terms of use</h3>
                <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                  <li>
                    EveryAyah:{" "}
                    <a
                      href="https://everyayah.com/data/status.php"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary underline hover:no-underline break-all"
                    >
                      everyayah.com/data/status.php
                    </a>
                  </li>
                  <li>
                    QuranicAudio:{" "}
                    <a
                      href="https://quranicaudio.com/about"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary underline hover:no-underline break-all"
                    >
                      quranicaudio.com/about
                    </a>
                  </li>
                  <li>
                    Individual reciters retain copyright over their performances; the CDNs above
                    distribute the recordings with the reciters' consent or under public-distribution
                    licenses.
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">4. Word-Level Timing Data</h2>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li>
                  <strong>Source:</strong>{" "}
                  <a
                    href="https://api-docs.quran.com/docs/quran.com_api/recitations"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary underline hover:no-underline"
                  >
                    Quran.com API — Recitations endpoint
                  </a>
                </li>
                <li>
                  <strong>Data:</strong> Per-word start/end timestamps used to drive the
                  word-by-word highlight while audio plays.
                </li>
              </ul>
              <div className="bg-muted/30 dark:bg-black/40 p-6 rounded-xl border border-border mt-4">
                <h3 className="text-lg font-semibold text-foreground mb-3">Terms of use</h3>
                <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                  <li>
                    Quran.com API:{" "}
                    <a
                      href="https://api-docs.quran.com/docs/quran.com_api/introduction"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary underline hover:no-underline break-all"
                    >
                      api-docs.quran.com/docs/quran.com_api/introduction
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Acknowledgements</h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                Tanzeel is built on the shoulders of decades of volunteer work in the digital Quran
                community. We gratefully acknowledge:
              </p>
              <ul className="list-disc pl-6 text-foreground/90 space-y-2">
                <li>
                  <strong>The Tanzil Project</strong> — for producing and maintaining the verified,
                  freely-licensed digital Quran text that underpins essentially every modern Quran app.
                </li>
                <li>
                  <strong>Quran.com</strong> — for operating an open, well-documented API that exposes
                  verses, translations, and timing data to developers worldwide.
                </li>
                <li>
                  <strong>Saheeh International</strong> — for the careful, scholarly English translation
                  that makes the meaning of the Quran accessible to millions.
                </li>
                <li>
                  <strong>EveryAyah.com</strong> — for hosting verse-segmented MP3 archives of dozens
                  of reciters and serving them at no cost to the community.
                </li>
                <li>
                  <strong>QuranicAudio.com</strong> — for curating high-quality recitation collections
                  and providing reliable streaming infrastructure.
                </li>
                <li>
                  <strong>The reciters</strong> listed above — for the gift of their voices, time, and
                  devotion in recording the Quran for the benefit of the Ummah.
                </li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-4">
                May Allah reward every individual and organization whose work made this app possible.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Reporting Issues</h2>
              <p className="text-foreground/90 leading-relaxed">
                If you are a rights holder and believe your content is being used in a way that does
                not align with your terms, please contact the Tanzeel team at{" "}
                <a
                  href="mailto:support@2ndventures.ai"
                  className="text-primary underline hover:no-underline"
                  data-testid="link-contact-email"
                >
                  support@2ndventures.ai
                </a>
                . We will respond promptly and remove or correct the attribution as needed.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
