const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { downloadFile } = require('./utils');
const { DOWNLOADS_DIR } = require('./config');

async function downloadFromTwitter(tweetUrl) {
  let browser;
  try {
    // Launch browser with options
    browser = await chromium.launch({
      headless: true,
      timeout: 30000,
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();
    
    console.log('Navigating to tweet...');
    await page.goto(tweetUrl, { waitUntil: 'networkidle' });
    
    // Wait for images to load with timeout
    await page.waitForSelector('img[src*="pbs.twimg.com/media"]', { timeout: 10000 });
    
    // Get all image URLs
    const imageUrls = await page.evaluate(() => {
      const images = document.querySelectorAll('img[src*="pbs.twimg.com/media"]');
      return Array.from(images).map(img => {
        // Get the highest quality image by modifying the URL
        return img.src.replace(/&name=\w+$/, '&name=orig');
      });
    });

    if (imageUrls.length === 0) {
      console.log('No images found in the tweet.');
      return;
    }
    

    // Download each image
    console.log(`Found ${imageUrls.length} images`);
    for (let [index, imageUrl] of imageUrls.entries()) {
      const extension = '.jpg';  // Twitter images are typically JPG
      const filename = path.join(DOWNLOADS_DIR, `image_${index}${extension}`);
      
      console.log(`Downloading image ${index + 1}/${imageUrls.length}...`);
      await downloadFile(imageUrl, filename);
      console.log(`✓ Image ${index + 1} saved as ${filename}`);
    }

    console.log('All images downloaded successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  downloadFromTwitter
};
