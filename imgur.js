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

    return {
      link: response.data.data.link,
      deletehash: response.data.data.deletehash,
      id: response.data.data.id
    };
  } catch (error) {
    console.error('Error uploading file:', error.message);
    throw error;
  }
}

async function addImageToAlbum(imageDeleteHash, albumDeleteHash) {
  if (!imageDeleteHash || !albumDeleteHash) {
    console.error('Image or album delete hash not provided');
    return;
  }
  try {
    const response = await axios.post(
      `https://api.imgur.com/3/album/${albumDeleteHash}/add`,
      { deletehashes: [imageDeleteHash] },
      {
        headers: {
          'Authorization': `Client-ID ${process.env.IMGUR_CLIENT_ID}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding image to album:', error.message);
    throw error;
  }
}

async function uploadAllImages(albumDeleteHash) {
  const imagesDir = 'downloads';
  try {
    const files = await fs.promises.readdir(imagesDir);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|mp4)$/i.test(file));
    
    if (imageFiles.length === 0) {
      console.log('No images found to upload');
      return;
    }
    
    let output = '';
    let processed = 0;

    for (const file of imageFiles) {
      try {
        const imagePath = path.join(imagesDir, file);
        const uploadResult = await uploadToImgur(imagePath);
        output += `${uploadResult.link}\n`;
        
        await addImageToAlbum(uploadResult.deletehash, albumDeleteHash);

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

async function createUnauthAlbum(title, description = '') {
  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('privacy', 'public');

    const response = await axios.post('https://api.imgur.com/3/album', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Client-ID ${process.env.IMGUR_CLIENT_ID}`
      }
    });

    return {
      id: response.data.data.id,
      deletehash: response.data.data.deletehash,
      link: `https://imgur.com/a/${response.data.data.id}`
    };
  } catch (error) {
    console.error('Error creating album:', error.message);
    throw error;
  }
}

module.exports = {
  uploadToImgur,
  uploadAllImages,
  createUnauthAlbum,
  addImageToAlbum
}; 