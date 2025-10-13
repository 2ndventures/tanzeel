import VerseCard from '../VerseCard';

export default function VerseCardExample() {
  return (
    <div className="space-y-4">
      <VerseCard
        verseNumber={1}
        arabicText="بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
        transliteration="Bismillaahir Rahmaanir Raheem"
        translation="In the name of Allah, the Entirely Merciful, the Especially Merciful."
        showTransliteration={true}
        isPlaying={true}
      />
      <VerseCard
        verseNumber={2}
        arabicText="ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"
        transliteration="Alhamdu lillaahi Rabbil 'aalameen"
        translation="All praise is due to Allah, Lord of the worlds."
        showTransliteration={true}
        isPlaying={false}
      />
    </div>
  );
}
