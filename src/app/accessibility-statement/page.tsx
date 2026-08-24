'use client';

import { Navbar } from '@/components/figma/Navbar';
import { Footer } from '@/components/figma/Footer';
import { CheckCircle2, AlertTriangle, Mail } from 'lucide-react';

// docs/accessibility/10-GOVERNANCE-RUNBOOK.md §11: "A public page ... The
// statement is not marketing. Its purpose is to let a learner decide
// whether this product will work for them before they invest time in it —
// which is itself an accessibility feature." Every claim below is drawn
// directly from docs/accessibility/IMPLEMENTATION-STATUS.md, which is
// itself verified against the actual code, not aspirational — a
// conformance claim this page can't back up would be exactly the kind of
// dishonesty docs/accessibility/00 Phase 1 was built to remove from the
// product. "Targets" is used deliberately instead of "conforms to": no
// independent audit (automated or AT) has been run — see the "Testing"
// section below.

const supported = [
  'Three built-in presets (Dyslexia, ADHD, Autism) that change typography, layout, pacing, and executive-function supports — not just colour',
  'Font size, line spacing, word spacing, and background tint, adjustable independently of any preset',
  'Text-to-speech ("Listen") on lesson content and quiz questions — never starts on its own',
  'A three-way reading layout: continuous scroll, full-screen slides, or one section at a time',
  'Reduced-motion and reduced-colour-saturation options',
  'A guided, step-by-step mode for lessons, with an explanation whenever "Next" is disabled',
  'English and Bahasa Melayu interface languages',
  'A preview of what a preset will change, before it changes anything',
  'Keyboard support for interactive activities — drag-and-drop, fill-in-the-blanks, flashcards, memory game, and timeline — including a non-drag alternative for the most common drag-and-drop mode',
];

const gaps = [
  {
    text: 'No screen reader (NVDA, VoiceOver, TalkBack) or other assistive technology has been tested against this product yet — including the keyboard support described below for drag-and-drop, fill-in-the-blanks, flashcards, memory game, and timeline activities.',
    severity: 'Every feature on this page is verified by reading and tracing the code, not by using it with real assistive technology.',
  },
  {
    text: 'One drag-and-drop activity mode ("diagram" — placing labels onto an image) has no non-drag alternative yet. The other drag-and-drop mode ("categories") and every other interactive activity type have a keyboard path and a non-drag alternative where relevant.',
    severity: null,
  },
  {
    text: 'The "Muted Colors" setting reduces saturation across the whole page, including error, warning, and success colours — it can make those harder to tell apart, the opposite of what it should do.',
    severity: null,
  },
  {
    text: 'A learner can select only one preset at a time. Combining supports across presets (for example, Dyslexia reading settings with ADHD pacing supports) is not yet possible.',
    severity: null,
  },
  {
    text: 'No learner with lived experience of dyslexia, ADHD, or autism has tested this product as part of building it. Everything above reflects what the code is intended to do, not what has been confirmed to work for a real person.',
    severity: null,
  },
];

export default function AccessibilityStatementPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Accessibility Statement</h1>
        <p className="text-sm text-gray-500 mb-8">Last reviewed: 23 August 2026</p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">What we&apos;re aiming for</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            ACESS is built to target <strong>WCAG 2.2 Level AA</strong>, plus four Level AAA
            criteria that matter specifically for reading, attention, and sensory
            differences: 1.4.8 (Visual Presentation), 2.2.6 (Timeouts), 2.3.3 (Animation
            from Interactions), and 3.2.5 (Change on Request).
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>This is a target we are building toward, not a conformance claim we
            have verified.</strong> No independent accessibility audit — automated or with
            real assistive technology — has been run against this product yet. Treat
            everything on this page as &quot;intended to work this way,&quot; not &quot;confirmed to
            work this way.&quot;
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What&apos;s supported today</h2>
          <ul className="space-y-3">
            {supported.map((item) => (
              <li key={item} className="flex items-start gap-3 text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Known gaps</h2>
          <p className="text-gray-600 text-sm mb-4">
            Listed honestly, not to be reassuring. A statement with no gaps would not be
            credible.
          </p>
          <ul className="space-y-4">
            {gaps.map((gap) => (
              <li key={gap.text} className="flex items-start gap-3 text-gray-700">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p>{gap.text}</p>
                  {gap.severity && <p className="text-sm text-gray-500 mt-1">{gap.severity}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Testing</h2>
          <p className="text-gray-700 leading-relaxed">
            Every change described above has been checked with a type-checker (TypeScript)
            and a linter (ESLint) against accessibility-specific rules, and traced by
            reading the code that implements it. It has <strong>not</strong> been tested with
            real assistive technology, and has not yet been tested with disabled learners.
            Both are planned but have not happened.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Report a barrier</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If something in this product is difficult or impossible for you to use because
            of a disability, we want to know — that is not a failure on your part, it is
            information we need.
          </p>
          <a
            href="/contact?category=accessibility"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            <Mail className="w-4 h-4" /> Report a barrier
          </a>
          <p className="text-sm text-gray-500 mt-3">
            [Response-time commitment to be set by the accessibility owner — see
            docs/accessibility/10-GOVERNANCE-RUNBOOK.md §8]
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
