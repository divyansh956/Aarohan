const mongoose = require("mongoose");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const CourseProgress = require("../models/CourseProgress");
const Course = require("../models/Course");

/**
 * Update course progress when a subsection is completed.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */

exports.updateCourseProgress = async (req, res) => {
  const { courseId, subsectionId } = req.body;
  const userId = req.user.id;

  try {
    // Check if the subsection is valid
    const subsection = await SubSection.findById(subsectionId);
    if (!subsection) {
      return res.status(404).json({ error: "Invalid subsection" });
    }

    // Find the course progress document for the user and course
    let courseProgress = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    });

    if (!courseProgress) {
      // If course progress doesn't exist, create a new one
      return res.status(404).json({
        success: false,
        message: "Course progress does not exist",
      });
    } else {
      // If course progress exists, check if the subsection is already completed
      if (courseProgress.completedVideos.includes(subsectionId)) {
        return res.status(400).json({ error: "Subsection already completed" });
      }

      // Push the subsection into the completedVideos array
      courseProgress.completedVideos.push(subsectionId);
    }

    // Save the updated course progress
    await courseProgress.save();

    return res.status(200).json({ message: "Course progress updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get progress percentage for a user in a course.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */

exports.getProgressPercentage = async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user.id;

  if (!courseId) {
    return res.status(400).json({ error: "Course ID not provided." });
  }

  try {
    // Find the course progress document for the user and course
    let courseProgress = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    })
      .populate({
        path: "courseID",
        populate: {
          path: "courseContent",
        },
      })
      .exec();

    if (!courseProgress) {
      return res
        .status(400)
        .json({ error: "Cannot find Course Progress with these IDs." });
    }

    let lectures = 0;
    courseProgress.courseID.courseContent?.forEach((sec) => {
      lectures += sec.subSection.length || 0;
    });

    let progressPercentage =
      (courseProgress.completedVideos.length / lectures) * 100;

    // To round to 2 decimal places
    const roundedPercentage = Math.round(progressPercentage * 100) / 100;

    return res.status(200).json({
      data: roundedPercentage,
      message: "Successfully fetched Course progress",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};