const { src, dest, task } = require('gulp');
const path = require('path');

// Define the build:icons task
task('build:icons', function() {
  // Copy all SVG files from nodes to dist directory
  return src(path.join('nodes', '**', '*.svg'))
    .pipe(dest('dist/nodes'));
});
