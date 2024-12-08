// controllers/courseController.js

const { default: mongoose } = require('mongoose');
const Course = require('../models/courses.model');
const axios = require('axios');

// Fetch from Systeme.io
const fetchSystemeIoCourses = async () => {
  try {
    const response = await axios.get('https://api.systeme.io/api/school/courses', {
      headers: {
        'x-api-key': process.env.API_SYSTEME_KEY
      }
    });
    return response.data.items;
  } catch (error) {
    console.error('Error fetching Systeme.io courses:', error);
    return [];
  }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the course
 *         description:
 *           type: string
 *           description: Description of the course
 *         creationMethod:
 *           type: string
 *           enum: [fromScratch, fromSystemeio]
 *           description: The method by which the course was created
 *         systemeIoId:
 *           type: string
 *           description: The Systeme.io ID if the course is imported
 */

/**
 * @swagger
 * /api/courses/systemeio:
 *   get:
 *     summary: Get all courses from Systeme.io
 *     responses:
 *       200:
 *         description: List of courses from Systeme.io
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 *       500:
 *         description: Internal server error
 */
exports.getSystemeIoCourses = async (req, res) => {
  try {
    const courses = await fetchSystemeIoCourses();
    return res.status(200).json({ courses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new course
exports.createCourse = async (req, res) => {
  try {
    const { courseData, creationMethod } = req.body;
    const { id, _id, ...courseToSave } = courseData;

    const course = await Course.create({
      ...courseToSave,
      creationMethod,
      ...(creationMethod === 'fromSystemeio' ? { systemeIoId: id } : {})
    });

    return res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Update existing course
exports.updateCourse = async (req, res) => {
  try {
    const { courseData, creationMethod } = req.body;
    const { _id, __v, createdAt, updatedAt, ...updateData } = courseData;

    let course;

    if (creationMethod === 'fromSystemeio') {
      course = await Course.findOneAndUpdate(
        { systemeIoId: courseData.id },
        { ...updateData, systemeIoId: courseData.id },
        { new: true }
      );
    } else {
      // Use _id for scratch courses
      course = await Course.findByIdAndUpdate(
        _id, // Use MongoDB _id
        updateData,
        { 
          new: true,
          runValidators: true
        }
      );
    }

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    return res.status(200).json({
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 
 // Get courses with access control
/*  exports.getCourses = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const courses = await Course.find();
 
    if (!userEmail) {
      const coursesWithAccess = courses.map(course => ({
        ...course.toObject(),
        hasAccess: false
      }));
      return res.status(200).json({ courses: coursesWithAccess });
    }
 

 
    let coursesWithAccess;
    if (accessibleCourseIds === 'full') {
      coursesWithAccess = courses.map(course => ({
        ...course.toObject(),
        hasAccess: true
      }));
    } else {
      coursesWithAccess = courses.map(course => ({
        ...course.toObject(),
        hasAccess: accessibleCourseIds.includes(course.systemeIoId)
      }));
    }
 
    return res.status(200).json({ courses: coursesWithAccess });
 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
 }; */

 exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by systemeIoId first
    let course = await Course.findOne({ systemeIoId: id });

    // If not found and id is valid ObjectId, try finding by _id
    if (!course && mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findById(id);
    }

    // If course not found in database, return 404
    if (!course) {
      return res.status(200).json(null); // Return null instead of 404 as frontend expects
    }

    return res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

 // Backend route for scratch courses
exports.getScratchCourses = async (req, res) => {
  try {
    const courses = await Course.find({ creationMethod: 'fromScratch' });
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// controllers/courseController.js
exports.deleteScratchCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.creationMethod !== 'fromScratch') {
      return res.status(400).json({ message: 'Can only delete courses created from scratch' });
    }

    await Course.findByIdAndDelete(id);
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};