# Quran Reading App - Design Guidelines

## Design Approach
**Pixel-Perfect Replication**: This project requires exact visual matching of the provided Reweb designs. Every color, spacing, font, and component must be identical to the original design screenshots.

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary Theme)**
- Primary Background: #1a1f2e (dark navy)
- Secondary Background: #0f1419 (deeper navy for contrast)
- Card/Component Background: #252d3d (slightly lighter navy)
- Primary Accent: #4d7cfe (blue - for verse numbers, active states, highlights)
- Text Primary: #ffffff (white)
- Text Secondary: #8b92a5 (gray for metadata, labels)

### B. Typography

**Font Families**
- Arabic Text: Specialized Arabic font (Amiri, Scheherazade, or similar) for Quran verses
- UI Text: System font (SF Pro/Roboto) for English interface elements
- Numbers: Tabular/monospace numerals for consistency

**Font Sizes & Weights**
- Chapter Numbers: Large, bold display
- Arabic Verses: 24-28px, medium weight
- Transliteration: 16px, regular weight
- Translation: 16px, regular weight  
- UI Labels: 14px, medium weight
- Secondary Text: 12-13px, regular weight

### C. Layout System

**Spacing Scale**: Use Tailwind units of 2, 3, 4, 6, 8, 12, 16, 20
- Card padding: p-4 to p-6
- Section gaps: gap-4 to gap-6
- Screen margins: px-4 to px-6
- Vertical rhythm: space-y-4 to space-y-6

**Border Radius**: Consistent 12px (rounded-xl) for all cards and components

### D. Component Library

**Chapter Cards**
- Rounded rectangle containers with #252d3d background
- Left: Large chapter number in blue circle
- Center: Arabic chapter name (bold) + English name
- Right: Verse count with gray text
- Subtle shadow for depth

**Audio Player**
- Gradient background bar for playback
- Play/pause button (blue accent)
- Seek slider with blue active track
- Time display (current/total)
- Speed control (1.0x button)
- Compact, fixed to appropriate position

**Settings Controls**
- Toggle switches: Gray when off, #4d7cfe when active
- Dropdowns: Dark background with subtle borders
- Section headers: Gray text, uppercase, small size
- Options grouped with subtle dividers

**Bottom Navigation**
- Fixed bottom bar with 3 tabs
- Icon + label combination
- Active state: Blue text and icon
- Inactive state: Gray (#8b92a5)

**Verse Display**
- Arabic text: Prominent, right-to-left, generous line spacing
- Blue verse numbers at start
- Transliteration: Below Arabic in gray
- Translation: Below transliteration in white
- Clear visual hierarchy between all three layers

### E. Navigation & Interaction

**Screen Transitions**: Smooth, native-feeling transitions between Home, Play, and Settings
**Scroll Behavior**: Smooth scrolling for chapter lists and verse displays
**Search**: Floating search bar on Home screen with icon and placeholder
**Animations**: Minimal, subtle - toggle switches, active states, screen transitions only

## Mobile-First Specifications

**Screen Structure**
- Full viewport height utilization
- Safe area considerations for notched devices
- Bottom navigation always accessible
- Content scrolls within safe zones

**Touch Targets**
- Minimum 44px height for all interactive elements
- Adequate spacing between tappable items
- Clear visual feedback on press (opacity/scale changes)

**Responsive Behavior**
- Single column layouts optimized for portrait
- Adaptive text sizing for readability
- Collapsible/expandable sections where needed

## Critical Design Constraints

1. **Exact Color Matching**: Use provided hex values precisely - no approximations
2. **Consistent Dark Theme**: All screens maintain cohesive dark navy aesthetic
3. **Arabic Typography Priority**: Ensure proper Arabic text rendering with appropriate fonts
4. **Component Consistency**: Buttons, toggles, cards must match across all screens
5. **Bottom Nav Persistence**: Navigation bar present on all main screens
6. **Audio Player Integration**: Seamlessly integrated into verse reading experience
7. **Settings Visual Grouping**: Clear sections with consistent styling for Display/Audio/Content groups

## Images
No hero images required - this is a utility-focused reading app with dark interface optimization.