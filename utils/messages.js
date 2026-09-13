const moment = require('moment');

// `meta` carries optional media info so text + file messages share one shape.
// meta = { type: 'text'|'image'|'video'|'audio', fileUrl, fileName }
function formatMessage(username, text, meta = {}) {
  return {
    username,
    text,
    time: moment().format('h:mm a'),
    type: meta.type || 'text',
    fileUrl: meta.fileUrl || null,
    fileName: meta.fileName || null
  };
}

module.exports = formatMessage;


