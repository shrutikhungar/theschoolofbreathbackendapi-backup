const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');

const Music = require("../models/music.model");
const { mongoUri } = require('../configs/vars');
const crypto = require('crypto');
const path = require('path');



const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { log } = require('console');

// Ensure mongoose connection is open
const conn = mongoose.createConnection(mongoUri);

let gfsAudio, gfsImages;
conn.once('open', () => {
    console.log('Database is connected');
    // Initialize GridFS Bucket for audio
    gfsAudio = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'audioUploads'
    });
    // Initialize GridFS Bucket for images
    gfsImages = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'imageUploads'
    });
});
// Create storage engine
const storage = new GridFsStorage({
    url: mongoUri,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: file.mimetype.startsWith('audio') ? 'audioUploads' : 'imageUploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  exports.upload = multer({ storage });


  exports.uploadFile = async (req, res, next) => {
    try {
     
  const audioFile = req.files['audioFile'][0];
  const imageFile = req.files['imageFile'][0];

  // Create a new music document
  const newMusic = new Music({
    name: req.body.name,
    imageFilename:imageFile.filename,
    audioFilename: audioFile.filename,
    categories:req.body.categoryId,
    description:req.body.description
  });

  newMusic.save((err, music) => {
    if (err) return res.status(500).send(err);
    res.status(201).send({ music: music, message: 'Audio and image files uploaded successfully' });
  });
    } catch (error) {
      next(error);
    }
  };

  exports.deleteMusicFile = async (req, res) => {
    try {
      // Find the music item by id
      const music = await Music.findById(req.params.musicId);
      if (!music) {
          return res.status(404).json({ message: 'Music item not found' });
      }
  
      // Function to delete file from GridFS
      const deleteFileFromGridFS = async (gfs, filename) => {
          const files = await gfs.find({ filename: filename }).toArray();
          if (files.length > 0) {
              const fileId = files[0]._id;
              await gfs.delete(fileId);
          }
      };
  
      // Delete the audio file
      if (music.audioFilename) {
          await deleteFileFromGridFS(gfsAudio, music.audioFilename);
      }
  
      // Delete the image file, if it exists
      if (music.imageFilename) {
          await deleteFileFromGridFS(gfsImages, music.imageFilename);
      }
  
      // Delete the music item from the collection
      await Music.findByIdAndRemove(req.params.musicId);
  
      res.status(200).json({ message: 'Music item and associated files deleted successfully' });
  } catch (err) {
      console.error("Error occurred:", err);
      res.status(500).json({ message: err.message });
  }
  }

  // Endpoint to stream audio file
exports.streamAudio =async (req, res) => {
  const filename = req.params.filename;
    // Determine the bucket based on file type or other criteria
    const bucket = filename.endsWith('.mp3') ? gfsAudio : gfsImages;

    if (!bucket) {
        return res.status(500).send('GridFS bucket not initialized');
    }

    bucket.find({ filename: filename }).toArray((err, files) => {
        if (err || !files || files.length === 0) {
            return res.status(404).send('File not found');
        }

        const file = files[0];
        if (file.contentType.startsWith('audio') || file.contentType.startsWith('image')) {
            const readstream = bucket.openDownloadStream(file._id);
            res.set('Content-Type', file.contentType);
            readstream.pipe(res);
        } else {
            res.status(404).send('Unsupported file type');
        }
    });
};

exports.editMusic = async (req, res, next) =>{
  try {
    const musicId = req.params.musicId;
    const currentMusic = await Music.findById(musicId);
    const updateData = {
        name: req.body.name,
        categories: req.body.categoryId,
        description: req.body.description,
        // Add other fields as necessary
    };
     // Function to delete file from GridFS
     const deleteFileFromGridFS = async (gfs, filename) => {
      const files = await gfs.find({ filename: filename }).toArray();
      if (files.length > 0) {
          const fileId = files[0]._id;
          await gfs.delete(fileId);
      }
  };

  
    // Handle file updates (if files are part of the update)
    if (req.files) {
        const audioFile = req.files['audioFile'] ? req.files['audioFile'][0] : null;
        const imageFile = req.files['imageFile'] ? req.files['imageFile'][0] : null;

        if (audioFile) {
          if (currentMusic && currentMusic.audioFilename) {
            // Delete the old audio file from GridFS
            await deleteFileFromGridFS(gfsAudio, currentMusic.audioFilename);
        }
    
        // Update with the new audio file's filename
        updateData.audioFilename = audioFile.filename;
        }

        if (imageFile) {
          if (currentMusic && currentMusic.imageFilename) {
            // Delete the old audio file from GridFS
           await deleteFileFromGridFS(gfsAudio, currentMusic.imageFilename);
        }
            updateData.imageFilename = imageFile.filename;
            // Delete the old image file from GridFS
        }
    }

    const updatedMusic = await Music.findByIdAndUpdate(musicId, updateData, { new: true });
    res.status(200).json({ message: 'Music updated successfully', music: updatedMusic });
} catch (error) {
    next(error)
}
}
  