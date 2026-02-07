const fs = require('fs');

function wrapReadlink(readlink) {
  return function (path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    return readlink(path, options, (err, result) => {
      if (err && err.code === 'EISDIR') {
        err.code = 'EINVAL';
      }
      callback(err, result);
    });
  };
}

if (fs.readlink) {
  fs.readlink = wrapReadlink(fs.readlink);
}

if (fs.promises && fs.promises.readlink) {
  const orig = fs.promises.readlink.bind(fs.promises);
  fs.promises.readlink = async (path, options) => {
    try {
      return await orig(path, options);
    } catch (err) {
      if (err && err.code === 'EISDIR') {
        err.code = 'EINVAL';
      }
      throw err;
    }
  };
}
