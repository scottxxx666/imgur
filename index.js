const { downloadFromTwitter } = require('./twitter');
const { downloadFromWeverse } = require('./weverse');
const { uploadAllImages } = require('./imgur');
const { isFolderEmpty } = require('./utils');

require('dotenv').config();

async function downloadFromUrl(url) {
  
  if (!url) {
    console.error('No URL provided');
    return;
  }

  try {
    if (url.includes('weverse.io')) {
      await downloadFromWeverse(url);
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      await downloadFromTwitter(url);
    } else {
      console.error('Unsupported URL source');
      return;
    }
  } catch (error) {
    console.error('Error processing URL:', error.message);
  }
}

async function main() {
  try {
    if (await isFolderEmpty()) {
      const url = process.env.URL;
      await downloadFromUrl(url);
    }
    await uploadAllImages();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
