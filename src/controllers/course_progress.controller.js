const Course = require('../models/courses.model');
const CourseProgress = require('../models/userProgress.model');


exports.getCourseProgress = async (req, res, next) => {
    const { courseId } = req.params;
    const userId = req.user._id;
  
    let progress = await CourseProgress.findOne({ courseId, userId });
  
    if (!progress) {
      const course = await Course.findById(courseId);
      if (!course) {
        return next(new AppError("Course not found", 404));
      }
  
      progress = await CourseProgress.create({
        userId,
        courseId,
        sectionsProgress: course.sections.map((section) => ({
          sectionId: section._id,
          lessonsProgress: section.lessons.map((lesson) => ({
            lessonId: lesson._id,
            completed: false,
          })),
        })),
      });
    }
  
    res.status(200).json({
      status: "success",
      data: {
        progress,
      },
    });
  };
  
  
  exports.markLessonAsCompleted = async (req, res, next) => {
    const { courseId, sectionId, lessonId } = req.params;
    const userId = req.user._id;
  
  
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        status: "error",
        message: "Course not found" 
      });
    }
  
  
    let progress = await CourseProgress.findOne({ courseId, userId });
  
    
    if (!progress) {
  
      const initialSectionsProgress = course.sections.map(section => ({
        sectionId: section._id.toString(),
        lessonsProgress: section.lessons.map(lesson => ({
          lessonId: lesson._id.toString(),
          completed: false,
          watchTimeInSeconds: 0,
          lastWatched: null,
          status: 'pending' // pending, in-progress, completed
        }))
      }));
  
      progress = await CourseProgress.create({
        userId,
        courseId,
        startDate: new Date(),
        lastAccessDate: new Date(),
        completionPercentage: 0,
        isCompleted: false,
        sectionsProgress: initialSectionsProgress
      });
    }
  
    let sectionProgress = progress.sectionsProgress.find(
      s => s.sectionId.toString() === sectionId
    );
  
    if (!sectionProgress) {
      const courseSection = course.sections.find(s => s._id.toString() === sectionId);
      if (courseSection) {
        const newSectionProgress = {
          sectionId: sectionId,
          lessonsProgress: courseSection.lessons.map(lesson => ({
            lessonId: lesson._id.toString(),
            completed: false,
            watchTimeInSeconds: 0,
            lastWatched: null,
            status: 'pending'
          }))
        };
        progress.sectionsProgress.push(newSectionProgress);
        sectionProgress = newSectionProgress;
      }
    }
  
  
    let lessonProgress = sectionProgress?.lessonsProgress.find(
      l => l.lessonId.toString() === lessonId
    );
  
    if (!lessonProgress && sectionProgress) {
      const courseSection = course.sections.find(s => s._id.toString() === sectionId);
      const courseLesson = courseSection?.lessons.find(l => l._id.toString() === lessonId);
      
      if (courseLesson) {
        lessonProgress = {
          lessonId: lessonId,
          completed: false,
          watchTimeInSeconds: 0,
          lastWatched: null,
          status: 'pending'
        };
        sectionProgress.lessonsProgress.push(lessonProgress);
      }
    }
  
    // 8. Marcar la lección como completada
    if (lessonProgress) {
      lessonProgress.completed = true;
      lessonProgress.lastWatched = new Date();
      lessonProgress.status = 'completed';
      await progress.updateCompletionPercentage();
      await progress.save();
    }
  
    res.status(200).json({
      status: "success",
      data: {
        progress
      }
    });
  }
  
  
  exports.getCourseProgress = async (req, res, next) => {
    const { courseId } = req.params;
    const userId = req.user._id;
  
    
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: "error",
        message: "Course not found"
      });
    }
  
  
    let progress = await CourseProgress.findOne({ courseId, userId });
  
    
    if (!progress) {
      const initialSectionsProgress = course.sections.map(section => ({
        sectionId: section._id.toString(),
        lessonsProgress: section.lessons.map(lesson => ({
          lessonId: lesson._id.toString(),
          completed: false,
          watchTimeInSeconds: 0,
          lastWatched: null,
          status: 'pending'
        }))
      }));
  
      progress = await CourseProgress.create({
        userId,
        courseId,
        startDate: new Date(),
        lastAccessDate: new Date(),
        completionPercentage: 0,
        isCompleted: false,
        sectionsProgress: initialSectionsProgress
      });
    }
  
    res.status(200).json({
      status: "success",
      data: {
        progress
      }
    });
  }
  exports.updateLessonProgress = async (req, res, next) => {
    const { courseId, sectionId, lessonId } = req.params;
    const { watchTimeInSeconds } = req.body;
    const userId = req.user._id;
  
    let progress = await CourseProgress.findOne({ courseId, userId });
  
    if (!progress) {
      return next(new AppError("Course progress not found", 404));
    }
  
    await progress.updateLessonWatchTime(sectionId, lessonId, watchTimeInSeconds);
  
    res.status(200).json({
      status: "success",
      data: {
        progress,
      },
    });
  };
  
  
  
  
  exports.getAllUserCourseProgress = async (req, res, next) => {
    const userId = req.user._id;
  
    const progresses = await CourseProgress.find({ userId });
  
    res.status(200).json({
      status: "success",
      data: {
        progresses,
      },
    });
  };
  