const fs = require('fs');
const files = [
  'src/components/educator/CourseAssets.tsx',
  'src/components/educator/CourseBuilder.tsx',
  'src/components/educator/CourseWorkspace.tsx',
  'src/components/educator/QuizBuilderModal.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/\* eslint-disable-next-line @next\/next\/no-img-element \*\//g, "{/* eslint-disable-next-line @next/next/no-img-element */}");
  fs.writeFileSync(file, content);
});
