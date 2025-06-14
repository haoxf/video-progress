// gulpfile.js
const { src, dest } = require('gulp');

function defaultTask(cb) {
  // 这里可以写你的构建任务
  cb();
}

exports.default = defaultTask;
