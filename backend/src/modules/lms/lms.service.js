const prisma = require('../../config/database');
const { getPaginationParams, getSortParams } = require('../../utils/pagination');
const { createUniqueSlug } = require('../../utils/slugify');

// ─── Courses ──────────────────────────────────────────────────

const createCourse = async (data, instructorId, companyId) => {
  const slug = await createUniqueSlug(data.title, prisma.course, 'slug', { companyId });

  return prisma.course.create({
    data: {
      companyId,
      title: data.title,
      slug,
      description: data.description,
      thumbnail: data.thumbnail,
      instructorId,
      price: data.price || 0,
      comparePrice: data.comparePrice,
      isFree: data.price === 0 || data.isFree,
      category: data.category,
      tags: data.tags || [],
      level: data.level || 'ALL_LEVELS',
      language: data.language || 'Hindi',
      requirements: data.requirements || [],
      whatYouLearn: data.whatYouLearn || [],
      certificate: data.certificate || false,
    },
  });
};

const getCourses = async (query, companyId, isAdmin = false) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { companyId };

  if (!isAdmin) where.isPublished = true;
  if (query.category) where.category = query.category;
  if (query.level) where.level = query.level;
  if (query.isFree !== undefined) where.isFree = query.isFree === 'true';
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
      orderBy: getSortParams(query, ['title', 'createdAt', 'price', 'totalStudents', 'rating']),
      skip,
      take: limit,
    }),
    prisma.course.count({ where }),
  ]);

  return { courses, total, page, limit };
};

const getCourseById = async (id, companyId, userId = null) => {
  const course = await prisma.course.findFirst({
    where: { id, companyId },
    include: {
      instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true, title: true, type: true, duration: true,
              order: true, isFreePreview: true, isPublished: true,
            },
          },
        },
        where: { isPublished: true },
      },
    },
  });

  if (!course) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }

  let enrollment = null;
  if (userId) {
    enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: id } },
    });
  }

  return { ...course, enrollment };
};

const updateCourse = async (id, data, companyId) => {
  const course = await prisma.course.findFirst({ where: { id, companyId } });
  if (!course) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }

  return prisma.course.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail,
      price: data.price,
      comparePrice: data.comparePrice,
      isFree: data.isFree,
      category: data.category,
      tags: data.tags,
      level: data.level,
      language: data.language,
      requirements: data.requirements,
      whatYouLearn: data.whatYouLearn,
      certificate: data.certificate,
      isPublished: data.isPublished,
    },
  });
};

const deleteCourse = async (id, companyId) => {
  const course = await prisma.course.findFirst({ where: { id, companyId } });
  if (!course) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }
  await prisma.course.update({ where: { id }, data: { isPublished: false } });
};

// ─── Modules ──────────────────────────────────────────────────

const createModule = async (courseId, data, companyId) => {
  const lastModule = await prisma.courseModule.findFirst({
    where: { courseId, companyId },
    orderBy: { order: 'desc' },
  });

  return prisma.courseModule.create({
    data: {
      courseId,
      companyId,
      title: data.title,
      description: data.description,
      order: lastModule ? lastModule.order + 1 : 1,
    },
  });
};

const updateModule = async (id, data, companyId) => {
  const module = await prisma.courseModule.findFirst({ where: { id, companyId } });
  if (!module) {
    const err = new Error('Module not found');
    err.statusCode = 404;
    throw err;
  }
  return prisma.courseModule.update({ where: { id }, data });
};

// ─── Lessons ──────────────────────────────────────────────────

const createLesson = async (moduleId, data, companyId) => {
  const module = await prisma.courseModule.findFirst({ where: { id: moduleId, companyId } });
  if (!module) {
    const err = new Error('Module not found');
    err.statusCode = 404;
    throw err;
  }

  const lastLesson = await prisma.lesson.findFirst({
    where: { moduleId, companyId },
    orderBy: { order: 'desc' },
  });

  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      courseId: module.courseId,
      companyId,
      title: data.title,
      type: data.type || 'TEXT',
      content: data.content,
      videoUrl: data.videoUrl,
      videoProvider: data.videoProvider,
      duration: data.duration || 0,
      order: lastLesson ? lastLesson.order + 1 : 1,
      isFreePreview: data.isFreePreview || false,
      attachments: data.attachments || [],
    },
  });

  // Update course totals
  await updateCourseTotals(module.courseId);

  return lesson;
};

const updateCourseTotals = async (courseId) => {
  const [lessons, totalDuration] = await Promise.all([
    prisma.lesson.count({ where: { courseId, isPublished: true } }),
    prisma.lesson.aggregate({
      where: { courseId, isPublished: true },
      _sum: { duration: true },
    }),
  ]);

  await prisma.course.update({
    where: { id: courseId },
    data: {
      totalLessons: lessons,
      totalDuration: totalDuration._sum.duration || 0,
    },
  });
};

// ─── Enrollments ──────────────────────────────────────────────

const enrollStudent = async (userId, courseId, companyId, paymentId = null) => {
  const course = await prisma.course.findFirst({ where: { id: courseId, companyId, isPublished: true } });
  if (!course) {
    const err = new Error('Course not found or not available');
    err.statusCode = 404;
    throw err;
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) {
    const err = new Error('Already enrolled in this course');
    err.statusCode = 409;
    throw err;
  }

  const enrollment = await prisma.enrollment.create({
    data: { userId, courseId, companyId, paymentId },
  });

  // Increment total students
  await prisma.course.update({
    where: { id: courseId },
    data: { totalStudents: { increment: 1 } },
  });

  return enrollment;
};

const updateProgress = async (userId, lessonId, courseId, companyId, data) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (!enrollment) {
    const err = new Error('Not enrolled in this course');
    err.statusCode = 403;
    throw err;
  }

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId, lessonId, courseId, companyId,
      completed: data.completed || false,
      watchedSeconds: data.watchedSeconds || 0,
      completedAt: data.completed ? new Date() : null,
    },
    update: {
      completed: data.completed,
      watchedSeconds: data.watchedSeconds,
      completedAt: data.completed ? new Date() : null,
    },
  });

  // Recalculate overall course progress
  const [completedLessons, totalLessons] = await Promise.all([
    prisma.lessonProgress.count({ where: { userId, courseId, completed: true } }),
    prisma.lesson.count({ where: { courseId, isPublished: true } }),
  ]);

  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  await prisma.enrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: {
      progress: progressPercent,
      completedAt: progressPercent === 100 ? new Date() : null,
      status: progressPercent === 100 ? 'COMPLETED' : 'ACTIVE',
    },
  });

  return { progress: progressPercent, lessonProgress: progress };
};

const getMyEnrollments = async (userId, query) => {
  const { page, limit, skip } = getPaginationParams(query);

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true, title: true, thumbnail: true, totalLessons: true,
            totalDuration: true, level: true, instructor: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.enrollment.count({ where: { userId } }),
  ]);

  return { enrollments, total, page, limit };
};

module.exports = {
  createCourse, getCourses, getCourseById, updateCourse, deleteCourse,
  createModule, updateModule,
  createLesson,
  enrollStudent, updateProgress, getMyEnrollments,
};
