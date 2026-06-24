const fs = require('fs');
const files = [
  'src/components/educator/EducatorAllCoursesPage.tsx',
  'src/components/educator/EducatorDashboardOverview.tsx',
  'src/components/educator/LessonEditor.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/don't/g, "don&apos;t");
  content = content.replace(/it's/g, "it&apos;s");
  content = content.replace(/you're/g, "you&apos;re");
  content = content.replace(/haven't/g, "haven&apos;t");
  content = content.replace(/didn't/g, "didn&apos;t");
  fs.writeFileSync(file, content);
});
