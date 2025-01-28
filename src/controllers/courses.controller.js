
const axios = require("axios");
const { getAllCourses } = require('../data/courses/courses')
const Course = require('../models/courses.model');
// Access Rules
const fullAccessTags = ['Enrolled_Holistic Membership'];

const limitedAccessRules = {
  'Enrolled_to_Sleep_Membership': ['7'],
  'Purchased_9-Day Breathwork Course': ['4'],
  'Purchased_9-Day Meditation Course': ['5'],
  'Purchased_Swara_Yoga_Course': ['6'],
  'Purchased_9-Day Bliss Course': ['1'],
  'Purchased_12-Day ThirdEye Course': ['8']
};

const combinedAccessRules = [
  {
    tags: ['Enrolled_to_Sleep_Membership', 'Purchased_9-Day Breathwork Course'],
    courses: ['4', '7']
  },
  {
    tags: ['Purchased_9-Day Breathwork Course', 'Purchased_9-Day Meditation Course'],
    courses: ['4', '5']
  }
];

const getAccessibleCourses = (userTags) => {
  if (userTags.length === 0) {
    return [];
  }

  let accessible = new Set();

  if (userTags.some(tag => fullAccessTags.includes(tag))) {
    return 'full';
  }

  userTags.forEach(tag => {
    if (limitedAccessRules[tag]) {
      limitedAccessRules[tag].forEach(courseId => accessible.add(courseId));
    }
  });

  combinedAccessRules.forEach(rule => {
    if (rule.tags.every(tag => userTags.includes(tag))) {
      rule.courses.forEach(courseId => accessible.add(courseId));
    }
  });

  return Array.from(accessible);
};

/* exports.getCourses = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const courses = getAllCourses();

    // If no user email, return all courses with hasAccess: false
    if (!userEmail) {
      const coursesWithAccess = courses.map(course => ({
        ...course,
        hasAccess: false
      }));

      return res.status(200).json({
        courses: coursesWithAccess
      });
    }

    // Get user tags from Systeme.io
    const response = await axios.get(`https://api.systeme.io/api/contacts?email=${userEmail}`, {
      headers: {
        'x-api-key': process.env.API_SYSTEME_KEY
      },
    });

    const contacts = response.data?.items[0] ?? null;
    const userTags = contacts ? contacts.tags.map(tag => tag.name) : [];
    const accessibleCourseIds = getAccessibleCourses(userTags);

    let coursesWithAccess;
    if (accessibleCourseIds === 'full') {
      coursesWithAccess = courses.map(course => ({
        ...course,
        hasAccess: true
      }));
    } else {
      coursesWithAccess = courses.map(course => ({
        ...course,
        hasAccess: accessibleCourseIds.includes(course.id)
      }));
    }

    return res.status(200).json({
      courses: coursesWithAccess
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 */

/**
 * @swagger
 * /courses/user:
 *   get:
 *     summary: Get all courses with access control
 *     description: Retrieves courses and determines user access based on Systeme.io tags
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of courses with access flags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       systemeIoId:
 *                         type: string
 *                       creationMethod:
 *                         type: string
 *                         enum: [fromScratch, fromSystemeio]
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       type:
 *                         type: string
 *                       days:
 *                         type: string
 *                       time:
 *                         type: string
 *                       courseTheme:
 *                         type: string
 *                       accessTags:
 *                         type: array
 *                         items:
 *                           type: string
 *                       hasAccess:
 *                         type: boolean
 *                         description: Indicates if user has access to this course
 *       401:
 *         description: No authentication token provided
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
exports.getCourses = async (req, res) => {
  try {
    const userEmail = req.query.email;
    const courses = await Course.find().sort({ order: 1, createdAt: -1 });

    if (!userEmail) {
      // For non-authenticated users, return courses with only free content
      const coursesWithLimitedAccess = courses.map(course => {
        const processedCourse = course.toObject();
        processedCourse.sections = processedCourse.sections.map(section => {
          if (section.isPremium) {
            // If section is premium, only show free lessons if any
            section.lessons = section.lessons.filter(lesson => !lesson.isPremium);
          }
          return section;
        }).filter(section => section.lessons.length > 0); // Only include sections with available lessons
        return {
          ...processedCourse,
          hasAccess: false
        };
      });

      return res.status(200).json({
        courses: coursesWithLimitedAccess
      });
    }

    // Get user tags from Systeme.io
    const response = await axios.get(`https://api.systeme.io/api/contacts?email=${userEmail}`, {
      headers: {
        'x-api-key': process.env.API_SYSTEME_KEY
      },
    });

    const contacts = response.data?.items[0] ?? null;
    const userTags = contacts ? contacts.tags.map(tag => tag.name) : [];

    // Process courses based on user access
    const coursesWithAccess = courses.map(course => {
      const hasFullAccess = userTags.some(tag => fullAccessTags.includes(tag));
      const hasSpecificAccess = course.accessTags.some(tag => userTags.includes(tag));
      const courseObj = course.toObject();

      if (hasFullAccess || hasSpecificAccess) {
        // User has full access to this course
        return {
          ...courseObj,
          hasAccess: true
        };
      } else {
        // Limited access: only show free content
        courseObj.sections = courseObj.sections.map(section => {
          if (section.isPremium) {
            section.lessons = section.lessons.filter(lesson => !lesson.isPremium);
          }
          return section;
        }).filter(section => section.lessons.length > 0);

        return {
          ...courseObj,
          hasAccess: false
        };
      }
    });

    return res.status(200).json({ courses: coursesWithAccess });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get specific course by ID with access check
exports.getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userEmail = req.user.email;

    // Get user tags from Systeme.io
    const response = await axios.get(`https://api.systeme.io/api/contacts?email=${userEmail}`, {
      headers: {
        'x-api-key': process.env.API_SYSTEME_KEY
      },
    });

    const contacts = response.data?.items[0] ?? null;
    const userTags = contacts ? contacts.tags.map(tag => tag.name) : [];

    // Find course from arrays instead of database
    const courses = getAllCourses();
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Determine access
    const accessibleCourseIds = getAccessibleCourses(userTags);
    const hasAccess = accessibleCourseIds === 'full' || accessibleCourseIds.includes(course.id);

    if (!hasAccess) {
      // Return limited preview version
      const limitedCourse = {
        ...course.toObject(),
        sections: course.sections.map((section, index) => ({
          ...section,
          lessons: index === 0 ? section.lessons.slice(0, 2) : []
        }))
      };
      return res.status(200).json({
        course: limitedCourse,
        hasFullAccess: false
      });
    }

    return res.status(200).json({
      course,
      hasFullAccess: accessibleCourseIds === 'full'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

