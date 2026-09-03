/**
 * ACESS - User Acceptance Testing (UAT) form generator
 * ---------------------------------------------------
 * Creates the single Google Form used for the ACESS User Acceptance Testing
 * described in Chapter 6 of the project report.
 *
 * HOW TO USE
 *   1. Open https://script.google.com and create a new Apps Script project.
 *   2. Delete the sample code, paste this whole file in, and save.
 *   3. Select the function  createAcessUatForm  and click Run.
 *   4. Approve the permission request the first time (the script needs
 *      permission to create a form in your Google Drive).
 *   5. Open View > Logs (or the Execution log). The log prints two links:
 *        - the LIVE FORM link to send to participants
 *        - the EDIT link, if you want to adjust any wording afterwards
 *
 * The form has one page per user perspective. The first question routes each
 * participant to the page for the perspective they were asked to represent,
 * and every page then jumps to the same closing page of open-ended questions.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Change this if the running system is at a different address. */
var SYSTEM_URL = 'http://localhost:3000';

var FORM_TITLE = 'ACESS User Acceptance Testing';

var FORM_INTRO =
  'Thank you for helping to evaluate ACESS (Adaptive Cognitive and Educational Skill Support), ' +
  'a web-based learning platform developed as a final-year project.\n\n' +
  'WHAT THIS IS\n' +
  'This is a User Acceptance Test. Its purpose is to find out whether a person who is not the ' +
  'developer can complete the normal tasks of a user role and whether the interface makes sense.\n\n' +
  'IMPORTANT: YOU ARE ROLE-PLAYING A USER PERSPECTIVE\n' +
  'You have been assigned one user perspective to represent (for example, a learner who uses the ' +
  'Dyslexia accessibility settings, or an educator). You are not being asked about yourself. ' +
  'Please carry out the tasks listed for your perspective, and then answer the questions as an ' +
  'evaluation of how well the system served that perspective.\n\n' +
  'BEFORE YOU ANSWER\n' +
  'Please open the system, sign in with the account you were given, and complete all the tasks ' +
  'listed on your perspective page. The questions ask about that experience, so please do not ' +
  'answer them before doing the tasks.\n\n' +
  'The system is at: ' + SYSTEM_URL + '\n\n' +
  'The form takes about five minutes once the tasks are done. Your answers are used only for the ' +
  'evaluation chapter of the project report. Please do not enter any personal information.';

/** The five-point agreement scale used by every rating question. */
var SCALE = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree'
];

/** The eight statements asked of every perspective, so results are comparable. */
var COMMON_STATEMENTS = [
  'The system was easy to use.',
  'Moving between pages and finding the features I needed was straightforward.',
  'The information shown on screen was clear and easy to understand.',
  'The text and content were comfortable to read.',
  'The on-screen instructions and labels were easy to follow.',
  'The interface suited the needs of the user perspective I was asked to represent.',
  'The system made the tasks in my brief easy to complete.',
  'Overall, I am satisfied with the system for this user perspective.'
];

/**
 * The six user perspectives. Each carries the persona description, the tasks
 * the participant performs, and two statements specific to that perspective.
 */
var PERSPECTIVES = [
  {
    key: 'default',
    label: 'Default Learner (no accessibility settings applied)',
    persona:
      'You are a learner who has not changed any accessibility settings. You want to find a ' +
      'course, work through its lessons in order, be assessed, and see how far you have got.',
    needs:
      'The standard interface should be readable and usable without any adjustment, and you should ' +
      'not need to turn on an accessibility feature in order to finish a course.',
    tasks: [
      'Sign in with the learner account you were given.',
      'Browse the course catalogue and open a course you are not already taking.',
      'Enrol in that course.',
      'Open its first lesson and work through it to the end.',
      'Mark the lesson complete.',
      'Attempt the lesson quiz and look at your result.',
      'Open the Progress page and find how far through the course you are.',
      'Open the Achievements and Certificates page.'
    ],
    specific: [
      'Finding a course, enrolling and working through a lesson followed a logical order.',
      'The quiz result and the progress information were easy to interpret.'
    ]
  },
  {
    key: 'dyslexia',
    label: 'Dyslexia Learner',
    persona:
      'You are representing a learner who finds long passages of text tiring to read and who loses ' +
      'their place in dense paragraphs. You want to change how text is presented, and you want an ' +
      'alternative to reading.',
    needs:
      'A dyslexia-friendly typeface, larger text, wider line and word spacing, a tinted background, ' +
      'a narrower reading column, a reading spotlight, and read-aloud, all reachable without ' +
      'leaving the lesson.',
    tasks: [
      'Sign in with the learner account you were given.',
      'Open Accessibility from the sidebar and select the Dyslexia preset. Read the preview of what will change before you confirm it.',
      'Open a lesson and read one full section under those settings.',
      'Use the Listen control to hear part of the lesson read aloud.',
      'Use the reading toolbar inside the lesson to change the text size and the line spacing.',
      'Turn the reading spotlight on and then off again.',
      'Mark the lesson complete.'
    ],
    specific: [
      'The Dyslexia preset made the lesson text more comfortable to read than the default settings.',
      'The read-aloud and reading toolbar controls were easy to find and use.'
    ]
  },
  {
    key: 'autism',
    label: 'Autism Learner',
    persona:
      'You are representing a learner who works best when the structure of a task is known in ' +
      'advance and stays the same. You want to know what a lesson contains before you start it, ' +
      'and you do not want the page to change unexpectedly.',
    needs:
      'A visual schedule shown before the lesson, step-by-step guidance that explains why a control ' +
      'is unavailable, a layout that stays the same between lessons, reduced colour and no motion, ' +
      'and no media that starts on its own.',
    tasks: [
      'Sign in with the learner account you were given.',
      'Apply the Autism preset from the Accessibility settings.',
      'Before opening a lesson, look at its visual schedule and note what the lesson will involve.',
      'Work through the lesson using the step-by-step guidance.',
      'Open a second lesson in the same course and compare its layout with the first.',
      'Mark a lesson complete.',
      'Open the Progress page.'
    ],
    specific: [
      'The visual schedule made it clear what the lesson would involve before I started it.',
      'The layout and structure stayed consistent and predictable between lessons.'
    ]
  },
  {
    key: 'adhd',
    label: 'ADHD Learner',
    persona:
      'You are representing a learner for whom staying focused is costly and who loses their place ' +
      'after an interruption. You want a reduced interface, a clear next step, and short units of work.',
    needs:
      'A distraction-free lesson view, a bar showing the current task, a task checklist, a progress ' +
      'timeline, content divided into short sections, and a quiz that does not impose hidden time pressure.',
    tasks: [
      'Sign in with the learner account you were given.',
      'Apply the ADHD preset from the Accessibility settings.',
      'Open a lesson and notice that the sidebar and notifications are hidden.',
      'Work through the lesson section by section, using the task checklist and the current-task bar.',
      'Leave the lesson, then return to it and use the progress information to find your place again.',
      'Attempt the lesson quiz and note the timer shown.'
    ],
    specific: [
      'The distraction-free lesson view helped me stay on the current task.',
      'The task checklist and the current-task bar made it clear what to do next.'
    ]
  },
  {
    key: 'educator',
    label: 'Educator',
    persona:
      'You are representing an instructor who writes and maintains courses and monitors the ' +
      'learners taking them.',
    needs:
      'To create structured content, check it for accessibility problems before publishing, and see ' +
      'how learners are progressing.',
    tasks: [
      'Sign in with the educator account you were given.',
      'Create a new course through the course creation wizard, giving it a title, a description and a difficulty level.',
      'Add a lesson that contains at least one heading and one image.',
      'Run the accessibility compliance check on that lesson and correct at least one issue it reports.',
      'Add a quiz question to the lesson.',
      'Open the Analytics page and read the figures for one of your courses.',
      'Open Learner Progress and find one learner\'s progress.',
      'Open the Certificates page for one of your courses.'
    ],
    specific: [
      'Creating a course and writing a lesson was straightforward.',
      'The accessibility compliance check gave feedback I could understand and act on.'
    ]
  },
  {
    key: 'admin',
    label: 'Administrator',
    persona:
      'You are representing the person who runs the platform and decides who may publish and what ' +
      'is published.',
    needs:
      'To moderate courses, review educator applications, manage accounts, and see platform-level activity.',
    tasks: [
      'Sign in with the administrator account you were given.',
      'Open Course Management, find a course awaiting review, and approve or reject it.',
      'Open Educator Applications and review one pending application.',
      'Open User Management and find a specific user account.',
      'Open Analytics, including the Accessibility tab, and read the platform figures.',
      'Open Reports and generate one report.',
      'Open Feedback and mark one enquiry as read.'
    ],
    specific: [
      'Reviewing courses and educator applications was straightforward.',
      'The platform analytics gave a clear overview of activity on the system.'
    ]
  }
];

/** The four open-ended questions asked of every participant at the end. */
var OPEN_QUESTIONS = [
  'What did you need from the system that was not available?',
  'What would you improve?',
  'Did you encounter anything confusing or difficult? Please describe what happened.',
  'Any other comments or feedback?'
];

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Creates the ACESS UAT form and logs its links.
 * Run this function from the Apps Script editor.
 */
function createAcessUatForm() {
  var form = FormApp.create(FORM_TITLE);

  form.setTitle(FORM_TITLE);
  form.setDescription(FORM_INTRO);
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage(
    'Thank you. Your feedback has been recorded and will be used in the evaluation chapter of the project report.'
  );

  // --- Page 1: routing question -------------------------------------------

  var routing = form.addMultipleChoiceItem()
    .setTitle('Which user perspective were you asked to represent?')
    .setHelpText(
      'Choose the perspective given in your brief. The next page shows the tasks for that ' +
      'perspective and then asks you to rate your experience of carrying them out.'
    )
    .setRequired(true);

  // --- One page per perspective -------------------------------------------

  var pages = [];

  PERSPECTIVES.forEach(function (p) {
    var page = form.addPageBreakItem()
      .setTitle(p.label)
      .setHelpText(buildBrief(p));
    pages.push(page);

    form.addGridItem()
      .setTitle('How much do you agree with each statement?')
      .setHelpText('Answer as an evaluation of how well the system served the perspective you represented.')
      .setRows(COMMON_STATEMENTS)
      .setColumns(SCALE)
      .setRequired(true);

    form.addGridItem()
      .setTitle('Statements specific to this perspective')
      .setRows(p.specific)
      .setColumns(SCALE)
      .setRequired(true);

    form.addMultipleChoiceItem()
      .setTitle('Were you able to complete all the tasks listed for this perspective?')
      .setChoiceValues(['Yes, all of them', 'Most of them', 'Only some of them', 'No, I could not complete them'])
      .setRequired(true);
  });

  // --- Closing page: open-ended questions ----------------------------------

  var closing = form.addPageBreakItem()
    .setTitle('Final comments')
    .setHelpText(
      'These last four questions are the most useful part of the evaluation. Please answer them ' +
      'in your own words, however briefly.'
    );

  OPEN_QUESTIONS.forEach(function (q, i) {
    form.addParagraphTextItem()
      .setTitle(q)
      .setRequired(i < 3);
  });

  // --- Wire up the navigation ---------------------------------------------

  // Every perspective page continues to the closing page.
  pages.forEach(function (page) {
    page.setGoToPage(closing);
  });

  // The routing question sends each answer to its own page.
  var choices = PERSPECTIVES.map(function (p, i) {
    return routing.createChoice(p.label, pages[i]);
  });
  routing.setChoices(choices);

  // The closing page submits the form.
  closing.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  // --- Output --------------------------------------------------------------

  var live = form.getPublishedUrl();
  var edit = form.getEditUrl();

  Logger.log('==================================================');
  Logger.log('ACESS UAT form created.');
  Logger.log('LIVE FORM (send this to participants):');
  Logger.log(live);
  Logger.log('EDIT LINK (open this to change wording):');
  Logger.log(edit);
  Logger.log('==================================================');

  return { liveUrl: live, editUrl: edit };
}

/** Formats the persona description, needs and task list shown on a page. */
function buildBrief(p) {
  var lines = [];
  lines.push('YOUR PERSPECTIVE');
  lines.push(p.persona);
  lines.push('');
  lines.push('WHAT THIS USER NEEDS FROM THE SYSTEM');
  lines.push(p.needs);
  lines.push('');
  lines.push('TASKS TO CARRY OUT BEFORE ANSWERING');
  p.tasks.forEach(function (t, i) {
    lines.push((i + 1) + '. ' + t);
  });
  lines.push('');
  lines.push('Please complete these tasks first, then answer the questions below.');
  return lines.join('\n');
}
