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

function uploadAllImages() {
  const imagesDir = 'downloads';
  fs.readdir(imagesDir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|mp4)$/i.test(file));
    let output = '';
    let processed = 0;

    imageFiles.forEach(file => {
      const imagePath = path.join(imagesDir, file);
      uploadToImgur(imagePath)
        .then(url => {
          output += `${url}\n`;
          // Delete the file after successful upload
          fs.unlink(imagePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error(`Error deleting ${file}:`, unlinkErr);
            } else {
              console.log(`Deleted ${file} after successful upload`);
            }
          });
          processed++;
          if (processed === imageFiles.length) {
            fs.writeFile('uploaded_images.txt', output, (writeErr) => {
              if (writeErr) {
                console.error('Error writing file:', writeErr);
              } else {
                console.log('All images uploaded, deleted, and URLs saved to uploaded_images.txt');
              }
            });
          }
        })
        .catch(error => {
          console.error(`Error uploading ${file}:`, error.message);
          processed++;
        });
    });
  });
}

// Usage
uploadAllImages();