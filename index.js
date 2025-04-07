const { downloadFromTwitter } = require('./twitter');
const { downloadFromWeverse } = require('./weverse');
const { uploadAllImages } = require('./imgur');
require('dotenv').config();

async function processUrl(url) {
  
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

    await uploadAllImages();
  } catch (error) {
    console.error('Error processing URL:', error.message);
  }
}

// Check if URL is provided in environment variables
const url = process.env.URL;
if (url) {
  processUrl(url);
} else {
  console.error('Please provide a URL in the environment variables');
}