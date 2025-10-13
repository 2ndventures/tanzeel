import VerseCard from '../VerseCard';

export default function VerseCardExample() {
  return (
    <VerseCard
      verseNumber={1}
      arabicText="بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
      transliteration="Bismillaahir Rahmaanir Raheem"
      translation="In the name of Allah, the Entirely Merciful, the Especially Merciful."
      showTransliteration={true}
    />
  );
}
