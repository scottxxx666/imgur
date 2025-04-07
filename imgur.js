const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function uploadToImgur(filePath) {
  try {
    const file = fs.createReadStream(filePath);
    const formData = new FormData();
    const isVideo = path.extname(filePath).toLowerCase() === '.mp4';

    if (isVideo) {
      formData.append('video', file);
    } else {
      formData.append('image', file);
    }

    const endpoint = isVideo ? 'https://api.imgur.com/3/upload' : 'https://api.imgur.com/3/image';

    const response = await axios.post(endpoint, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Client-ID ${process.env.IMGUR_CLIENT_ID}`
      }
    });

    return response.data.data.link;
  } catch (error) {
    console.error('Error uploading file:', error.message);
    throw error;
  }
}

async function uploadAllImages() {
  const imagesDir = 'downloads';
  try {
    const files = await fs.promises.readdir(imagesDir);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|mp4)$/i.test(file));
    let output = '';
    let processed = 0;

    for (const file of imageFiles) {
      try {
        const imagePath = path.join(imagesDir, file);
        const url = await uploadToImgur(imagePath);
        output += `${url}\n`;
        
        // Delete the file after successful upload
        await fs.promises.unlink(imagePath);
        console.log(`Deleted ${file} after successful upload`);
        
        processed++;
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
        processed++;
      }
    }

    if (processed === imageFiles.length) {
      await fs.promises.writeFile('uploaded_images.txt', output);
      console.log('All images uploaded, deleted, and URLs saved to uploaded_images.txt');
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
}

module.exports = {
  uploadToImgur,
  uploadAllImages
}; 