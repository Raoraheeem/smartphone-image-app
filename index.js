const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { analyzeImage } = require('./utils/imageAnalysis');


const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// MongoDB Connection
mongoose.connect('mongodb+srv://raoraheem755:rao12345@cluster0.jodvvwo.mongodb.net/imageDB?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch((err) => console.error('❌ MongoDB connection error:', err));


// Schema
const ImageSchema = new mongoose.Schema({
  filename: String,         // Processed file name
  originalName: String,     // Original uploaded file name
  brand: String,            // iPhone, Samsung, etc.
  processedAt: Date,
});

const ImageModel = mongoose.model('Image', ImageSchema);

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ensure upload folder exists
const uploadFolder = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Upload route
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { brand } = req.body;
    const timestamp = Date.now();
    const originalFilename = `original-${timestamp}-${req.file.originalname}`;
    const processedFilename = `processed-${timestamp}-${req.file.originalname}`;

    const originalPath = path.join(uploadFolder, originalFilename);
    const processedPath = path.join(uploadFolder, processedFilename);

    // Save original image
    fs.writeFileSync(originalPath, req.file.buffer);

    // Processed version (resize + grayscale)
    const processedImage = await sharp(req.file.buffer)
      .resize({ width: 500 })
      .grayscale()
      .toBuffer();
    fs.writeFileSync(processedPath, processedImage);

    // Save metadata to DB
    const imageDoc = new ImageModel({
      filename: processedFilename,
      originalName: originalFilename,
      brand,
      processedAt: new Date(),
    });

    await imageDoc.save();

    res.json({ message: 'Image uploaded and processed', image: imageDoc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Image processing failed', details: err.message });
  }
});

// GET route to fetch all uploaded images
app.get('/images', async (req, res) => {
  try {
    const images = await ImageModel.find().sort({ processedAt: -1 });
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch images', details: err.message });
  }
});
app.get('/analyze/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    console.log('Analyzing:', type, filename);

    if (!['original', 'processed'].includes(type)) {
      return res.status(400).json({ error: 'Type must be original or processed' });
    }

    const fullFilename = `${type}-${filename}`;
    console.log('Full image file:', fullFilename);

    const metrics = await analyzeImage(fullFilename);
    console.log('Analysis result:', metrics);

    res.json({
      image: fullFilename,
      type,
      metrics,
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
