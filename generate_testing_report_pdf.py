import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# ==============================================================================
# NUMBERED CANVAS FOR "PAGE X OF Y" FOOTER
# ==============================================================================
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8.5)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 11 * 72 - 36, "ACESS -- Testing, Feature Matrix & Accessibility Improvement Report")
            self.drawRightString(8.5 * 72 - 54, 11 * 72 - 36, "Final Year Project (PSM)")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 11 * 72 - 42, 8.5 * 72 - 54, 11 * 72 - 42)

        # Running Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 54, 36, page_str)
        self.drawString(54, 36, "ACESS Platform Evaluation & Quality Assurance Specification | UTeM")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 8.5 * 72 - 54, 48)
        self.restoreState()


def build_pdf(filename="ACESS_Testing_and_Improvement_Report.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Color Palette
    PRIMARY = colors.HexColor("#1E1B4B")     # Deep Indigo
    SECONDARY = colors.HexColor("#4338CA")   # Indigo
    ACCENT = colors.HexColor("#0D9488")      # Teal
    SUCCESS = colors.HexColor("#15803D")     # Green
    TEXT_DARK = colors.HexColor("#0F172A")   # Slate 900
    TEXT_MUTED = colors.HexColor("#475569")  # Slate 600
    BG_LIGHT = colors.HexColor("#F8FAFC")    # Slate 50
    BORDER_LIGHT = colors.HexColor("#E2E8F0")# Slate 200

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=19,
        leading=23,
        textColor=PRIMARY,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_MUTED,
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14.5,
        textColor=SECONDARY,
        spaceBefore=9,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_DARK,
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F1F5F9"),
        borderColor=colors.HexColor("#CBD5E1"),
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=6
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white,
        alignment=0
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        textColor=TEXT_DARK
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10.5,
        textColor=TEXT_DARK
    )

    story = []

    # ==============================================================================
    # HEADER / COVER TITLE
    # ==============================================================================
    story.append(Paragraph("ACESS Application Testing & System Specification Report", title_style))
    story.append(Paragraph(
        "<b>Final Year Project (PSM) Development, Multi-User Feature Matrix, WCAG 2.2 Accessibility Engine, Quality Assurance & Verification Benchmark</b>",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=8))

    # Executive Summary Card
    summary_html = """
    <b>EXECUTIVE SUMMARY & PURPOSE:</b> This comprehensive document serves as an evaluation, self-testing, and quality-assurance benchmark for the <b>ACESS (Accessible Cognitive Education & Support System)</b> platform. It outlines the three distinct user portals (Administrator, Educator, Learner), details the WCAG 2.1/2.2-compliant accessibility engine with neurodivergent presets, details the educator deterministic compliance audit rules, defines the automated testing strategy (Playwright & k6), and summarizes the complete seeded database architecture.
    """
    summary_table = Table([[Paragraph(summary_html, callout_text)]], colWidths=[504])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EEF2FF")),
        ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor("#C7D2FE")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # ==============================================================================
    # SECTION 1: USER ROLE CAPABILITIES & 3 USER TIERS
    # ==============================================================================
    story.append(Paragraph("1. User Role Capabilities & Functional Architecture", h1_style))
    story.append(Paragraph(
        "The ACESS platform implements strict multi-tiered Role-Based Access Control (RBAC) across three distinct user roles. Each role is equipped with dedicated interfaces, telemetry pipelines, and accessibility safeguards:",
        body_style
    ))

    # 1.1 Administrator Portal
    story.append(Paragraph("1.1 Administrator Portal (<code>/admin</code>)", h2_style))
    admin_features = [
        "<b>Executive Command Center (<code>/admin</code>):</b> Real-time visual telemetry tracking total platform engagement, student enrollments, course publications, verified certificates, and active user health.",
        "<b>User Directory & Account Governance (<code>/admin/users</code>):</b> Complete oversight of all registered learner and educator accounts, role promotions, status toggling, and profile metadata management.",
        "<b>Deep Learner Telemetry Inspection (<code>/admin/users/[id]</code>):</b> Granular inspection of individual student progress, lesson completion logs, quiz attempts, checkpoint completions, and issued credentials.",
        "<b>Course Moderation & Quality Control (<code>/admin/courses</code>):</b> Review, inspect, publish, archive, or approve educator-authored courses and manage system-wide foundational curriculum.",
        "<b>Instructor Vetting & Approvals (<code>/admin/instructor-applications</code>):</b> Evaluation pipeline for educator applications with qualifications, verification documents, and CV portfolios.",
        "<b>Cryptographic Certificate Oversight (<code>/admin/certificates</code>):</b> Registry of all digital credentials issued on the platform with QR-code cryptographic UUID verification.",
        "<b>Feedback & Inquiry Center (<code>/admin/contact-messages</code>):</b> Centralized inbox triaging inbound contact submissions, learner inquiries, and accessibility feedback.",
        "<b>Automated Report Generator (<code>/admin/reports</code>):</b> PDF export engine delivering administrative executive summaries, course analytics, and accessibility compliance data."
    ]
    for feat in admin_features:
        story.append(Paragraph(f"&bull; {feat}", bullet_style))

    # Admin Self-Improvement Note Box
    admin_notes_html = """
    <b>Self-Improvement & Development Notes: ADMINISTRATOR PORTAL</b><br/>
    <i>[Use this space to document your specific additions, bug fixes, UI enhancements, and feature refinements for this user tier]</i><br/><br/>
    &bull; <b>Improvement 1:</b> ____________________________________________________________________________________<br/>
    &bull; <b>Improvement 2:</b> ____________________________________________________________________________________<br/>
    &bull; <b>Improvement 3:</b> ____________________________________________________________________________________<br/>
    &bull; <b>Tested Status:</b> [ &nbsp; ] Verified on Localhost &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Verified on Vercel Production &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Database Synced
    """
    admin_box = Table([[Paragraph(admin_notes_html, callout_text)]], colWidths=[504])
    admin_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(Spacer(1, 4))
    story.append(admin_box)
    story.append(Spacer(1, 8))

    # 1.2 Educator Portal
    story.append(Paragraph("1.2 Educator Portal (<code>/educator</code>)", h2_style))
    educator_features = [
        "<b>Course Studio & Builder (<code>/educator/courses</code>):</b> Modular course authoring interface supporting multi-chapter hierarchies, rich lessons, interactive activities, and video materials.",
        "<b>Rich TipTap Content Editor:</b> Accessible WYSIWYG editor supporting accessible typography, custom callout cards, semantic tables, image alignment, and direct media integration.",
        "<b>Automated Accessibility Compliance Engine:</b> Real-time deterministic evaluator scanning lesson markup, computing a 0-100 score against WCAG/COGA rules, and providing 1-click automatic remediation.",
        "<b>Image Descriptions & Alt Text Tool:</b> Embedded media manager extracting all lesson images, flagging missing descriptions, and enabling inline alt-text authoring with immediate markup binding.",
        "<b>Interactive Video Checkpoints:</b> In-video multiple-choice question authoring tool that binds questions to exact timestamps, pausing playback automatically for active recall.",
        "<b>Native Interactive Activities:</b> Authoring suite for 5 interactive exercise types: Flashcards, Drag & Drop, Fill in the Blanks, Memory Match Game, and Chronological Timeline.",
        "<b>Student Cohort Intelligence (<code>/educator/students</code>):</b> Progress tracking across enrolled students with completion percentages, quiz scores, checkpoint completions, and engagement metrics.",
        "<b>Course Performance Analytics (<code>/educator/analytics</code>):</b> Telemetry visualizers displaying drop-off detection, quiz performance distributions, and lesson engagement durations.",
        "<b>Custom Certificate Designer (<code>/educator/certificates</code>):</b> Course-specific credential designer allowing custom signatures, institutional titles, criteria, and design templates."
    ]
    for feat in educator_features:
        story.append(Paragraph(f"&bull; {feat}", bullet_style))

    # Educator Self-Improvement Note Box
    educator_notes_html = """
    <b>Self-Improvement & Development Notes: EDUCATOR PORTAL</b><br/>
    <i>[Use this space to document your specific additions, bug fixes, UI enhancements, and feature refinements for this user tier]</i><br/><br/>
    &bull; <b>Improvement 1:</b> ____________________________________________________________________________________<br/>
    &bull; <b>Improvement 2:</b> ____________________________________________________________________________________<br/>
    &bull; <b>Improvement 3:</b> ____________________________________________________________________________________<br/>
    &bull; <b>Tested Status:</b> [ &nbsp; ] Verified on Localhost &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Verified on Vercel Production &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Database Synced
    """
    educator_box = Table([[Paragraph(educator_notes_html, callout_text)]], colWidths=[504])
    educator_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(Spacer(1, 4))
    story.append(educator_box)
    story.append(Spacer(1, 8))

    # 1.3 Learner Portal
    story.append(Paragraph("1.3 Learner Portal (<code>/learner</code>)", h2_style))
    learner_features = [
        "<b>Adaptive Learning Workspace (<code>/learner/courses/[id]</code>):</b> Highly flexible lesson viewer supporting Standard View, Slideshow/Paginated View, and Micro-chunked sections.",
        "<b>One-Click Accessibility Presets:</b> Instant application of evidence-based profiles: Dyslexia, ADHD, Autism & Sensory, Low Vision, and Custom configurations.",
        "<b>Assistive Text-to-Speech (TTS) Engine:</b> Multi-speed browser speech synthesis with <b>Shift-Key Cursor Inspection</b> (reads text, image alt text, and interactive buttons) and full-lesson audio narration.",
        "<b>Executive Function Support Suite:</b> Visual Step-by-Step Task Checklist, Progress Timeline with status milestones, NowBar current task tracker, and Auto-Save reassurance indicators.",
        "<b>Sensory & Cognitive Load Reducers:</b> Reading Spotlight focus ruler (viewport-center tracking), Distraction-Free full-screen mode, Soft Background Tints (Irlen filters), and Zero-Animation mode.",
        "<b>Interactive Video Player:</b> YouTube player integration with timestamped question checkpoints that pause playback automatically and offer interactive review.",
        "<b>Easy Read / Simplified Summaries:</b> Student summary cards and reflection tools distilling core concepts into plain language for autistics and cognitive learners.",
        "<b>Verifiable Digital Credentials & Gamification:</b> Achievement badges, XP streaks, and downloadable high-contrast PDF certificates with cryptographic QR validation."
    ]
    for feat in learner_features:
        story.append(Paragraph(f"&bull; {feat}", bullet_style))

    # Learner Self-Improvement Note Box
    learner_notes_html = """
    <b>Self-Improvement & Development Notes: LEARNER PORTAL</b><br/>
    <i>[Use this space to document your specific additions, bug fixes, UI enhancements, and feature refinements for this user tier]</i><br/><br/>
    &bull; <b>Improvement 1:</b> ____________________________________________________________________________________<br/>
    &bull; <b>Improvement 2:</b> ____________________________________________________________________________________<br/>
    &bull; <b>Improvement 3:</b> ____________________________________________________________________________________<br/>
    &bull; <b>Tested Status:</b> [ &nbsp; ] Verified on Localhost &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Verified on Vercel Production &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Database Synced
    """
    learner_box = Table([[Paragraph(learner_notes_html, callout_text)]], colWidths=[504])
    learner_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(Spacer(1, 4))
    story.append(learner_box)
    story.append(Spacer(1, 10))

    # ==============================================================================
    # SECTION 2: ACCESSIBILITY ARCHITECTURE & WCAG PRESETS
    # ==============================================================================
    story.append(Paragraph("2. In-Depth Accessibility Architecture, Presets & WCAG 2.2 Standards", h1_style))
    story.append(Paragraph(
        "ACESS operationalizes the <b>Web Content Accessibility Guidelines (WCAG 2.2 Level A/AA/AAA)</b> and <b>W3C Cognitive Accessibility (COGA)</b> standards. Accessibility is not a single toggle; it is structured into distinct evidence-based presets designed around specific neurodivergent learning profiles:",
        body_style
    ))

    # Detailed Presets Table
    preset_data = [
        [
            Paragraph("Preset & Target Profile", table_header),
            Paragraph("Applied Technical Adaptations", table_header),
            Paragraph("WCAG 2.2 / COGA Criteria", table_header),
            Paragraph("Cognitive & Scientific Rationale (Why it helps)", table_header)
        ],
        [
            Paragraph("<b>Dyslexia Preset</b><br/>Target: Learners with phonological processing difficulties, visual crowding, or reading fatigue.", table_cell_bold),
            Paragraph("&bull; Atkinson Hyperlegible / OpenDyslexic font<br/>&bull; Font size 19px, line-height 1.7x<br/>&bull; Word spacing +40% (0.16em floor)<br/>&bull; Cream background tint (#FFFDD0)<br/>&bull; Reading Spotlight focus ruler<br/>&bull; Text-to-Speech with Shift image alt reading", table_cell),
            Paragraph("&bull; WCAG 1.4.12 Text Spacing (AA)<br/>&bull; WCAG 1.4.8 Visual Presentation (AAA)<br/>&bull; WCAG 1.1.1 Non-text Content (A)<br/>&bull; WCAG 1.4.5 Images of Text (AA)<br/>&bull; BDA Dyslexia Style Guide", table_cell),
            Paragraph("Dyslexic readers frequently experience 'visual crowding' where adjacent letterforms blur together. Increased letter/word spacing and specialized character weights prevent optical confusion (b/d/p/q). Cream tint reduces glare-induced visual stress (Meares-Irlen syndrome).", table_cell)
        ],
        [
            Paragraph("<b>ADHD Preset</b><br/>Target: Learners with executive dysfunction, attention deficit, and working memory constraints.", table_cell_bold),
            Paragraph("&bull; Chunked Micro-learning (H2 sections / Slideshow)<br/>&bull; Distraction-Free full-screen mode<br/>&bull; Step-by-Step Task Checklist<br/>&bull; Visual Progress Timeline<br/>&bull; In-video question checkpoints (at &le;360s)<br/>&bull; Auto-Save indicator<br/>&bull; Soft Grey background (#F3F4F6)", table_cell),
            Paragraph("&bull; W3C COGA 4.2 Chunk Information<br/>&bull; W3C COGA 5.1 Short Sections<br/>&bull; W3C COGA Objective 6 (No memory rely)<br/>&bull; WCAG 2.2.4 Interruptions (AAA)<br/>&bull; WCAG 2.2.1 Timing Adjustable (A)", table_cell),
            Paragraph("Working memory buffers in ADHD learners overflow quickly when processing unbroken blocks of text. Breaking lessons into bite-sized chunks prevents cognitive overwhelm. Active in-video checkpoints maintain dopamine-driven focus, and auto-save eliminates lost-work anxiety.", table_cell)
        ],
        [
            Paragraph("<b>Autism & Sensory Preset</b><br/>Target: Learners with sensory hypersensitivity, cognitive rigidity, or anxiety regarding unpredictability.", table_cell_bold),
            Paragraph("&bull; Continuous predictable scroll layout<br/>&bull; Zero animation (animation_level='none')<br/>&bull; Muted pastel color palette (#E0F2FE)<br/>&bull; Clear Learning Objectives upfront (&ge;2)<br/>&bull; Easy Read / Student Summary<br/>&bull; Consistent section headers & clear cues", table_cell),
            Paragraph("&bull; WCAG 2.3.3 Animation from Interaction (AAA)<br/>&bull; WCAG 3.2.3 Consistent Navigation (AA)<br/>&bull; W3C COGA 3.1 Content Summary<br/>&bull; W3C COGA 6.1 Clear Expectations<br/>&bull; W3C COGA 2.3 Avoid Figurative Speech", table_cell),
            Paragraph("Unexpected motion, flashing graphics, or unpredictable layouts trigger sensory overload and anxiety. Stating explicit objectives upfront anchors expectations. Eliminating decorative motion preserves mental bandwidth for actual comprehension.", table_cell)
        ],
        [
            Paragraph("<b>Vision & General Preset</b><br/>Target: Low vision, age-related vision loss, situational light constraints, or ESL learners.", table_cell_bold),
            Paragraph("&bull; High-contrast typography (&gt;7:1 contrast)<br/>&bull; Resizable text scaling up to 24px<br/>&bull; Multi-speed TTS voice narration<br/>&bull; Shift-hover image alt description reading<br/>&bull; Keyboard navigation with visible focus rings", table_cell),
            Paragraph("&bull; WCAG 1.4.3 Contrast (Minimum) (AA)<br/>&bull; WCAG 1.4.6 Contrast (Enhanced) (AAA)<br/>&bull; WCAG 2.4.7 Focus Visible (AA)<br/>&bull; WCAG 2.1.1 Keyboard Navigation (A)", table_cell),
            Paragraph("Guarantees that all content and interface controls remain fully legible and navigable without a pointing device. Screen reader alt text ensures non-sighted learners receive full parity of visual information.", table_cell)
        ]
    ]

    preset_table = Table(preset_data, colWidths=[105, 135, 110, 154])
    preset_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(preset_table)
    story.append(Spacer(1, 10))

    # ==============================================================================
    # SECTION 3: EDUCATOR ACCESSIBILITY AUDIT ENGINE
    # ==============================================================================
    story.append(Paragraph("3. Educator Accessibility Audit Engine & Quality Checker", h1_style))
    story.append(Paragraph(
        "To ensure that accessibility is embedded at the authoring stage rather than treated as an afterthought, ACESS includes an <b>automated, real-time accessibility compliance auditor</b> embedded directly in the Course Studio. The auditor evaluates lesson draft markup against 14 deterministic rules with zero hallucinations, no external API latency, and complete mathematical reproducibility.",
        body_style
    ))

    story.append(Paragraph("3.1 The 14 Deterministic Audit Standards Across Focus Profiles", h2_style))

    rules_data = [
        [
            Paragraph("Rule ID & Standard Title", table_header),
            Paragraph("Profile / Scope", table_header),
            Paragraph("Strict Threshold / Requirement", table_header),
            Paragraph("Source Standard & Citation", table_header)
        ],
        [
            Paragraph("<code>base_content</code><br/>Teachable Content", table_cell_bold),
            Paragraph("Universal (All)", table_cell),
            Paragraph("At least 50 words of body text or an embedded video.", table_cell),
            Paragraph("WCAG 2.2 -- 1.3.1 Info & Relationships", table_cell)
        ],
        [
            Paragraph("<code>base_alt_text</code><br/>Image Alternative Text", table_cell_bold),
            Paragraph("Universal (All)", table_cell),
            Paragraph("Every <code>&lt;img&gt;</code> tag must carry non-empty, descriptive alt text.", table_cell),
            Paragraph("WCAG 2.2 -- 1.1.1 Non-text Content (Level A)", table_cell)
        ],
        [
            Paragraph("<code>base_headings</code><br/>Heading Structure", table_cell_bold),
            Paragraph("Universal (All)", table_cell),
            Paragraph("Strict hierarchical sequence (H1 &rarr; H2 &rarr; H3). No skipped levels.", table_cell),
            Paragraph("WCAG 2.2 -- 2.4.6 Headings & Labels (Level AA)", table_cell)
        ],
        [
            Paragraph("<code>base_transcript</code><br/>Video Transcript", table_cell_bold),
            Paragraph("Universal (All)", table_cell),
            Paragraph("Any lesson containing a video must provide a text transcript.", table_cell),
            Paragraph("WCAG 2.2 -- 1.2.1 Audio/Video-only (Level A)", table_cell)
        ],
        [
            Paragraph("<code>base_link_text</code><br/>Descriptive Link Text", table_cell_bold),
            Paragraph("Universal (All)", table_cell),
            Paragraph("Flags vague anchor text ('click here', 'more', 'link').", table_cell),
            Paragraph("WCAG 2.2 -- 2.4.4 Link Purpose in Context (A)", table_cell)
        ],
        [
            Paragraph("<code>base_duration</code><br/>Estimated Duration", table_cell_bold),
            Paragraph("Universal (All)", table_cell),
            Paragraph("Lesson reading duration must be explicitly estimated (&le;45 min).", table_cell),
            Paragraph("W3C COGA -- Objective 5 (Pacing)", table_cell)
        ],
        [
            Paragraph("<code>base_spacer_paragraphs</code><br/>No Empty Spacers", table_cell_bold),
            Paragraph("Universal (All)", table_cell),
            Paragraph("Max &le;3 empty <code>&lt;p&gt;&lt;/p&gt;</code> tags used for manual visual spacing.", table_cell),
            Paragraph("WCAG 2.2 -- 1.3.1 Info & Relationships", table_cell)
        ],
        [
            Paragraph("<code>adhd_chunking</code><br/>Cognitive Chunking", table_cell_bold),
            Paragraph("ADHD Profile", table_cell),
            Paragraph("Section breaks (H2/HR) required every &le;400 words.", table_cell),
            Paragraph("W3C COGA -- Pattern 4.2: Chunk Information", table_cell)
        ],
        [
            Paragraph("<code>adhd_video_len</code><br/>Active Video Recall", table_cell_bold),
            Paragraph("ADHD Profile", table_cell),
            Paragraph("Videos &gt;6 minutes (&gt;360s) require timestamped in-video questions.", table_cell),
            Paragraph("W3C COGA -- Objective 5: Help Users Focus", table_cell)
        ],
        [
            Paragraph("<code>asd_objectives</code><br/>Clear Objectives", table_cell_bold),
            Paragraph("Autism Profile", table_cell),
            Paragraph("At least &ge;2 explicit learning goals stated up front.", table_cell),
            Paragraph("W3C COGA -- Pattern 6.1: Clear Expectations", table_cell)
        ],
        [
            Paragraph("<code>asd_summary</code><br/>Simplified Summary", table_cell_bold),
            Paragraph("Autism Profile", table_cell),
            Paragraph("Plain-language summary of &ge;15 words provided.", table_cell),
            Paragraph("W3C COGA -- Pattern 3.1: Content Summary", table_cell)
        ],
        [
            Paragraph("<code>dys_paragraphs</code><br/>Paragraph Word Limit", table_cell_bold),
            Paragraph("Dyslexia Profile", table_cell),
            Paragraph("Maximum 80 words per paragraph to prevent visual crowding.", table_cell),
            Paragraph("British Dyslexia Association Style Guide", table_cell)
        ],
        [
            Paragraph("<code>dys_sentences</code><br/>Sentence Length", table_cell_bold),
            Paragraph("Dyslexia Profile", table_cell),
            Paragraph("Maximum 30 words per sentence; mean sentence length &le;20 words.", table_cell),
            Paragraph("British Dyslexia Association Style Guide", table_cell)
        ],
        [
            Paragraph("<code>dys_readability</code><br/>Flesch-Kincaid Score", table_cell_bold),
            Paragraph("Dyslexia Profile", table_cell),
            Paragraph("Flesch-Kincaid Grade Level &le;Grade 8 for general audiences.", table_cell),
            Paragraph("Kincaid et al. (1975) Readability Formula", table_cell)
        ]
    ]

    rules_table = Table(rules_data, colWidths=[110, 85, 175, 134])
    rules_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(rules_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("3.2 Scoring Algorithm & Mutual Benefits for Educators and Learners", h2_style))
    story.append(Paragraph(
        "<b>Scoring & Compliance Bands:</b> The audit engine computes a weighted score (0-100%). Scores &ge;80% earn a <b>Pass / Good (Green)</b> status, 50-79% triggers a <b>Needs Attention (Amber)</b> warning with actionable inline remediation buttons, and &lt;50% indicates <b>Critical Issues</b>.<br/>"
        "&bull; <b>How it helps the Educator:</b> Eliminates guesswork. Instead of memorizing dense WCAG documentation, educators receive immediate visual alerts, exact line-level highlights, and 1-click automatic fixes (e.g., auto-chunking text, formatting objectives, embedding alt-text fields).<br/>"
        "&bull; <b>How it helps the Student:</b> Ensures that every published lesson is guaranteed to work with screen readers, assistive TTS, keyboard shortcuts, and cognitive pacing aids. No learner encounters broken markup or inaccessible media.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # ==============================================================================
    # SECTION 4: TESTING PLAN & 2 TESTING TOOLS
    # ==============================================================================
    story.append(Paragraph("4. Quality Assurance & Automated Testing Plan", h1_style))
    story.append(Paragraph(
        "To validate platform reliability, role-based security guards, and high-concurrency throughput, the quality assurance plan uses two industry-standard testing tools: <b>Playwright</b> for End-to-End Functional Verification and <b>k6 by Grafana</b> for Concurrency & Load Stress Testing.",
        body_style
    ))

    # 4.1 Tool 1: Playwright
    story.append(Paragraph("4.1 Tool 1: Playwright (End-to-End Functional & Integration Testing)", h2_style))
    story.append(Paragraph(
        "&bull; <b>What it is:</b> A modern browser automation testing framework developed by Microsoft that automates Chromium, Firefox, and WebKit under real browser conditions.<br/>"
        "&bull; <b>What it validates:</b><br/>"
        "&nbsp;&nbsp;1. Multi-role authentication (Admin, Educator, Learner) and RBAC route protection.<br/>"
        "&nbsp;&nbsp;2. Accessibility preset switches (verifies DOM styling, font changes, line spacing, and dark/soft/tint modes).<br/>"
        "&nbsp;&nbsp;3. Course enrollment flows, lesson slide progression, and interactive quiz submission.<br/>"
        "&nbsp;&nbsp;4. TTS Shift-key inspection and video checkpoint question triggers.<br/>"
        "&bull; <b>What to expect / Result:</b> Visual screenshots of test states, network trace logs, test execution time per scenario, and an interactive HTML report confirming 100% pass rate on all critical user journeys.<br/>"
        "&bull; <b>How to execute Playwright:</b>",
        body_style
    ))
    playwright_code = (
        "# 1. Install Playwright and browser dependencies\n"
        "npm install -D @playwright/test\n"
        "npx playwright install --with-deps chromium\n\n"
        "# 2. Run all end-to-end test scenarios against Localhost\n"
        "npx playwright test\n\n"
        "# 3. Run against Production URL with interactive UI mode\n"
        "npx playwright test --ui --env BASE_URL=https://acess.vercel.app\n\n"
        "# 4. View interactive HTML test report\n"
        "npx playwright show-report"
    )
    story.append(Paragraph(playwright_code.replace('\n', '<br/>'), code_style))

    # 4.2 Tool 2: k6
    story.append(Paragraph("4.2 Tool 2: k6 by Grafana (Load, Stress & High-Concurrency Testing)", h2_style))
    story.append(Paragraph(
        "&bull; <b>What it is:</b> A high-performance load testing engine written in Go, scripted in JavaScript, designed for simulating heavy concurrent traffic.<br/>"
        "&bull; <b>What it validates:</b><br/>"
        "&nbsp;&nbsp;1. API response latencies under sustained concurrent request loads.<br/>"
        "&nbsp;&nbsp;2. Supabase serverless database connection pooling limits and caching efficiency.<br/>"
        "&nbsp;&nbsp;3. System SLA thresholds: p95 latency &lt; 500ms, error rate &lt; 1% under peak stress.<br/>"
        "&bull; <b>What to expect / Result:</b> Real-time CLI output displaying total requests completed, Requests Per Second (RPS), p90/p95/p99 latency percentiles, and check pass/fail ratios.<br/>"
        "&bull; <b>How to execute k6:</b>",
        body_style
    ))
    k6_code = (
        "# 1. Install k6 on Windows\n"
        "winget install k6 --source winget\n\n"
        "# 2. Run standard load test (50 concurrent VUs over 2 minutes)\n"
        "k6 run -e BASE_URL=http://localhost:3000 scripts/k6-load-test.js\n\n"
        "# 3. Run high-concurrency stress test (500 VUs ramp-up against Production)\n"
        "k6 run --vus 500 --duration 3m -e BASE_URL=https://acess.vercel.app scripts/k6-load-test.js\n\n"
        "# 4. Export test metrics to JSON summary\n"
        "k6 run --summary-export=k6-summary.json scripts/k6-load-test.js"
    )
    story.append(Paragraph(k6_code.replace('\n', '<br/>'), code_style))

    # 4.3 Clarification on 500 VUs vs 50 Seeded Users
    story.append(Paragraph("4.3 Concurrency Architecture: 50 Database Users vs 500 Concurrent VUs", h2_style))
    story.append(Paragraph(
        "A vital technical distinction in load testing: <b>Virtual Users (VUs) represent concurrent network traffic threads, not distinct database records</b>.<br/>"
        "1. <b>Public / Anonymous Endpoints (0 database accounts needed):</b> Landing page (<code>/</code>), public course catalog, and certificate cryptographic verification (<code>/verify/[code]</code>) handle hundreds of concurrent requests without touching user sessions.<br/>"
        "2. <b>Round-Robin Session Distribution:</b> In k6, 500 virtual threads can simulate concurrent browsing by cycling across the 50 seeded database accounts (<code>VU % 50</code>), accurately stressing connection pools, auth token verification, and database query throughput.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # ==============================================================================
    # SECTION 5: DATABASE SUMMARY & USER DIRECTORY
    # ==============================================================================
    story.append(Paragraph("5. Database Summary & Seeded User Directory", h1_style))
    story.append(Paragraph(
        "The ACESS database is initialized with verified demo personas, structured curriculum, and complete learning histories. All demo accounts use the standard password <code>demo1234</code>.",
        body_style
    ))

    story.append(Paragraph("5.1 Seeded User Directory & Scenario Roles", h2_style))

    user_data = [
        [
            Paragraph("Full Name", table_header),
            Paragraph("Email Address", table_header),
            Paragraph("Role", table_header),
            Paragraph("Target Preset / Profile", table_header),
            Paragraph("Assigned Test Scenario", table_header)
        ],
        [
            Paragraph("<b>Aliff Affandi</b>", table_cell_bold),
            Paragraph("aliff.admin@acess.edu.my", table_cell),
            Paragraph("admin", table_cell),
            Paragraph("None (Standard)", table_cell),
            Paragraph("Super Admin; full platform governance, analytics & user management", table_cell)
        ],
        [
            Paragraph("<b>Nurul Izzah</b>", table_cell_bold),
            Paragraph("nurul.admin@acess.edu.my", table_cell),
            Paragraph("admin", table_cell),
            Paragraph("None (Standard)", table_cell),
            Paragraph("Secondary Admin; course approvals & executive reporting", table_cell)
        ],
        [
            Paragraph("<b>Dr. Sarah Chen</b>", table_cell_bold),
            Paragraph("sarah.educator@acess.edu.my", table_cell),
            Paragraph("educator", table_cell),
            Paragraph("None (Author)", table_cell),
            Paragraph("Lead Educator; author of ADHD & Executive Function courses", table_cell)
        ],
        [
            Paragraph("<b>Prof. James Wilson</b>", table_cell_bold),
            Paragraph("james.educator@acess.edu.my", table_cell),
            Paragraph("educator", table_cell),
            Paragraph("None (Author)", table_cell),
            Paragraph("Special Education Lead; author of Dyslexia & Literacy courses", table_cell)
        ],
        [
            Paragraph("<b>Amir Hakim</b>", table_cell_bold),
            Paragraph("amir.learner@acess.edu.my", table_cell),
            Paragraph("learner", table_cell),
            Paragraph("<b>ADHD Preset</b>", table_cell_bold),
            Paragraph("ADHD Learner; tests chunking, task checklist, video questions, timeline", table_cell)
        ],
        [
            Paragraph("<b>Hafizuddin Danial</b>", table_cell_bold),
            Paragraph("hafiz.learner@acess.edu.my", table_cell),
            Paragraph("learner", table_cell),
            Paragraph("<b>Dyslexia Preset</b>", table_cell_bold),
            Paragraph("Dyslexic Learner; tests OpenDyslexic font, TTS, cream tint, reading ruler", table_cell)
        ],
        [
            Paragraph("<b>Farah Nabilah</b>", table_cell_bold),
            Paragraph("farah.learner@acess.edu.my", table_cell),
            Paragraph("learner", table_cell),
            Paragraph("<b>Autism Preset</b>", table_cell_bold),
            Paragraph("Autistic Learner; tests zero-motion, muted pastels, visual schedule, summaries", table_cell)
        ],
        [
            Paragraph("<b>David Lee</b>", table_cell_bold),
            Paragraph("david.learner@acess.edu.my", table_cell),
            Paragraph("learner", table_cell),
            Paragraph("<b>Vision Preset</b>", table_cell_bold),
            Paragraph("Low Vision; tests high-contrast, large text scaling, screen reader alt-text", table_cell)
        ],
        [
            Paragraph("<b>Elena Rostova</b>", table_cell_bold),
            Paragraph("elena.learner@acess.edu.my", table_cell),
            Paragraph("learner", table_cell),
            Paragraph("General / Custom", table_cell),
            Paragraph("Multi-device student; tests responsive layout, certificates & badges", table_cell)
        ]
    ]

    user_table = Table(user_data, colWidths=[90, 130, 45, 95, 144])
    user_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(user_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("5.2 Summary of Initialized Database Metrics", h2_style))

    metrics_data = [
        [
            Paragraph("Database Entity", table_header),
            Paragraph("Metric Count", table_header),
            Paragraph("Database Entity", table_header),
            Paragraph("Metric Count", table_header)
        ],
        [
            Paragraph("Public Database Tables", table_cell_bold),
            Paragraph("42 Relational Tables", table_cell),
            Paragraph("Total Enrolled Tracks", table_cell_bold),
            Paragraph("21 Active Enrollments", table_cell)
        ],
        [
            Paragraph("System Admin Accounts", table_cell_bold),
            Paragraph("3 Verified Accounts", table_cell),
            Paragraph("Lesson Progress Records", table_cell_bold),
            Paragraph("64 Progress Telemetry Rows", table_cell)
        ],
        [
            Paragraph("Educator Accounts", table_cell_bold),
            Paragraph("3 Verified Educators", table_cell),
            Paragraph("Quiz Submissions & Attempts", table_cell_bold),
            Paragraph("19 Graded Attempts", table_cell)
        ],
        [
            Paragraph("Student Learner Personas", table_cell_bold),
            Paragraph("15 Seeded Learners", table_cell),
            Paragraph("Interactive Video Questions", table_cell_bold),
            Paragraph("12 Checkpoint Questions", table_cell)
        ],
        [
            Paragraph("Published Courses", table_cell_bold),
            Paragraph("6 Multi-Chapter Courses", table_cell),
            Paragraph("Earned Achievement Badges", table_cell_bold),
            Paragraph("38 Awarded Badges", table_cell)
        ],
        [
            Paragraph("Structured Lessons", table_cell_bold),
            Paragraph("24 Interactive Lessons", table_cell),
            Paragraph("Issued Digital Certificates", table_cell_bold),
            Paragraph("14 Verified Credentials", table_cell)
        ]
    ]

    metrics_table = Table(metrics_data, colWidths=[126, 126, 126, 126])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 14))

    # Document Conclusion / Signoff
    signoff_html = """
    <b>REPORT APPROVAL & VERIFICATION STATUS:</b><br/>
    This document confirms that the ACESS platform architecture meets all specified functional requirements, WCAG 2.2 accessibility standards, and deterministic auditing benchmarks. All test procedures outlined in Section 4 can be reproduced against both local and production environments.<br/><br/>
    <b>Evaluator / Developer Signature:</b> ___________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Date:</b> ___________________________
    """
    signoff_box = Table([[Paragraph(signoff_html, callout_text)]], colWidths=[504])
    signoff_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor("#94A3B8")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(signoff_box)

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == '__main__':
    output_filename = "ACESS_Testing_and_Improvement_Report.pdf"
    build_pdf(output_filename)
