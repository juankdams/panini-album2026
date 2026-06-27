---
name: Pitch Side Sticker Tracker
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#494455'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#7a7487'
  outline-variant: '#cbc3d8'
  surface-tint: '#6c31e9'
  primary: '#4a00b7'
  on-primary: '#ffffff'
  primary-container: '#6322e0'
  on-primary-container: '#d3c2ff'
  inverse-primary: '#cfbdff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#24fde8'
  on-secondary-container: '#007167'
  tertiary: '#364300'
  on-tertiary: '#ffffff'
  tertiary-container: '#4a5c00'
  on-tertiary-container: '#b3d900'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e8ddff'
  primary-fixed-dim: '#cfbdff'
  on-primary-fixed: '#22005d'
  on-primary-fixed-variant: '#5300cc'
  secondary-fixed: '#24fde8'
  secondary-fixed-dim: '#00decc'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#c8f300'
  tertiary-fixed-dim: '#afd500'
  on-tertiary-fixed: '#171e00'
  on-tertiary-fixed-variant: '#3d4c00'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Anton
    fontSize: 80px
    fontWeight: '400'
    lineHeight: 80px
  headline-xl:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 48px
  headline-lg:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 36px
  headline-md:
    fontFamily: Anton
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 28px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 32px
spacing:
  base: 8px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  stack-tight: 4px
---

## Brand & Style

This design system is built on an **Energetic & Celebratory** aesthetic, drawing direct inspiration from the FIFA World Cup 26 visual identity. The brand personality is bold, inclusive, and rhythmic, moving away from static layouts toward a dynamic, pattern-driven experience that captures the excitement of a global tournament.

The design style is **High-Contrast / Bold** mixed with **Modernism**. It utilizes heavy, stacked typography and a maximalist color philosophy. Key to this style is the "We Are 26" aesthetic—a sense of collective unity conveyed through interlocking shapes and a "stacked" visual hierarchy. The UI should feel like a premium sticker album brought to life through vibrant motion and architectural geometry.

## Colors

The palette is a high-energy spectrum designed for maximum impact. Instead of a single brand color, this design system uses a "Tournament Spectrum" approach.

- **Primary (Vibrant Purple):** Used for main actions and deep container backgrounds.
- **Secondary (Teal):** Used for highlighting progress, interactive states, and "Unify" pattern elements.
- **Tertiary (Lime Green):** Used for success states, celebratory badges, and "Amplify" accents.
- **Accent (Bright Red):** Reserved for urgent notifications and energetic "Goal" moments.
- **Neutral:** A stark black-and-white foundation is critical to ground the vibrant colors and ensure maximum contrast for typography.

Color should be applied in large, flat blocks or within the prescribed geometric patterns to maintain the tournament’s visual density.

## Typography

The typography system mirrors the tournament's dual-font strategy.

1.  **Display & Headlines:** Use **Anton** to replicate the "FOOTBALL LEGACY" aesthetic. It is heavy, condensed, and impactful. For "We Are 26" style headers, use extremely tight leading (line height) to create a "stacked" effect where lines of text almost touch.
2.  **Body & UI:** Use **Noto Sans** for all functional text. It provides the necessary legibility to balance the aggressive headline style.

All headlines should be set in **uppercase**. For critical branding moments, use a "Stacked Text" treatment where words are broken and layered vertically to fill a square bounding box.

## Layout & Spacing

The layout follows a **Fluid Grid** model that emphasizes rhythm and repetition.

- **Grid:** A 12-column system for desktop and a 4-column system for mobile.
- **Rhythm:** Spacing is strictly based on an 8px scale. However, branding elements use "stack-tight" (4px) spacing to achieve the condensed tournament look.
- **Patterns as Layout:** Use the **UNIFY** (curved, interlocking) and **AMPLIFY** (radial, concentric) patterns as functional backgrounds for specific sections. For example, "UNIFY" for collection overviews and "AMPLIFY" for pack-opening or "moment" screens.
- **Margins:** Generous outer margins are used to let the high-intensity colors and patterns breathe, preventing the UI from feeling cluttered despite its vibrancy.

## Elevation & Depth

This design system rejects traditional shadows in favor of **Tonal Layers** and **Bold Borders**.

- **Flat Depth:** Hierarchy is established through color blocking. Higher elevation elements are represented by high-contrast color shifts (e.g., a Teal button on a Purple background).
- **Hard Cuts:** Avoid soft glows. If an element needs to "pop," use a thick (2px - 4px) solid black or white border.
- **Graphic Overlays:** Use semi-transparent geometric shapes from the tournament pattern library to create a sense of depth within containers without relying on skeuomorphic shadows.

## Shapes

The shape language is primarily **Sharp (0px)** to maintain the architectural feel of the tournament branding. 

Circular elements are only used when they are perfect circles (e.g., player avatars or specific sticker icons), reflecting the "26" graphic's geometry. All UI containers, buttons, and input fields should use hard 90-degree corners to reinforce the bold, professional nature of the "Football Legacy" style.

## Components

- **Buttons:** Sharp-edged with a 2px solid black border. Use Primary Purple or Secondary Teal for the fill. Text must be Anton, uppercase, and centered.
- **Sticker Cards:** These are the hero components. Use a standard aspect ratio with a thin white border. The background of the card should feature the "UNIFY" pattern at low opacity.
- **Progress Bars:** Use the "AMPLIFY" pattern as the fill for progress bars to create a sense of movement and energy as the user completes their collection.
- **Chips/Badges:** Small, high-contrast rectangles (e.g., Black background with Lime Green text) using Noto Sans Bold.
- **Input Fields:** Flat white background, 2px black border, sharp corners. Focus state is indicated by a thick Primary Purple bottom border.
- **Headers:** Section headers should use the "Stacked" typography style, occupying a large vertical footprint to act as a visual anchor.