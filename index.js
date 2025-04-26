const { downloadFromTwitter } = require('./twitter');
const { downloadFromWeverse } = require('./weverse');
const { uploadAllImages, createUnauthAlbum } = require('./imgur');
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
  const albumDeleteHash = process.env.IMGUR_ALBUM_DELETEHASH;

  try {
    if (await isFolderEmpty()) {
      const url = process.env.URL;
      await downloadFromUrl(url);
    }
    await uploadAllImages(albumDeleteHash);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
