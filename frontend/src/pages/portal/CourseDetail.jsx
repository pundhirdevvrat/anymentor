import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lmsApi, companyApi } from '../../services/api';
import useCompanyStore from '../../store/companyStore';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function CourseDetail() {
  const { slug, courseId } = useParams();
  const navigate = useNavigate();
  const { company, setCompany } = useCompanyStore();
  const { isAuthenticated } = useAuthStore();

  const [course, setCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    if (!slug) return;
    const resolveCompany = company?.slug === slug
      ? Promise.resolve({ data: { data: company } })
      : companyApi.getBySlug(slug);

    resolveCompany
      .then((res) => {
        const data = res.data?.data || res.data;
        setCompany(data);
        const cid = data.id || data._id;
        setCompanyId(cid);
        return Promise.all([
          lmsApi.getCourse(cid, courseId),
          isAuthenticated
            ? lmsApi.getMyEnrollments(cid).catch(() => ({ data: { data: [] } }))
            : Promise.resolve({ data: { data: [] } }),
        ]);
      })
      .then(([courseRes, enrollRes]) => {
        const c = courseRes.data?.data || courseRes.data;
        setCourse(c);
        const enrollList = enrollRes.data?.data || enrollRes.data?.enrollments || [];
        setEnrollments(Array.isArray(enrollList) ? enrollList : []);
      })
      .catch(() => toast.error('Failed to load course'))
      .finally(() => setLoading(false));
  }, [slug, courseId]);

  const isEnrolled = enrollments.some(
    (e) => (e.courseId || e.course?.id || e.course?._id || e.course) === courseId
  );

  const enrollment = enrollments.find(
    (e) => (e.courseId || e.course?.id || e.course?._id || e.course) === courseId
  );

  const progress = enrollment?.progress ?? 0;

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/c/${slug}/courses/${courseId}`);
      return;
    }
    setEnrolling(true);
    try {
      await lmsApi.enroll(companyId, courseId);
      toast.success('Successfully enrolled!');
      const enrollRes = await lmsApi.getMyEnrollments(companyId).catch(() => ({ data: { data: [] } }));
      const enrollList = enrollRes.data?.data || enrollRes.data?.enrollments || [];
      setEnrollments(Array.isArray(enrollList) ? enrollList : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const toggleModule = (idx) =>
    setExpandedModules((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const primaryColor = company?.primaryColor || '#1a3c6e';

  const levelColor = (lv) => {
    if (!lv) return 'bg-gray-100 text-gray-600';
    const l = lv.toLowerCase();
    if (l === 'beginner') return 'bg-green-100 text-green-700';
    if (l === 'intermediate') return 'bg-yellow-100 text-yellow-700';
    if (l === 'advanced') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  const getInitials = (name = '') =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const learnPoints = course?.description
    ? course.description
        .split(/\.\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10)
        .slice(0, 6)
    : [];

  const modules = course?.modules || course?.curriculum || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${primaryColor} ${primaryColor} ${primaryColor} transparent` }}
          />
          <p className="text-navy font-body text-lg font-semibold">Loading course…</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="font-serif text-2xl text-navy mb-2">Course not found</h2>
          <Link to={`/c/${slug}/courses`} className="text-gold font-body font-semibold hover:underline">
            ← Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Breadcrumb header */}
      <div
        className="py-10 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #800020 100%)` }}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,#fff,transparent)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-white/60 font-body text-sm mb-4">
            <Link to={`/c/${slug}`} className="hover:text-white transition-colors">
              {company?.name || 'Home'}
            </Link>
            <span>/</span>
            <Link to={`/c/${slug}/courses`} className="hover:text-white transition-colors">
              Courses
            </Link>
            <span>/</span>
            <span className="text-white truncate max-w-xs">{course.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* ── Left column (2/3) ── */}
          <div className="flex-1 min-w-0">
            {/* Title & meta */}
            <div className="bg-white rounded-2xl shadow-premium border border-border p-8 mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {course.level && (
                  <span className={`text-xs font-body font-semibold px-3 py-1 rounded-full ${levelColor(course.level)}`}>
                    {course.level}
                  </span>
                )}
                {course.category && (
                  <span className="text-xs font-body font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                    {course.category}
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy leading-tight">
                {course.title}
              </h1>

              {course.instructor && (
                <p className="text-muted font-body mt-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                  Instructor: <span className="font-semibold text-navy">{course.instructor}</span>
                </p>
              )}

              {course.description && (
                <p className="text-muted font-body mt-4 leading-relaxed">{course.description}</p>
              )}
            </div>

            {/* What you'll learn */}
            {learnPoints.length > 0 && (
              <div className="bg-white rounded-2xl shadow-premium border border-border p-8 mb-6">
                <h2 className="font-serif text-xl font-bold text-navy mb-5">What You'll Learn</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {learnPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 font-body text-sm text-navy">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{point.endsWith('.') ? point : `${point}.`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Course curriculum / modules */}
            <div className="bg-white rounded-2xl shadow-premium border border-border p-8">
              <h2 className="font-serif text-xl font-bold text-navy mb-5">Course Curriculum</h2>

              {modules.length === 0 ? (
                <div className="text-center py-10 text-muted font-body">
                  <div className="text-4xl mb-3">📖</div>
                  <p>Curriculum details coming soon.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((mod, idx) => {
                    const lessons = mod.lessons || mod.items || [];
                    const isOpen = expandedModules[idx];
                    return (
                      <div key={mod.id || mod._id || idx} className="border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleModule(idx)}
                          className="w-full flex items-center justify-between px-5 py-4 bg-cream hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: primaryColor }}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-body font-semibold text-navy">{mod.title || `Module ${idx + 1}`}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {lessons.length > 0 && (
                              <span className="text-xs text-muted font-body">{lessons.length} lessons</span>
                            )}
                            <svg
                              className={`w-4 h-4 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {isOpen && lessons.length > 0 && (
                          <ul className="divide-y divide-border">
                            {lessons.map((lesson, lIdx) => (
                              <li
                                key={lesson.id || lesson._id || lIdx}
                                className="flex items-center gap-3 px-5 py-3 bg-white"
                              >
                                {isEnrolled ? (
                                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                )}
                                <span className={`font-body text-sm ${isEnrolled ? 'text-navy' : 'text-muted'}`}>
                                  {lesson.title || `Lesson ${lIdx + 1}`}
                                </span>
                                {lesson.duration && (
                                  <span className="ml-auto text-xs text-muted font-body shrink-0">
                                    {lesson.duration}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right sidebar (1/3) ── */}
          <div className="lg:w-80 xl:w-96 shrink-0">
            <div className="sticky top-6">
              <div className="bg-white rounded-2xl shadow-premium border border-border overflow-hidden">
                {/* Thumbnail */}
                <div
                  className="h-48 flex items-center justify-center text-white text-5xl font-serif font-bold"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, #800020)` }}
                >
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(course.title || 'C')
                  )}
                </div>

                <div className="p-6">
                  {/* Price */}
                  <div className="mb-5">
                    {course.price ? (
                      <span className="font-serif text-3xl font-bold text-navy">₹{course.price}</span>
                    ) : (
                      <span className="inline-block bg-green-100 text-green-700 font-body font-bold text-xl px-4 py-1 rounded-full">
                        FREE
                      </span>
                    )}
                  </div>

                  {/* Enroll / Continue button */}
                  {isEnrolled ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-body text-muted mb-1">
                          <span>Your Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, background: primaryColor }}
                          />
                        </div>
                      </div>
                      <Link
                        to={`/c/${slug}/courses/${courseId}/learn`}
                        className="block w-full text-center py-3 rounded-xl font-body font-bold text-white transition-all duration-200 hover:opacity-90 shadow-premium"
                        style={{ background: primaryColor }}
                      >
                        Continue Learning
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full py-3 rounded-xl font-body font-bold text-white transition-all duration-200 hover:opacity-90 shadow-premium disabled:opacity-60"
                      style={{ background: primaryColor }}
                    >
                      {enrolling ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Enrolling…
                        </span>
                      ) : (
                        'Enroll Now'
                      )}
                    </button>
                  )}

                  {/* Stats */}
                  <div className="mt-6 space-y-3 border-t border-border pt-5">
                    {[
                      {
                        icon: (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        ),
                        label: 'Lessons',
                        value: course.lessonsCount ?? (modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || '—'),
                      },
                      {
                        icon: (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ),
                        label: 'Duration',
                        value: course.duration || '—',
                      },
                      {
                        icon: (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        ),
                        label: 'Level',
                        value: course.level || 'All Levels',
                      },
                      {
                        icon: (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        ),
                        label: 'Students',
                        value: course.studentsCount != null ? course.studentsCount.toLocaleString() : '—',
                      },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {icon}
                        </svg>
                        <span className="text-muted font-body text-sm">{label}</span>
                        <span className="ml-auto font-body font-semibold text-navy text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
