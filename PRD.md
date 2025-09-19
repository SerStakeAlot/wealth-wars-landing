# Wealth Wars Landing Page - Product Requirements Document

Build a strategic landing page that positions Wealth Wars as the premier competitive strategy-idle battler on Solana.

**Experience Qualities**: 
1. Competitive - Creates urgency and FOMO around limited daily caps and strategic timing
2. Strategic - Emphasizes skill, timing, and resource management over luck
3. Professional - Builds trust through transparency and clear economic mechanics

**Complexity Level**: Content Showcase (information-focused)
- Primary goal is to educate and convert visitors into players by clearly explaining the unique competitive economy

## Essential Features

**Hero Section with Logo**
- Functionality: Display prominent Wealth Wars logo with compelling tagline
- Purpose: Immediate brand recognition and value proposition
- Trigger: Page load
- Progression: Logo display → tagline reveal → CTA visibility
- Success criteria: Logo renders properly with gold gradient, tagline communicates core value

**Social/Platform Redirects**
- Functionality: External links to X.com, Telegram, DexScreener
- Purpose: Drive traffic to community and trading platforms
- Trigger: Click on social buttons
- Progression: Click → new tab opens → user lands on correct platform
- Success criteria: All links open in new tabs to correct URLs

**Whitepaper Content Sections**
- Functionality: Digestible sections highlighting key game mechanics
- Purpose: Educate potential players on unique competitive elements
- Trigger: Scroll-triggered animations reveal content
- Progression: Scroll → section animates in → user reads → continues scrolling
- Success criteria: Core mechanics clearly explained, competitive advantages highlighted

**Call-to-Action Integration**
- Functionality: Primary CTA to enter the game/app
- Purpose: Convert educated visitors into players
- Trigger: Multiple CTAs throughout the page
- Progression: Interest built → CTA clicked → user redirected to game
- Success criteria: Clear, compelling CTAs that stand out visually

## Edge Case Handling
- **Slow connections**: Optimize images and use skeleton loading states
- **Mobile users**: Responsive design with touch-friendly social buttons
- **External link failures**: Graceful handling if social platforms are unreachable
- **Content overflow**: Proper text scaling on various screen sizes

## Design Direction
The design should feel competitive, strategic, and premium - like a high-stakes financial game meets sleek gaming interface. Professional enough to build trust around economic mechanics, exciting enough to convey the competitive thrill.

## Color Selection
Custom palette - Gold/black theme to reinforce "Wealth" branding with strategic accent colors

- **Primary Color**: Deep Black (oklch(0.1 0 0)) - Premium, serious foundation
- **Secondary Colors**: Rich Gold (oklch(0.8 0.15 85)) for wealth/success theming
- **Accent Color**: Electric Blue (oklch(0.65 0.2 240)) for CTAs and interactive elements  
- **Foreground/Background Pairings**: 
  - Background (Deep Black): Gold text (oklch(0.9 0.15 85)) - Ratio 12.1:1 ✓
  - Card (Dark Gray oklch(0.15 0 0)): Light text (oklch(0.95 0 0)) - Ratio 18.2:1 ✓
  - Primary (Electric Blue): White text (oklch(1 0 0)) - Ratio 8.7:1 ✓
  - Accent (Rich Gold): Black text (oklch(0.1 0 0)) - Ratio 11.8:1 ✓

## Font Selection
Typography should convey both technological sophistication and competitive gaming energy using Orbitron for headers (matching the logo) and a clean sans-serif for body text.

- **Typographic Hierarchy**: 
  - H1 (Logo): Orbitron 800/48px/tight spacing with gold gradient
  - H2 (Section Headers): Orbitron 600/32px/normal spacing  
  - H3 (Subsections): Inter Bold/24px/normal spacing
  - Body Text: Inter Regular/16px/relaxed line height
  - CTAs: Inter SemiBold/18px/wide letter spacing

## Animations
Subtle scroll-triggered reveals that build anticipation and emphasize the strategic, calculated nature of the game. Smooth transitions that feel premium without being distracting.

- **Purposeful Meaning**: Animations should reinforce the strategic, high-stakes nature of the game
- **Hierarchy of Movement**: Logo and hero elements get primary animation focus, content sections reveal progressively

## Component Selection
- **Components**: Cards for feature sections, Button for CTAs and social links, Badge for beta/status indicators
- **Customizations**: Gold gradient text treatment, premium dark theme cards, glowing hover effects on interactive elements
- **States**: Buttons with subtle glow animations, hover states that reinforce competitive energy
- **Icon Selection**: External link icons for social buttons, strategic game icons for feature highlights
- **Spacing**: Generous padding using 8px base grid, section spacing of 96px+ for breathing room
- **Mobile**: Responsive card stacking, touch-optimized social buttons, readable text scaling