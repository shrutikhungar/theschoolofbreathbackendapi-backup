const controller = require("../controllers/courses.controller");
const CoursesController = require("../controllers/upload_courses.controller");
const couseProgressController = require("../controllers/course_progress.controller");
const { Router } = require("express");
const { authorize } = require("../utils/auth");

let router = Router();

router.route("/user").get(controller.getCourses);

router.route("/usersystemeio").get(CoursesController.getSystemeIoCourses);
router.route("/create").post(CoursesController.createCourse);
router.route("/update").put(CoursesController.updateCourse);
/* router.route("/list").get(  CoursesController.getCourses); */
router.route("/course/:id").get(CoursesController.getCourseById);
router.route("/scratch").get(CoursesController.getScratchCourses);

router.route("/scratch/:id").delete(CoursesController.deleteScratchCourse);
router.route("/delete/:id").delete(CoursesController.deleteCourse);
router.put("/order", CoursesController.updateCourseOrder);

//GET

router.post(
  "/:courseId/sections/:sectionId/lessons/:lessonId/complete",
  authorize(),
  couseProgressController.markLessonAsCompleted
);

router.patch(
  "/:courseId/sections/:sectionId/lessons/:lessonId/progress",
  authorize(),
  couseProgressController.updateLessonProgress
);


router.get("/my-progress",authorize(), couseProgressController.getAllUserCourseProgress);

router.get("/:courseId", couseProgressController.getCourseProgress);


module.exports = router;
