const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get credentials from .env file
const WEVERSE_EMAIL = process.env.WEVERSE_EMAIL;
const WEVERSE_PASSWORD = process.env.WEVERSE_PASSWORD;

// Validate environment variables
if (!WEVERSE_EMAIL || !WEVERSE_PASSWORD) {
  console.error('Error: Missing credentials in .env file');
  console.error('Please create a .env file with WEVERSE_EMAIL and WEVERSE_PASSWORD');
  process.exit(1);
}

const { downloadFile } = require('./utils');
const { DOWNLOADS_DIR } = require('./config');

async function getImagesFromWeverse(postUrl) {
  let browser;
  let context;
  try {
    // Launch browser
    browser = await chromium.launch({
      headless: false,
      timeout: 30000,
    });

    // Create a persistent context with storage state
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      storageState: fs.existsSync('auth.json') ? 'auth.json' : undefined,
    });
    
    const page = await context.newPage();
    
    // Check if we're already logged in by visiting the post URL directly
    await page.goto(postUrl, { waitUntil: 'networkidle' });
    
    // wait for 10 seconds
    // await new Promise(resolve => setTimeout(resolve, 100000));

    // Check if we need to log in by looking for a Login button
    const needsLogin = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(button => button.textContent.trim().toLowerCase().includes('login'));
    });

    if (needsLogin) {
      console.log('Not logged in, proceeding with login...');
      await page.goto('https://account.weverse.io/en/login/redirect?client_id=weverse&redirect_uri=https%3A%2F%2Fweverse.io%2FloginResult%3Ftopath%3D%252F&redirectMethod=GET');
      
      // Wait for login form and fill credentials
      await page.waitForSelector('input[type="password"]');
      await page.fill('input[name="email"]', WEVERSE_EMAIL);
      await page.fill('input[type="password"]', WEVERSE_PASSWORD);
      
      // Click login button
      console.log('Logging in...');
      await page.click('button[type="submit"]');

      // Wait for manual login completion
      console.log('Please complete the login process manually in the browser window...');
      await page.waitForURL(url => !url.toString().includes('login') && !url.toString().includes('account.weverse.io'), { timeout: 300000 }); // 5 minutes timeout
      console.log('Login successful!');

      // Save the authentication state
      await context.storageState({ path: 'auth.json' });
      console.log('Authentication state saved for future use');

      // Navigate to the post URL
      await page.goto(postUrl, { waitUntil: 'networkidle' });
    } else {
      console.log('Already logged in, proceeding with image download...');
    }
    
    const bodyDom = 'div[class*="DescriptionView_container"]';
    // const bodyDom = 'div[class^="PostModalView_content"]';

    // Wait for images to load
    await page.waitForSelector(bodyDom, { timeout: 10000 });
    
    // Click the content div first to make it active
    console.log('Clicking content div to make it active...');
    await page.evaluate(() => {
      const bodyDom = 'div[class*="DescriptionView_container"]';
      const contentDiv = document.querySelector(bodyDom);
      if (contentDiv) {
        contentDiv.click();
      }
    });
    
    // Wait a bit for the content to become fully active
    await page.waitForTimeout(1000);
    
    // Scroll to bottom to load all images
    console.log('Scrolling to load all images...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        const bodyDom = 'div[class*="DescriptionView_container"]';
        const contentDiv = document.querySelector(bodyDom);
        // const contentDiv = document.querySelector('div[class="WeverseViewer"]');
        if (!contentDiv) {
          console.log('Content div not found, using window scroll');
          resolve();
          return;
        }

        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = contentDiv.scrollHeight;
          contentDiv.scrollBy(0, scrollHeight);
          totalHeight += 100;

          if(totalHeight >= scrollHeight) {
            clearInterval(timer);
            // Scroll back to top
            // contentDiv.scrollTo(0, 0);
            resolve();
          }
        }, 100);
      });
    });
    
    // Get all image URLs
    const imageUrls = await page.evaluate(() => {
      // const images = document.querySelectorAll('img[class*="photo"]');
      const images = document.querySelectorAll('img[class*="DescriptionView_image"]');
      return Array.from(images).map(img => {
        // Get the full resolution image URL and remove query strings
        return img.src.split('?')[0];
      });
    });

    if (imageUrls.length === 0) {
      console.log('No images found in the post.');
      return;
    }


    // Download each image
    console.log(`Found ${imageUrls.length} images`);
    for (let [index, imageUrl] of imageUrls.entries()) {
      const extension = path.extname(imageUrl) || '.jpg';
      const filename = path.join(DOWNLOADS_DIR, `weverse_image_${index + 1}${extension}`);
      
      console.log(`Downloading image ${index + 1}/${imageUrls.length}...`);
      await downloadFile(imageUrl, filename, {
        headers: {
          'Referer': 'https://weverse.io/'
        }
      });
      console.log(`✓ Image ${index + 1} saved as ${filename}`);
    }

    // wait for 10 seconds
    // await new Promise(resolve => setTimeout(resolve, 100000));

    console.log('All images downloaded successfully!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

// Check if URL is provided as command line argument
const postUrl = 'https://weverse.io/lesserafim/media/1-157643286';

if (!postUrl) {
  console.error('Please provide a Weverse post URL');
  process.exit(1);
}

if (!postUrl.includes('weverse.io')) {
  console.error('Please provide a valid Weverse URL');
  process.exit(1);
}

getImagesFromWeverse(postUrl); 