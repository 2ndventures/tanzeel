import { useState } from 'react';
import SettingItem from '../SettingItem';

export default function SettingItemExample() {
  const [darkMode, setDarkMode] = useState(true);
  const [font, setFont] = useState('System');

  return (
    <div className="space-y-4 p-4">
      <SettingItem
        label="Dark Mode"
        sublabel="Use dark theme"
        type="toggle"
        value={darkMode}
        onToggle={(checked) => {
          setDarkMode(checked);
          console.log('Dark mode:', checked);
        }}
        testId="toggle-theme"
      />
      <SettingItem
        label="Font"
        sublabel="System"
        type="select"
        value={font}
        options={[
          { value: 'System', label: 'System' },
          { value: 'Amiri', label: 'Amiri' },
          { value: 'Traditional', label: 'Traditional' },
        ]}
        onSelect={(value) => {
          setFont(value);
          console.log('Font changed to:', value);
        }}
        testId="select-font"
      />
    </div>
  );
}
