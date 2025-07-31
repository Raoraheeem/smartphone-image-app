const { Image } = require('image-js');
const path = require('path');
const fs = require('fs');

function calculateVariance(pixelData) {
  const mean = pixelData.reduce((sum, val) => sum + val, 0) / pixelData.length;
  const variance = pixelData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pixelData.length;
  return { variance, mean };
}

async function analyzeImage(filename) {
  const filepath = path.join(__dirname, '../public/uploads', filename);

  if (!fs.existsSync(filepath)) {
    throw new Error('Image not found');
  }

  const img = await Image.load(fs.readFileSync(filepath));
  const gray = img.grey(); // convert to grayscale
  const grayData = gray.data; // 1D pixel intensity array (0–255)

  const { variance, mean } = calculateVariance(grayData);
  const histogram = gray.getHistogram();
  const contrastEstimate = histogram.filter(x => x > 0).length;

  return {
    variance: variance.toFixed(2),
    mean: mean.toFixed(2),
    contrastEstimate,
  };
}

module.exports = { analyzeImage };
