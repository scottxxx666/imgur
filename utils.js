const axios = require('axios');
const fs = require('fs');

/**
 * Downloads a file from a URL and saves it to the specified filename
 * @param {string} url - The URL of the file to download
 * @param {string} filename - The path where the file should be saved
 * @param {Object} options - Additional options for the download
 * @param {Object} options.headers - Custom headers for the request
 * @param {number} options.timeout - Request timeout in milliseconds
 * @returns {Promise<void>}
 */
async function downloadFile(url, filename, options = {}) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: options.timeout || 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ...options.headers
      }
    });

    const writer = fs.createWriteStream(filename);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading file: ${error.message}`);
    throw error;
  }
}

module.exports = {
  downloadFile
}; 