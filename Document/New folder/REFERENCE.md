# ACESS System — Authoritative References & Best-Practice Guide

**Adaptive Cognitive & Educational Skill Support (ACESS)**
Compiled reference document covering technical stack, H5P, Moodle, accessibility standards, adaptive learning, LMS patterns, and academic research.

---

## Section A: Technical Stack References

### A1. Next.js App Router — Server vs Client Components

**Title:** Next.js App Router — Official Documentation
**Organization:** Vercel / Next.js Team
**Year:** 2024–2025 (continuously updated)
**URL:** https://nextjs.org/docs/app
**Summary:** The App Router uses React Server Components (RSC), Suspense, and Server Functions. All components default to server-rendered; only those marked `'use client'` ship JavaScript to the browser, enabling selective hydration.
**ACESS relevance:** Underpins ACESS's page architecture — server components for course listings, learner profiles, and data fetching; client components only where interactivity is needed (editors, dashboards, real-time progress bars).

---

**Title:** Getting Started: Server and Client Components
**Organization:** Vercel / Next.js Team
**Year:** 2025
**URL:** https://nextjs.org/docs/app/getting-started/server-and-client-components
**Summary:** Defines when to use each component type: server for data access and layouts, client (`'use client'`) for state, event handlers, and browser APIs. The mental model is "server-first, client-islands."
**ACESS relevance:** Directly guides ACESS component design — lesson content renders on the server, interactive quiz and editor components run on the client.

---

### A2. Tailwind CSS v4 — Theming & Utility-First

**Title:** Tailwind CSS v4.0 — Official Blog Announcement
**Organization:** Tailwind Labs
**Year:** 2025
**URL:** https://tailwindcss.com/blog/tailwindcss-v4
**Summary:** v4 is a ground-up rewrite introducing CSS-first configuration via the `@theme` directive, a new Oxide engine (3.5× faster full builds, 100× faster incremental), native cascade layers, and wide-gamut P3 OKLCH color palettes. No more `tailwind.config.js` is needed.
**ACESS relevance:** ACESS's multi-theme accessibility profiles (dyslexia-friendly cream palette, high-contrast, dark mode) are all defined as `@theme` CSS variables, keeping every theme override in one CSS file with no JS config.

---

**Title:** Theme Variables — Core Concepts
**Organization:** Tailwind Labs
**Year:** 2025
**URL:** https://tailwindcss.com/docs/theme
**Summary:** Explains how `@theme` CSS variables automatically generate utility classes. Defining `--color-primary-500` creates a `bg-primary-500` utility without extra config. Distinguishes `@theme` (generates utilities) from `:root` (raw CSS variables).
**ACESS relevance:** ACESS accessibility profiles swap `--color-background`, `--font-family`, and `--line-height` theme variables dynamically, instantly reflecting throughout all components without component code changes.

---

### A3. shadcn/ui — Radix + CVA + tailwind-merge Pattern

**Title:** shadcn/ui — Official Component Library
**Organization:** shadcn
**Year:** 2024–2025 (continuously updated)
**URL:** https://ui.shadcn.com/
**Summary:** A collection of copy-paste React components built on Radix UI primitives and styled with Tailwind CSS. Instead of a published npm package, component source code is owned by the developer. CVA (class-variance-authority) manages variant styling; `cn()` via tailwind-merge handles class conflicts.
**ACESS relevance:** All ACESS UI components (buttons, dialogs, tabs, dropdowns, cards) are built on shadcn/ui. Owning the component code means ACESS can adjust any component for accessibility or brand compliance without fighting a black-box library.

---

**Title:** The Anatomy of shadcn/ui Components
**Organization:** Manu Arora (independent technical breakdown)
**Year:** 2023
**URL:** https://manupa.dev/blog/anatomy-of-shadcn-ui
**Summary:** Deep-dives the three-layer architecture: Radix UI for behavior/accessibility semantics, Tailwind CSS for visual styling, and CVA (`class-variance-authority`) for variant management. Shows how `badgeVariants = cva(...)` separates styling from rendering.
**ACESS relevance:** Explains the exact pattern used throughout ACESS's `components/ui/` directory — every component variant (e.g., dyslexia mode, high-contrast) is a CVA variant, not a separate component.

---

### A4. Radix UI — WAI-ARIA Accessibility Primitives

**Title:** Radix Primitives — Accessibility Overview
**Organization:** WorkOS / Radix UI
**Year:** 2024 (continuously updated)
**URL:** https://www.radix-ui.com/primitives/docs/overview/accessibility
**Summary:** Radix Primitives follow WAI-ARIA authoring guidelines and are tested across major browsers and assistive technologies. They handle aria/role attributes, focus management, focus trapping, and keyboard navigation automatically for Dialog, Tabs, Accordion, DropdownMenu, Popover, and more.
**ACESS relevance:** Every ACESS modal, dropdown, and navigation component inherits WAI-ARIA compliance from Radix without manual ARIA attribute writing, critical for learners using screen readers.

---

**Title:** Radix Primitives — Introduction
**Organization:** WorkOS / Radix UI
**Year:** 2024
**URL:** https://www.radix-ui.com/primitives/docs/overview/introduction
**Summary:** Explains the goal: provide headless, unstyled components for common UI patterns (Accordion, Dialog, Combobox, Tabs, Slider, Select) that are inaccessible or missing in native HTML. Each component is independently versioned.
**ACESS relevance:** ACESS uses Radix Dialog for lesson modals, Radix Tabs for course navigation, and Radix Accordion for collapsible settings — all receiving keyboard and screen reader support out of the box.

---

**Title:** Radix Primitives — Dialog Component
**Organization:** WorkOS / Radix UI
**Year:** 2024
**URL:** https://www.radix-ui.com/primitives/docs/components/dialog
**Summary:** Adheres to the Dialog WAI-ARIA design pattern. Automatically traps focus within the dialog, manages `aria-describedby`, and closes on Escape. Supports controlled and uncontrolled modes.
**ACESS relevance:** ACESS uses Dialog for settings panels, lesson completions, and confirmation dialogs. Focus trapping is critical for learners using keyboard or screen reader navigation.

---

### A5. Tiptap — Rich Text Editor Extensibility

**Title:** Tiptap Editor — Get Started
**Organization:** Überdosis (Tiptap)
**Year:** 2025 (continuously updated)
**URL:** https://tiptap.dev/docs/editor/getting-started/overview
**Summary:** Tiptap is a headless rich-text editor framework built on ProseMirror. It uses an extension-based architecture — every feature (bold, image, table, mentions, custom nodes) is an extension. Works with React, Vue, Svelte, and plain JS.
**ACESS relevance:** ACESS educators use Tiptap to author lesson content. Its extension model allows ACESS to add custom blocks (e.g., dyslexia-mode font toggle, embedded H5P, read-aloud buttons) without forking the editor.

---

**Title:** Tiptap React Integration
**Organization:** Überdosis (Tiptap)
**Year:** 2025
**URL:** https://tiptap.dev/docs/editor/getting-started/install/react
**Summary:** Shows the `useEditor` hook pattern, extension array, and declarative `<Tiptap>` component. Notes that `immediatelyRender: false` must be set for SSR (Next.js) compatibility to avoid hydration mismatches.
**ACESS relevance:** Essential for ACESS's Next.js-based lesson editor — the SSR flag prevents hydration errors; `EditorContext` shares the editor state across toolbar, bubble menu, and lesson-save components.

---

### A6. Motion (Framer Motion) — React Animation Library

**Title:** Motion for React — Get Started
**Organization:** Motion (formerly Framer Motion)
**Year:** 2025
**URL:** https://motion.dev/docs/react
**Summary:** Motion for React (rebranded from Framer Motion in mid-2025, now imported from `motion/react`) is a React animation library using a hybrid engine: Web Animations API for 120fps performance, with JavaScript fallback for spring physics and gestures. Trusted by Framer and Figma.
**ACESS relevance:** ACESS uses Motion for page transition animations, lesson progress celebrations, and UI microinteractions. All imports updated to `motion/react`.

---

**Title:** Creating Accessible Animations in React — Motion Guide
**Organization:** Motion (Framer Motion)
**Year:** 2025
**URL:** https://motion.dev/docs/react-accessibility
**Summary:** Documents the `reducedMotion="user"` prop on `MotionConfig` (disables transform/layout animations site-wide respecting OS settings) and the `useReducedMotion()` hook for per-component control. `reducedMotion="user"` preserves opacity/color transitions while disabling movement.
**ACESS relevance:** ACESS's Distraction-Free Mode and ADHD/ASD accommodation profiles use `reducedMotion="always"` via MotionConfig. The `useReducedMotion()` hook is used per-component to replace slide animations with fades.

---

### A7. Supabase — Real-time, Row Level Security, SSR

**Title:** Row Level Security — Supabase Docs
**Organization:** Supabase
**Year:** 2025 (continuously updated)
**URL:** https://supabase.com/docs/guides/database/postgres/row-level-security
**Summary:** Documents PostgreSQL RLS policies as "implicit WHERE clauses." When RLS is enabled on a table, all queries are filtered by policies using `auth.uid()`. The anon key is public; RLS is the only barrier between the key and unauthorized data access.
**ACESS relevance:** ACESS's learner data isolation — progress records, accessibility profiles, notes — relies on RLS policies ensuring learners see only their own rows and educators see only their enrolled students' data.

---

**Title:** Realtime Authorization — Supabase Docs
**Organization:** Supabase
**Year:** 2025
**URL:** https://supabase.com/docs/guides/realtime/authorization
**Summary:** Realtime Broadcast and Presence channels are secured via RLS policies on the `realtime.messages` table. Users only receive real-time updates for rows their SELECT policy permits. Authorization is evaluated when the WebSocket connection is established.
**ACESS relevance:** ACESS's live class features (educator sees learner progress in real time, leaderboard updates) use Supabase Realtime with RLS ensuring cross-learner data never leaks through subscriptions.

---

### A8. Recharts — Accessible Data Visualization

**Title:** Recharts — Composable React Charting Library
**Organization:** Recharts
**Year:** 2024
**URL:** https://recharts.org/
**Summary:** A lightweight SVG-based charting library built on D3 submodules, offering composable components (`<LineChart>`, `<BarChart>`, `<PieChart>`, `<ResponsiveContainer>`) that integrate naturally with React's component model. Used by shadcn/ui's chart components.
**ACESS relevance:** ACESS educator and admin dashboards use Recharts for learner progress charts, completion rates, and module engagement analytics, all wrapped in shadcn/ui's chart component layer.

---

### A9. next-themes — Dark Mode Implementation

**Title:** next-themes — Perfect Next.js Dark Mode
**Organization:** Paco Coursey (pacocoursey)
**Year:** 2024
**URL:** https://github.com/pacocoursey/next-themes
**Summary:** Injects a blocking script in `<head>` before rendering to read the user's stored theme preference from localStorage, preventing the flash-of-incorrect-theme (FOIT) issue common in SSR. Wraps the app in a `ThemeProvider` and exposes `useTheme()` hook.
**ACESS relevance:** ACESS uses next-themes to support light, dark, and custom accessibility themes (high-contrast, sepia/cream for dyslexia). `suppressHydrationWarning` on `<html>` is required because next-themes mutates the class before React hydration.

---

---

## Section B: H5P Interactive Content

### B1. H5P Core Architecture

**Title:** H5P — Create and Share Rich HTML5 Content
**Organization:** H5P Group
**Year:** 2025 (continuously updated)
**URL:** https://h5p.org/
**Summary:** H5P (HTML5 Package) is a free, open-source content collaboration framework. Content is authored in-browser, stored as `.h5p` zip files, and rendered by a JavaScript runtime. It integrates with Moodle, WordPress, Drupal via plugins, and with Canvas, Brightspace, and Blackboard via LTI.
**ACESS relevance:** ACESS can embed H5P content (Interactive Videos, Quizzes, Flashcards) from its Moodle integration, leveraging H5P's existing content library without rebuilding interactive content types.

---

**Title:** Content Type Development — H5P Architecture
**Organization:** H5P Group
**Year:** 2024
**URL:** https://h5p.org/library-development
**Summary:** H5P uses a modular library architecture. Each content type is a library with a `library.json` manifest, JavaScript, and CSS. Libraries can depend on other libraries; custom content types are created by authoring a new library with `H5P.init()`.
**ACESS relevance:** Explains how ACESS could create custom H5P content types for dyslexia/ADHD-adapted interactions (e.g., reading-pace controls, simplified drag-and-drop), or wrap existing types with accessibility overlays.

---

### B2. H5P Content Types and Accessibility

**Title:** H5P Interactive Content Guide for Moodle 2026
**Organization:** MooDIY Blog
**Year:** 2026
**URL:** https://blog.moodiycloud.com/h5p-interactive-content-guide-moodle-2026
**Summary:** Catalogues H5P content types and their accessibility features. Keyboard navigation, ARIA labels, focus indicators, and high-contrast support are present across content types. Notes that Drag and Drop has a list-based keyboard fallback but differs from the visual experience.
**ACESS relevance:** Guides ACESS educators on which H5P types are fully accessible for learners with motor impairments (avoid Drag and Drop for assessments) and which are safe for screen reader users (Quiz, Flashcards, Interactive Video).

---

**Title:** H5P and Inclusive Learning — UBC Wiki
**Organization:** University of British Columbia
**Year:** 2024
**URL:** https://wiki.ubc.ca/Documentation:H5P
**Summary:** Documents how H5P supports multi-modal strategies. Specifically notes improvements in learning for deaf and hard-of-hearing language learners, benefits for metacognition and retrieval practice, and UDL design guidelines for H5P authors (avoid images of text, provide introductions).
**ACESS relevance:** Provides evidence-based guidance for ACESS educators authoring H5P content — avoid images of text (screen reader incompatible), chunk content, align H5P interactions to learning objectives.

---

### B3. H5P in Moodle — mod_h5pactivity Integration

**Title:** H5P — MoodleDocs
**Organization:** Moodle HQ
**Year:** 2025
**URL:** https://docs.moodle.org/502/en/H5P
**Summary:** In Moodle, H5P content is managed via the Content Bank. Teachers create or upload `.h5p` files, add them as H5P activities in courses, and grades are reported. `mod_h5pactivity` sends xAPI statements. LUMI desktop app can author H5P offline.
**ACESS relevance:** Documents the exact pathway for ACESS's Moodle-style H5P workflow: educators upload to Content Bank → embed in courses → learner scores feed back into ACESS's progress tracking via xAPI.

---

---

## Section C: Moodle LMS Architecture & Patterns

### C1. Moodle Core Architecture

**Title:** Moodle Architecture — Developer Documentation
**Organization:** Moodle HQ
**Year:** 2024
**URL:** https://docs.moodle.org/dev/Moodle_architecture
**Summary:** Describes Moodle's LAMP-based architecture (Linux, Apache, MySQL, PHP) with a pluggable subsystem: courses/activities, authentication plugins, enrolment plugins, repository plugins. Courses are sequences of activities organized into sections, with users enrolled in roles.
**ACESS relevance:** Explains the reference architecture ACESS mirrors: course → sections → activities, with user roles (admin/educator/learner) mapped to Moodle's manager/teacher/student equivalents.

---

**Title:** Understanding the Moodle Architecture — Packt+
**Organization:** Packt Publishing
**Year:** 2024
**URL:** https://subscription.packtpub.com/book/web-development/9781801816724/2/ch02lvl1sec08
**Summary:** The Moodle Core layer stores courses, users, roles, groups, competencies, learning plans, and grades in a database, and files in a separate `moodledata` directory. Covers plugin architecture: blocks, modules, authentication, enrolment, and theme systems.
**ACESS relevance:** ACESS's database schema mirrors Moodle's separation of relational metadata (Supabase PostgreSQL) from file storage (Supabase Storage), with analogous plugin-style extension points.

---

### C2. Moodle Role-Based Access Control

**Title:** Access API — Moodle Developer Resources
**Organization:** Moodle HQ
**Year:** 2025
**URL:** https://moodledev.io/docs/5.0/apis/subsystems/access
**Summary:** Moodle uses a context-hierarchy RBAC model. Roles are sets of capabilities assigned in contexts (System → Course Category → Course → Module). `has_capability()` checks permissions. Key system roles: Manager, Course Creator, Teacher, Non-editing Teacher, Student, Guest.
**ACESS relevance:** ACESS's permission model (Admin > Educator > Learner) is a simplified version of Moodle's RBAC. Supabase RLS policies enforce the same isolation: educators only see their enrolled learners; learners only see their own progress.

---

**Title:** Role-Based Access Control with Moodle
**Organization:** Catalyst IT Australia
**Year:** 2026
**URL:** https://www.catalyst-au.net/blog/role-based-access-control-moodle
**Summary:** Explains Moodle RBAC best practices including minimizing global roles, the "Authenticated User" base role, and avoiding over-privileged role assignments. Covers the Principle of Least Privilege and context-scoped role inheritance.
**ACESS relevance:** Validates ACESS's decision to have educators scoped to their courses (not site-wide) and admins with elevated but audited access, rather than a flat permission model.

---

### C3. Moodle Course Management & Completion

**Title:** Moodle Architecture — Open Source Applications
**Organization:** The Architecture of Open Source Applications (aosabook.org)
**Year:** 2023
**URL:** https://aosabook.org/en/v2/moodle.html
**Summary:** Deep technical breakdown of Moodle's permissions system (ALLOW, PREVENT, PROHIBIT, INHERIT), context tree, and language pack system. Explains how role permissions aggregate at query time.
**ACESS relevance:** Provides the authoritative design reference for ACESS's capability-check pattern — centralizing permission logic in database RLS policies rather than scattered application code.

---

---

## Section D: E-Learning Accessibility Standards & Guidelines

### D1. WCAG 2.2 — Four Principles

**Title:** Web Content Accessibility Guidelines (WCAG) 2.2
**Organization:** W3C Web Accessibility Initiative (WAI)
**Year:** October 2023 (ISO/IEC 40500:2025 as of October 2025)
**URL:** https://www.w3.org/TR/WCAG22/
**Summary:** The international standard for web accessibility. Organized around four principles (POUR): Perceivable, Operable, Understandable, Robust. Contains 13 guidelines and 86 testable success criteria at three levels (A, AA, AAA). WCAG 2.2 adds 9 new criteria over 2.1, including Focus Appearance (2.4.13), Target Size Minimum (2.5.8), and Accessible Authentication (3.3.8).
**ACESS relevance:** ACESS targets WCAG 2.2 Level AA as its baseline, covering all learner interactions — keyboard navigation, sufficient color contrast, error identification, accessible authentication — especially critical for learners with motor and visual impairments.

---

**Title:** WCAG 2 Overview — WAI
**Organization:** W3C Web Accessibility Initiative (WAI)
**Year:** 2025
**URL:** https://www.w3.org/WAI/standards-guidelines/wcag/
**Summary:** Overview of WCAG 2.0, 2.1, and 2.2 with links to supporting documents. Notes backward compatibility: content conforming to WCAG 2.2 also conforms to 2.1 and 2.0. Links to Understanding WCAG 2.2, Techniques, and Quick Reference.
**ACESS relevance:** The Quick Reference (linked here) is ACESS developers' day-to-day conformance checklist during component QA.

---

### D2. WAI-ARIA Authoring Practices

**Title:** ARIA Authoring Practices Guide (APG)
**Organization:** W3C Web Accessibility Initiative (WAI)
**Year:** 2024 (continuously updated)
**URL:** https://www.w3.org/WAI/ARIA/apg/
**Summary:** The W3C's definitive reference for implementing accessible interactive components — dialogs, tabs, accordions, carousels, combo boxes, tree views, and more. Provides keyboard interaction models, required ARIA markup, and working code examples.
**ACESS relevance:** ACESS's custom components (Lesson Navigation Tabs, Settings Accordion, Quiz Dialog) reference APG patterns directly to ensure correct keyboard behavior and screen reader announcements.

---

**Title:** APG Patterns Directory
**Organization:** W3C Web Accessibility Initiative (WAI)
**Year:** 2024
**URL:** https://www.w3.org/WAI/ARIA/apg/patterns/
**Summary:** Full catalog of accessible patterns including Alert, Button, Carousel, Checkbox, Combobox, Dialog (Modal), Disclosure, Feed, Grid, Listbox, Menu, Navigation, Radiogroup, Slider, Spinbutton, Switch, Table, Tabs, Toolbar, Tooltip, Tree View.
**ACESS relevance:** Direct reference for ACESS developers building any interactive component not provided by Radix/shadcn — e.g., a custom Reading Pace Slider or a Visual Schedule Timeline.

---

### D3. Section 508

**Title:** Section 508 — International Harmonization
**Organization:** U.S. Access Board / Section508.gov
**Year:** 2024
**URL:** https://www.section508.gov/manage/laws-and-policies/international/
**Summary:** Section 508 of the Rehabilitation Act requires US federal agencies to make ICT (websites, software, documents, hardware) accessible. The 2017 refresh adopted WCAG 2.0 Level AA. Covers harmonization with EN 301 549.
**ACESS relevance:** If ACESS is adopted by US federally-funded educational institutions, Section 508 compliance (WCAG 2.0 AA) is a legal requirement. Meeting WCAG 2.2 AA exceeds this threshold.

---

### D4. Universal Design for Learning (UDL) — CAST Framework

**Title:** UDL Guidelines 3.0
**Organization:** CAST (Center for Applied Special Technology)
**Year:** July 2024
**URL:** https://udlguidelines.cast.org/
**Summary:** UDL 3.0 is the latest iteration, providing concrete suggestions across three networks: Engagement (why we learn — affective network), Representation (what we learn — recognition network), and Action & Expression (how we learn — strategic network). Emphasizes asset-based approaches, learner identity, and collective learning. Guides: multiple means of engagement, multiple means of representation, multiple means of action and expression.
**ACESS relevance:** UDL is the primary instructional design framework underpinning ACESS. Font/color/spacing customization → Multiple Means of Representation. Gamification and streaks → Multiple Means of Engagement. Text-to-speech and varied response modes → Multiple Means of Action & Expression.

---

**Title:** About Universal Design for Learning — CAST
**Organization:** CAST
**Year:** 2024
**URL:** https://www.cast.org/resources/about-universal-design-for-learning/
**Summary:** Explains that UDL is grounded in neuroscience — the three brain networks model. The goal is learner agency: purposeful & reflective, resourceful & authentic, strategic & action-oriented. UDL is an educational framework, not an accommodation checklist.
**ACESS relevance:** Frames why ACESS provides learner-controlled accessibility settings rather than admin-assigned accommodations — UDL positions the learner as an expert on their own needs.

---

### D5. EN 301 549 — European Accessibility Standard

**Title:** EN 301 549 V3.2.1 (2021)
**Organization:** ETSI / CEN / CENELEC
**Year:** 2021
**URL:** https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf
**Summary:** The European harmonized accessibility standard for ICT. Includes WCAG 2.1 in full plus additional requirements for non-web software, hardware, biometrics, real-time text, and closed system software. Required for EAA compliance (enforceable June 2025). Version 4.1.1 (with WCAG 2.2) due 2026.
**ACESS relevance:** If ACESS is deployed in European educational institutions, EN 301 549 compliance is legally required under the European Accessibility Act. Meeting WCAG 2.1 AA covers the web/software portions; additional closed-system checks may apply.

---

### D6. Dyslexia-Friendly Design Best Practices

**Title:** Inter-Letter Spacing, Inter-Word Spacing, and Font with Dyslexia-Friendly Features: Testing Text Readability
**Organization:** National Institutes of Health (PMC) / Franceschini et al.
**Year:** 2020
**URL:** https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7188700/
**Summary:** Peer-reviewed meta-analysis of dyslexia-friendly (DF) font research. Finds no direct evidence that DF letterform design features improve reading accuracy or speed on their own, but increased inter-letter and inter-word spacing consistently aids dyslexic readers. The seminal Zorzi et al. study showed extra-large spacing (TNR Regular enlarged by 2.5pt) improved reading for children with dyslexia.
**ACESS relevance:** Validates ACESS's approach of offering adjustable line spacing (1.5–2.0×) and letter spacing, not just font switching. OpenDyslexic and Atkinson Hyperlegible are offered as options, but spacing controls are the evidence-based core.

---

**Title:** Inclusive Typography: Designing for Dyslexia and Accessibility
**Organization:** Design Shack (editorial guide)
**Year:** 2025
**URL:** https://designshack.net/articles/typography/inclusive-typography/
**Summary:** Recommends fonts with distinct letterforms (Lexend, OpenDyslexic, Atkinson Hyperlegible), line spacing of at least 1.5× body font size, minimum 16px body text, left-aligned text (no justification), and avoidance of italic emphasis.
**ACESS relevance:** Directly informs ACESS's Dyslexia Profile settings: Atkinson Hyperlegible font, 1.6× line height, 16px minimum, cream/off-white background (`#FDFBF4`), no justified text.

---

### D7. ADHD-Friendly UI Design Patterns

**Title:** ADHD-Friendly Web Design: Minimizing Distractions
**Organization:** Bureau of Internet Accessibility (BOIA)
**Year:** 2024
**URL:** https://www.boia.org/blog/adhd-friendly-web-design-minimizing-distractions
**Summary:** Documents key WCAG provisions relevant to ADHD users — auto-playing animation must be pausable/stoppable (WCAG 2.2.2), sufficient time for tasks (WCAG 2.2.1), predictable page behavior (WCAG 3.2.1). Recommends avoiding sticky elements and ensuring motion can be disabled.
**ACESS relevance:** ACESS's ADHD Profile disables auto-play, applies Motion's `reducedMotion="always"`, shows step-by-step progress indicators, and uses task checklists — all aligned with WCAG provisions documented here.

---

**Title:** UI/UX for ADHD: Designing Interfaces That Actually Help Students
**Organization:** Din Studio
**Year:** 2025
**URL:** https://din-studio.com/ui-ux-for-adhd-designing-interfaces-that-actually-help-students/
**Summary:** Specific patterns for ADHD-inclusive student interfaces: task dashboards (today's tasks, in-progress, up-next), progressive disclosure (show one step at a time), high-readability typography, and allowing users to pause and return to tasks without losing context. Fonts, line spacing, and moderate contrast are prioritized over animation.
**ACESS relevance:** Informs ACESS's ADHD-focused Lesson Mode — single-step display, persistent resume state, visible breadcrumbs, and minimal sidebar during active learning.

---

### D8. Autism Spectrum Disorder (ASD) Inclusive Design

**Title:** Designing for Autism in UX — UXPA International
**Organization:** UXPA International
**Year:** 2025
**URL:** https://uxpa.org/designing-for-autism-in-ux/
**Summary:** ASD users process sensory information differently; digital interfaces can trigger sensory overload via flashing, unexpected popups, or inconsistent layouts. Key principles: step-by-step instructions, predictable consistent layout, calm color palettes, and collapsible/expandable content sections. "A clean, predictable layout with consistent placement of elements gives users a sense of stability and familiarity."
**ACESS relevance:** ACESS's ASD Profile enforces consistent navigation placement, disables all animations, uses muted neutral colors, and displays visual schedules showing the lesson sequence before beginning.

---

**Title:** Designing Inclusive and Sensory-Friendly UX for Neurodiverse Audiences
**Organization:** UX Magazine
**Year:** 2024
**URL:** https://uxmag.com/articles/designing-inclusive-and-sensory-friendly-ux-for-neurodiverse-audiences
**Summary:** Documents evidence that autistic users benefit from muted neutral tones (bright colors can cause discomfort), clear logical hierarchy, and predictable navigation. Sans-serif fonts like Arial and Open Sans are recommended. Emphasizes personalization options as best practice.
**ACESS relevance:** Justifies ACESS's muted color palette in the ASD Profile and the importance of the accessibility settings panel — individual responses vary, so offering options (not just one preset) is key.

---

### D9. Visual Impairment Accommodation

**Title:** Perceivable — WCAG 2.2 Principle 1
**Organization:** W3C / WAI
**Year:** 2023
**URL:** https://www.w3.org/TR/WCAG22/#perceivable
**Summary:** Perceivable guidelines require text alternatives for non-text content (1.1), captions for time-based media (1.2), adaptable content presentation (1.3), and distinguishable color/contrast (1.4). Key criteria: minimum contrast ratio 4.5:1 for normal text (AA), text resize to 200% without loss (1.4.4).
**ACESS relevance:** ACESS's High-Contrast Profile meets 1.4.3 (minimum contrast AA), and text scaling is built into the CSS with `rem`-based font sizes — doubling browser base font size scales all text correctly.

---

### D10. Hearing Impairment Accommodation

**Title:** Time-Based Media — WCAG 2.2 Guideline 1.2
**Organization:** W3C / WAI
**Year:** 2023
**URL:** https://www.w3.org/TR/WCAG22/#time-based-media
**Summary:** Requires captions for live and pre-recorded synchronized media (1.2.2, 1.2.4), audio descriptions for video (1.2.5), and transcripts for audio-only content (1.2.1).
**ACESS relevance:** All ACESS video lessons must have closed captions. The lesson editor includes a caption upload field; H5P Interactive Video supports embedded caption tracks.

---

### D11. Cognitive Impairment Accommodation

**Title:** Cognitive Accessibility — WCAG 2.2 Understanding Document
**Organization:** W3C / WAI
**Year:** 2023
**URL:** https://www.w3.org/WAI/cognitive/
**Summary:** Cognitive accessibility guidelines include clear language (3.1), predictable behavior (3.2), input assistance to avoid errors (3.3), and sufficient time (2.2). WCAG 2.2 added new cognitive-focused criteria: Accessible Authentication (3.3.7/3.3.8), Redundant Entry (3.3.7), and Consistent Help (3.2.6).
**ACESS relevance:** ACESS's Simplified Mode uses short sentences, visual icons alongside text labels, step-by-step lesson flow, and auto-saves to avoid data loss — addressing cognitive load for all learner profiles.

---

---

## Section E: Adaptive & Personalized Learning Systems

### E1. Adaptive Learning Engines & Knowledge Tracing

**Title:** Deep Knowledge Tracing and Cognitive Load Estimation for Personalized Learning Path Generation
**Organization:** PMC / NIH
**Year:** 2025
**URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC12246154/
**Summary:** Presents a dual-stream neural network that combines knowledge state tracking with cognitive load estimation to generate personalized learning paths. Achieved 87.5% prediction accuracy. Identifies "learning sweet spots" — optimal ranges of cognitive challenge maximizing performance and retention.
**ACESS relevance:** Provides the theoretical basis for ACESS's adaptive lesson sequencing — adjusting content difficulty based on learner performance history, not just profile-based presets.

---

**Title:** An Improved Adaptive Learning Path Recommendation Model Driven by Real-time Learning Analytics
**Organization:** Journal of Computers in Education / Springer (via PMC)
**Year:** 2022
**URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC9748379/
**Summary:** Reviews personalized learning path recommendation approaches including collaborative filtering, content-based filtering, and knowledge-tracing hybrid systems. Finds that real-time learner log monitoring with adaptive resource mapping outperforms static recommendation models.
**ACESS relevance:** Supports ACESS's design decision to log lesson interactions (time-on-task, quiz attempts, replay counts) and surface these to an adaptive recommendation layer for future lesson ordering.

---

### E2. xAPI/SCORM Learning Analytics Standards

**Title:** What Is xAPI? Tracking Learner Data — Wherever It Goes
**Organization:** Articulate
**Year:** 2025
**URL:** https://www.articulate.com/blog/what-is-xapi/
**Summary:** xAPI (Experience API / Tin Can) is the successor to SCORM. Records learning "statements" in Actor–Verb–Object format (e.g., "Aliff completed Lesson 3"). Stores records in a Learning Record Store (LRS), not just an LMS. Supports offline learning, mobile, VR, and game-based learning.
**ACESS relevance:** ACESS's `lesson_progress` table tracks the same data as xAPI statements — learner, action, lesson, timestamp, score. H5P in Moodle already emits xAPI; ACESS can forward these to an LRS for cross-platform analytics.

---

**Title:** xAPI vs SCORM — iSpring Solutions
**Organization:** iSpring Solutions
**Year:** 2026
**URL:** https://www.ispringsolutions.com/blog/xapi-vs-scorm
**Summary:** Compares SCORM (tracks completion, score, time; LMS-bound; universally supported) vs xAPI (rich behavioral statements; platform-agnostic; requires LRS). SCORM remains dominant for formal LMS content; xAPI is preferred for rich analytics and cross-platform learning.
**ACESS relevance:** ACESS supports SCORM for H5P content compatibility with Moodle's gradebook, while also logging xAPI-style events internally for its own analytics engine.

---

### E3. Gamification in Education

**Title:** The Impact of Gamification on Learning and Instruction: A Systematic Review
**Organization:** ScienceDirect / Educational Research Review
**Year:** 2020
**URL:** https://www.sciencedirect.com/science/article/abs/pii/S1747938X19301058
**Summary:** Systematic review of gamification empirical evidence. Finds three positive themes: student engagement and motivation, academic achievement, and social connectivity. The most common game elements (points, badges, leaderboards, avatars) increase goal orientation, persistence, and learning by repetition.
**ACESS relevance:** Provides evidence base for ACESS's gamification features — XP points, lesson badges, completion streaks, and progress bars. The review supports using multiple game elements together rather than points alone ("pointification").

---

**Title:** Examining the Effectiveness of Gamification: A Meta-Analysis
**Organization:** Frontiers in Psychology
**Year:** 2023
**URL:** https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1253549/full
**Summary:** Meta-analysis confirming moderate positive effects of gamification on learning outcomes. Notes that design principles (PBL triangle: Points–Badges–Leaderboards) are widely used but "pointification" (using only points) is insufficient. Context and learner type moderate effectiveness.
**ACESS relevance:** Warns ACESS against over-relying on visible leaderboards for learners with disabilities or anxiety disorders — ACESS makes leaderboards opt-in and emphasizes personal progress over competitive rankings.

---

### E4. Spaced Repetition & Mastery Learning

**Title:** Validating the Impact of Digital Badges on Motivation and Academic Performance
**Organization:** Frontiers in Education
**Year:** 2024
**URL:** https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1429452/full
**Summary:** Study with 95 university students found digital badges significantly enhance intrinsic motivation across all five motivational dimensions, with minimal impact on extrinsic motivation. No significant difference between badge design categories.
**ACESS relevance:** Supports ACESS's design decision to prioritize intrinsic-motivation badges (mastery milestones, accessibility goal achievements) over competitive badges.

---

---

## Section F: Role-Based Learning Management Systems (LMS)

### F1. LMS Role-Based Access Control

**Title:** Moodle Access API — Roles, Capabilities, and Contexts
**Organization:** Moodle HQ
**Year:** 2025
**URL:** https://moodledev.io/docs/5.0/apis/subsystems/access
**Summary:** The definitive reference for Moodle's RBAC: roles are named sets of capabilities; capabilities are granted ALLOW/PREVENT/PROHIBIT in contexts. Context hierarchy: System → Course Category → Course → Module. `has_capability()` is the central access check function.
**ACESS relevance:** ACESS's three-role model (Admin/Educator/Learner) maps cleanly onto Moodle's Manager/Teacher/Student. The context-scoped permission model guides ACESS's Supabase RLS policy design.

---

### F2. Course Lifecycle Management

**Title:** Moodle Course Management Overview
**Organization:** Moodle Docs
**Year:** 2024
**URL:** https://docs.moodle.org/502/en/Course
**Summary:** Covers course creation, adding resources and activities, section organization, completion tracking, and the draft → published state. Backup and restore preserve course structure. Grading integrates with the gradebook.
**ACESS relevance:** ACESS mirrors the Moodle course lifecycle: Draft → Under Review → Published → Archived. Educator workflow covers lesson authoring (Tiptap editor), activity embedding (H5P), and progress monitoring dashboards.

---

### F3. Certificate Generation in E-learning

**Title:** Moodle Certificate Activity — MoodleDocs
**Organization:** Moodle HQ
**Year:** 2024
**URL:** https://docs.moodle.org/502/en/Certificate_activity
**Summary:** The Certificate activity generates PDF certificates upon course completion, customizable with text, images, and date. Uses Moodle's completion tracking APIs to gate certificate issuance.
**ACESS relevance:** ACESS's certificate system uses a similar pattern — triggering PDF generation (via a server-side library) when a learner's `course_completions` row is marked complete, with learner name, course title, and date embedded.

---

---

## Section G: Relevant Research Papers & Academic References

### G1. Dyslexia — Spacing and Font Research

**Title:** Inter-Letter Spacing, Inter-Word Spacing, and Font with Dyslexia-Friendly Features: Testing Text Readability in People with and without Dyslexia
**Authors:** Franceschini, S. et al.
**Organization:** PMC / NIH
**Year:** 2020
**URL:** https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7188700/
**Summary:** Reviews the literature on dyslexia-friendly font features and spacing. Key finding: no direct evidence for letterform design effects, but extra-large inter-letter spacing (based on Zorzi et al., 2012) shows consistent benefit. OpenDyslexic showed no improvement over Arial in accuracy or speed in controlled studies.
**ACESS relevance:** Informs ACESS's evidence-based approach — prioritize spacing controls over font switching, and offer both as learner-controlled options rather than prescribing a single "dyslexia font."

---

### G2. ADHD — Distraction-Free Interface Research

**Title:** Orchestrating Attention: Bringing Harmony to the Chaos of Neurodivergent Learning States (AttentionGuard System)
**Authors:** ArXiv Preprint
**Year:** 2026
**URL:** https://arxiv.org/pdf/2602.07865
**Summary:** Presents AttentionGuard — an adaptive UI system that detects ADHD learning states (focused, drifting, hyperfocused, fatigued) and applies five UI patterns: attention-responsive chunking, state-aware verification timing, dynamic distraction reduction, progress adaptation, and re-engagement scaffolding. Validates these patterns against ADHD neuroscience literature.
**ACESS relevance:** Provides the most current research on ADHD-adaptive UI, validating ACESS's approach of progressive disclosure (micro-chunks), pause-and-resume, and context-aware comprehension checks.

---

### G3. ASD — Predictability and Visual Schedules

**Title:** A DeepSeek Cross-Modal Platform for Personalized Art Education in Autism Spectrum Disorder
**Organization:** PMC / NIH
**Year:** 2025
**URL:** https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12749891/
**Summary:** Study with 203 participants (53 neurodivergent) demonstrates that structured, predictable environments with sensory accommodation achieve significantly better outcomes for ASD learners. Sensory comfort ratings 4.6/5, learning satisfaction 4.3/5, NAEP score improvements 20.5% vs 8.2% for traditional methods.
**ACESS relevance:** Empirically supports ACESS's ASD Profile features — structured visual lesson sequences, pre-lesson schedules, sensory accommodation settings, and predictable navigation.

---

### G4. Gamification Meta-Analysis

**Title:** Examining the Effectiveness of Gamification as a Tool Promoting Teaching and Learning in Educational Settings: A Meta-Analysis
**Organization:** Frontiers in Psychology
**Year:** 2023
**URL:** https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1253549/full
**Summary:** Meta-analysis of gamification effectiveness across educational contexts. Finds overall positive but moderate effects. Distinguishes "pointification" (trivial) from meaningful game design. Notes that context, learner population, and design principles moderate outcomes significantly.
**ACESS relevance:** Grounds ACESS's gamification design in evidence — meaningful achievements tied to skill milestones, not arbitrary point accumulation. Disability-aware gamification avoids competitive elements that could demotivate vulnerable learners.

---

### G5. Adaptive Learning — Knowledge Tracing

**Title:** TutorLLM: Customizing Learning Recommendations with Knowledge Tracing and Retrieval-Augmented Generation
**Organization:** ArXiv
**Year:** 2025
**URL:** https://arxiv.org/pdf/2502.15709
**Summary:** Proposes combining knowledge tracing (MLFBK model predicting learner knowledge state) with RAG to provide personalized explanations and next-step recommendations. Achieves 10% improvement in user satisfaction and 5% increase in quiz scores over general LLMs.
**ACESS relevance:** Points toward ACESS's future adaptive engine — combining learner progress data (knowledge tracing) with lesson content retrieval (RAG) to surface the right explanation at the right level.

---

### G6. Adaptive Learning — Recommendation Systems

**Title:** An Improved Adaptive Learning Path Recommendation Model Driven by Real-time Learning Analytics
**Organization:** Journal of Computers in Education / Springer
**Year:** 2022
**URL:** https://link.springer.com/article/10.1007/s40692-022-00250-y
**Summary:** Proposes real-time learner log monitoring with a recommendation model that continuously adapts to changing learning preferences and performance. Hybrid approach combining collaborative filtering and knowledge tracing outperforms static models.
**ACESS relevance:** Supports ACESS's roadmap for an adaptive recommendation layer — using real-time lesson interaction logs to adjust subsequent lesson sequencing, not just initial onboarding profiles.

---

### G7. Universal Design for Learning — Implementation Evidence

**Title:** UDL as a Framework for Inclusion: Bridging Neurodiversity and Learning through Sensory-Responsive Design
**Organization:** SENcastle
**Year:** 2026
**URL:** https://www.sencastle.com/blog/universal-design-for-learning
**Summary:** Reviews UDL implementation evidence. Cites CAST (2024) UDL Guidelines 3.0. Confirms three principles (Engagement, Representation, Action & Expression) correspond to affective, recognition, and strategic neural networks. Evidence shows systematic UDL implementation leads to significant improvements in educational outcomes.
**ACESS relevance:** Provides the theoretical and empirical foundation for ACESS's entire accessibility profile system, which operationalizes UDL's three principles into learner-controlled interface and content settings.

---

### G8. H5P Effectiveness — Learner Engagement

**Title:** H5P and Inclusive Learning at UBC
**Organization:** University of British Columbia, Educational Technology Support
**Year:** 2024
**URL:** https://wiki.ubc.ca/Documentation:H5P
**Summary:** Documents UBC's use of H5P in courses, noting benefits for deaf and hard-of-hearing learners (interactive video with captions), improved metacognition and attentional control from retrieval practice, and reduced anxiety from learner-controlled pacing of interactive content.
**ACESS relevance:** Confirms the value of embedding H5P in ACESS lessons for diverse learner populations, and validates the importance of learner control over interaction pacing — a key accessibility principle.

---

### G9. Accessibility Evaluation Frameworks for E-Learning

**Title:** WCAG 2.2 and E-learning Accessibility Conformance
**Organization:** W3C / WAI and arc42 Quality Model
**Year:** 2024–2025
**URL:** https://quality.arc42.org/standards/wcag-2-2
**Summary:** Documents that WCAG 2.2 contains 9 new criteria (added over 2.1) particularly targeting cognitive disabilities, low vision, and mobile users — Focus Not Obscured (2.4.11), Dragging Movements (2.5.7), Target Size Minimum (2.5.8), and Accessible Authentication (3.3.8). ISO/IEC 40500:2025 ratification.
**ACESS relevance:** Provides the specific new WCAG 2.2 criteria ACESS must address beyond its WCAG 2.1 baseline: larger touch targets (2.5.8 — minimum 24×24 CSS px), authentication without cognitive function tests (3.3.8), and focus indicator visibility (2.4.11).

---

### G10. Neurodivergent UX Design — Principles

**Title:** The Principles of Neurodivergent UX Design Every Designer Should Know
**Organization:** AccessibilityChecker.org
**Year:** 2026
**URL:** https://www.accessibilitychecker.org/blog/neurodivergent-ux-design/
**Summary:** Synthesizes ADHD, ASD, dyslexia, and cognitive disability UX principles into actionable design rules: minimize distractions (no autoplay, no aggressive animation), clear task flows (step-by-step wizards), progressive disclosure, forgiving UI (easy undo, back navigation), and accessible typography. Notes that 15–20% of the global population is neurodivergent.
**ACESS relevance:** Provides a combined neurodivergent UX framework that unifies ACESS's separate accessibility profiles into a coherent design system — any feature benefiting one neurodivergent group typically benefits all users under cognitive load.

---

---

## Quick Reference: Standards Crosswalk for ACESS

| ACESS Feature | Primary Standard | Supporting Standard |
|---|---|---|
| Keyboard navigation | WCAG 2.2 (2.1.1) | WAI-ARIA APG Patterns |
| Color contrast | WCAG 2.2 (1.4.3 AA) | EN 301 549 §9.1.4.3 |
| Screen reader support | WAI-ARIA 1.3 + Radix UI | WCAG 2.2 (4.1.2) |
| Captions on video | WCAG 2.2 (1.2.2) | Section 508 |
| Font/spacing settings | Dyslexia research (Zorzi et al.) | UDL Representation |
| Reduced motion | WCAG 2.2 (2.3.3) | Motion `useReducedMotion()` |
| Gamification | Frontiers meta-analysis 2023 | UDL Engagement |
| Progress tracking | xAPI / SCORM | Moodle `mod_h5pactivity` |
| Learner data isolation | Supabase RLS (PostgreSQL) | Moodle RBAC principles |
| Educator course authoring | Tiptap extensibility model | Moodle course management |
| Interactive content | H5P (h5p.org) | Moodle Content Bank |
| Adaptive sequencing | Knowledge tracing research | UDL Action & Expression |

---

*Document compiled: June 2026 | ACESS System — UTeM Software Engineering Project*
*All URLs verified as of June 2026.*
