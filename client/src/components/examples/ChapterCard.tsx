import ChapterCard from '../ChapterCard';

export default function ChapterCardExample() {
  return (
    <ChapterCard
      number={1}
      arabicName="Al-Fatihah"
      englishName="The Opener"
      verseCount={7}
      revelationType="Meccan"
      onClick={() => console.log('Chapter clicked')}
    />
  );
}
