const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { Storage } = require('@google-cloud/storage');
const mongoose = require('mongoose');
const Music = require("../models/videos.model");

// Decode the environment variable to a temporary file

// Initialize Google Cloud Storage
const storage = new Storage({
  credentials: JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_VIDEO_BASE64, 'base64').toString('ascii'))
});


const bucketName = 'theschoolofbreath';

const uploadFileToStorage = async (file, isPoster = false) => {
  // Determine the file path based on whether it's a poster
  const filePath = isPoster ? `posters/${file.originalname}` : `videos/${file.originalname}`;

  const blob = storage.bucket(bucketName).file(filePath);
  const blobStream = blob.createWriteStream();

  await new Promise((resolve, reject) => {
      blobStream.on('error', reject);
      blobStream.on('finish', resolve);
      blobStream.end(file.buffer);
  });

  return `https://storage.googleapis.com/${bucketName}/${blob.name}`;
};

async function deleteFileFromStorage(fileName, isPoster = false) {
  // Determine the file path based on whether it's a poster
  const filePath = isPoster ? `posters/${fileName}` : `videos/${fileName}`;

  await storage.bucket(bucketName).file(filePath).delete();
}

exports.uploadFiles = async (req, res, next) => {
    try {
        // Ensure both sound and poster files are uploaded
        if (!req.files.videoFile || !req.files.imageFile) {
            return res.status(400).send({message:'Both video and poster files are required.'});
        }

        const audioFile = req.files.videoFile[0]; // Assuming `audioFile` is the field name for the sound file
        const imageFile = req.files.imageFile[0]; // Assuming `imageFile` is the field name for the poster file

        // Function to upload file to Google Cloud Storage and return the URL
        const uploadFileToStorage = async (file, isPoster = false) => {
          // Determine the file path based on whether it's a poster
          const filePath = isPoster ? `posters/${file.originalname}` : `videos/${file.originalname}`;
      
          const blob = storage.bucket(bucketName).file(filePath);
          const blobStream = blob.createWriteStream();
      
          await new Promise((resolve, reject) => {
              blobStream.on('error', reject);
              blobStream.on('finish', resolve);
              blobStream.end(file.buffer);
          });
      
          return `https://storage.googleapis.com/${bucketName}/${blob.name}`;
      };
      

        // Upload files
        const audioFileUrl = await uploadFileToStorage(audioFile);
        const imageFileUrl = await uploadFileToStorage(imageFile,true);

        // Save music details in MongoDB
        const music = new Music({
            // Add other music details here, e.g., title, artist
            name: req.body.name,
            categories:req.body.categoryId,
            description:req.body.description,
            videoFilename: audioFileUrl,
            imageFilename: imageFileUrl,
        });

        await music.save();

        res.status(200).send({
            message: 'Music uploaded and saved successfully.',
            data: {
                videoUrl: audioFileUrl,
                posterUrl: imageFileUrl,
                // Include any other details you saved
            }
        });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

exports.editMusicItem = async (req, res) => {
  try {
      const { musicId } = req.params; // Music item's ID from URL parameter
      const musicItem = await Music.findById(musicId);
      const updateData = {
        name: req.body.name,
        categories: req.body.categoryId,
        description: req.body.description,
        // Add other fields as necessary
    };
      if (!musicItem) {
          return res.status(404).send({message: 'Music item not found.'});
      }

      // Check for new file uploads and delete old files if new ones are provided
      if (req.files && req.files.videoFile) {
          if (musicItem.videoFilename) {
              const oldaudioFileName = musicItem.videoFilename.split('/').pop();
              await deleteFileFromStorage(oldaudioFileName);
          }
          const newaudioFile = req.files.audioFile[0];
          updateData.videoFilename = await uploadFileToStorage(newaudioFile); // Update with new sound URL
      }

      if (req.files && req.files.imageFile) {
          if (musicItem.imageFilename) {
              const oldimageFileName = musicItem.imageFilename.split('/').pop();
              await deleteFileFromStorage(oldimageFileName,true);
          }
          const newimageFile = req.files.imageFile[0];
          updateData.imageFilename = await uploadFileToStorage(newimageFile, true); // Update with new poster URL
      }

      // Save the updated music item in the database
      const updatedMusic = await Music.findByIdAndUpdate(musicId, updateData, { new: true });

      res.status(200).send({
          message: 'Music item updated successfully.',
          data: updatedMusic,
      });
  } catch (error) {
      res.status(500).send({ message: error.message });
  }
};

exports.deleteMusicItem = async (req, res) =>{
  const { musicId } = req.params;

    try {
        const musicItem = await Music.findById(musicId);
      

        if (!musicItem) {
            return res.status(404).send({ message: 'Music item not found.' });
        }

           // Delete sound file if it exists
          if (musicItem.videoFilename) {
            const audioFileName = musicItem.videoFilename.split('/').pop();
            await deleteFileFromStorage(audioFileName); // Assuming this is not in the `images` folder
        }

        // Delete poster file if it exists
        if (musicItem.imageFilename) {
            const imageFileName = musicItem.imageFilename.split('/').pop();
            await deleteFileFromStorage(imageFileName, true); // Assuming this is in the `images` folder
        }  
        // Delete the music item from the database
        await Music.deleteOne({ _id: musicId });

        res.status(200).send({ message: 'Music item and related files deleted successfully.' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
}

exports.getAll = async (req, res, next) => {
    try {
     
      const data = await Music.aggregate([
        {
          $addFields: {
            isFavorite: {
              $cond: { if: { $in: [req.user._id, '$favorites'] }, then: 1, else: 0 }
            }
          }
        },
        { $sort: { isFavorite: -1 } },
        { $project: { sections: false } }
      ]);
      return res.status(200).json({ info: "OK", success: true, data: data });
    } catch (error) {
      next(error);
    }
  };



  exports.getAllAdmin = async (req, res, next) => {
    try {
     
      const data =  await Music.find()
      return res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ message: err.message });
    }
  };

  exports.getOne = async (req, res, next) => {
    try {
      const { slug } = req.params;
      const data = await Music.findById(slug);
      

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  exports.getMusicsByCategory = async (req, res, next) => {
    try {
      const { category } = req.query;
      let query = {};
  
      if (category) {
          // Assuming 'category' is the ObjectId of the category
          query.categories = { $in: [category] };
      }
  
      const musicList = await Music.find(query).populate('categories');
      return res.status(200).json(musicList)
    } catch (error) {
      res.status(500).json({ message: err.message });
    }
  }

  exports.getAllFavoritesByCategory = async (req, res, next) => {
    try {
      const { category } = req.query; // Get the category from query parameters
      let query = { favorites: req.user._id };
  
      if (category) {
          // Assuming 'category' is the ObjectId or name of the category
          query.categories = { $in: [category] };
      }
  
      const favoriteProjects = await Music.find(query).populate('categories');
      return res.status(200).json(favoriteProjects);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };