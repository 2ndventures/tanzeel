import { useState } from 'react';
import BottomNav from '../BottomNav';

export default function BottomNavExample() {
  const [activeTab, setActiveTab] = useState<"home" | "surah" | "settings">("home");

  return (
    <BottomNav
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        console.log('Tab changed to:', tab);
      }}
    />
  );
}
