# ACESS User Acceptance Testing (UAT)

This folder holds the material for the User Acceptance Testing described in
Chapter 6 of the project report.

## Files

| File | Purpose |
| --- | --- |
| `create-uat-form.gs` | Google Apps Script that builds the UAT questionnaire in Google Forms. |

## Creating the form

1. Open <https://script.google.com> and create a new Apps Script project.
2. Delete the sample code, paste in the whole of `create-uat-form.gs`, and save.
3. If the system is not running at `http://localhost:3000`, change the
   `SYSTEM_URL` value at the top of the script.
4. Select the function `createAcessUatForm` and click **Run**.
5. Approve the permission request the first time. The script only needs
   permission to create a form in your own Google Drive.
6. Open the execution log. It prints the live form link to send to
   participants and an edit link for adjusting the wording.

## How the form is organised

- **Page 1** explains the purpose of the evaluation, states that the
  participant is representing an assigned user perspective rather than
  answering as themselves, and asks which perspective they were assigned.
- **Pages 2 to 7**, one per perspective, each show the persona description,
  what that user needs from the system, and the numbered tasks to carry out
  before answering. Each page then asks the same eight agreement statements,
  two statements specific to that perspective, and whether the tasks were
  completed.
- **Page 8** closes every path with four open-ended questions.

All ratings use a five-point agreement scale from Strongly Disagree to
Strongly Agree.

## The six perspectives

| Perspective | Account to issue | Preset to apply |
| --- | --- | --- |
| Default learner | `haziq.learner@acess.edu.my` | None |
| Dyslexia learner | `mei.learner@acess.edu.my` | Dyslexia |
| Autism learner | `priya.learner@acess.edu.my` | Autism |
| ADHD learner | `amir.learner@acess.edu.my` | ADHD |
| Educator | `farah.educator@acess.edu.my` | Not applicable |
| Administrator | `aliff.admin@acess.edu.my` | Not applicable |

All seeded accounts share the demonstration password defined in
`supabase/seed/personas.ts`. Rebuild and seed the database before a session so
that every participant starts from the same data.

## Recording the results

Google Forms collects the responses into a linked spreadsheet (Responses tab →
**Link to Sheets**). Export that sheet into this folder once the collection
window closes, so that the figures reported in Chapter 6 can be traced back to
the raw responses.

## Important limitation

The participants are proxies. They are volunteers briefed to work through the
system from a predefined user perspective. They are not learners with Dyslexia,
ADHD or Autism, and they are not accessibility specialists. Their responses
describe how a briefed user experienced the interface and must not be presented
as evidence about the experience of the intended users. This limitation is
stated in Chapter 6 and Chapter 7 of the report and should be repeated wherever
these results are used.
