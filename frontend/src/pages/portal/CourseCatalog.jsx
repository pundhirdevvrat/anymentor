import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lmsApi, companyApi } from '../../services/api';
import useCompanyStore from '../../store/companyStore';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const LIMIT = 12;

export default function CourseCatalog() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { company, setCompany } = useCompanyStore();
  const { isAuthenticated, user } = useAuthStore();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [enrolling, setEnrolling] = useState(null);
  const [companyId, setCompanyId] = useState(null);

  // Load company on mount
  useEffect(() => {
    if (!slug) return;
    if (company?.slug === slug) {
      setCompanyId(company.id || company._id);
      return;
    }
    companyApi.getBySlug(slug)
      .then((res) => {
        const data = res.data?.data || res.data;
        setCompany(data);
        setCompanyId(data.id || data._id);
      })
      .catch(() => toast.error('Failed to load company'));
  }, [slug]);

  const fetchCourses = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    const params = { page, limit: LIMIT, published: true };
    if (search) params.search = search;
    if (level !== 'All') params.level = level.toUpperCase();

    lmsApi.getCourses(companyId, params)
      .then((res) => {
        const raw = res.data?.data || res.data;
        const list = Array.isArray(raw) ? raw : raw?.courses || raw?.items || [];
        const total = res.data?.total || res.data?.totalPages || Math.ceil((res.data?.count || list.length) / LIMIT) || 1;
        setCourses(list);
        setTotalPages(typeof total === 'number' && total > 0 ? total : 1);
      })
      .catch(() => {
        setCourses([]);
        toast.error('Failed to load courses');
      })
      .finally(() => setLoading(false));
  }, [companyId, page, level]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // Debounced search
  useEffect(() => {
    if (!companyId) return;
    const t = setTimeout(() => { setPage(1); fetchCourses(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleEnroll = async (course) => {
    const courseId = course.id || course._id;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/c/${slug}/courses`);
      return;
    }
    setEnrolling(courseId);
    try {
      await lmsApi.enroll(companyId, courseId);
      toast.success(`Enrolled in "${course.title}"!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Enrollment failed';
      toast.error(msg);
    } finally {
      setEnrolling(null);
    }
  };

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

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div
        className="py-14 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #800020 100%)` }}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,#fff,transparent)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-cream/60 font-body text-sm mb-4">
            <Link to={`/c/${slug}`} className="hover:text-cream transition-colors">{company?.name || 'Home'}</Link>
            <span>/</span>
            <span className="text-cream">Courses</span>
          </nav>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white">All Courses</h1>
          <p className="text-cream/70 font-body mt-2 text-lg">
            {company?.name ? `Expert-crafted programs from ${company.name}` : 'Browse and enroll in courses'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search courses…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white text-navy font-body focus:outline-none focus:ring-2 focus:ring-navy/30 shadow-sm"
            />
          </div>

          {/* Level filter */}
          <div className="flex gap-2 flex-wrap">
            {LEVELS.map((lv) => (
              <button
                key={lv}
                onClick={() => { setLevel(lv); setPage(1); }}
                className={`px-4 py-2.5 rounded-xl font-body font-semibold text-sm transition-all duration-200 ${
                  level === lv
                    ? 'bg-navy text-white shadow-premium'
                    : 'bg-white text-navy border border-border hover:border-navy/40'
                }`}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-border animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-border shadow-premium">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="font-serif text-2xl text-navy mb-2">No courses found</h3>
            <p className="text-muted font-body">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => {
              const id = course.id || course._id;
              const isEnrolling = enrolling === id;
              return (
                <div
                  key={id}
                  className="group bg-white rounded-2xl shadow-premium hover:shadow-premium-lg border border-border overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col"
                >
                  {/* Thumbnail */}
                  <Link to={`/c/${slug}/courses/${id}`} className="block">
                    <div
                      className="h-44 flex items-center justify-center text-white text-4xl font-serif font-bold overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, #800020)` }}
                    >
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(course.title || 'C')
                      )}
                    </div>
                  </Link>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {course.level && (
                        <span className={`text-xs font-body font-semibold px-2 py-0.5 rounded-full ${levelColor(course.level)}`}>
                          {course.level}
                        </span>
                      )}
                    </div>

                    <Link to={`/c/${slug}/courses/${id}`}>
                      <h3 className="font-serif text-base font-bold text-navy group-hover:text-gold transition-colors line-clamp-2 leading-snug">
                        {course.title}
                      </h3>
                    </Link>

                    {course.instructor && (
                      <p className="text-muted text-xs font-body mt-1 truncate">{course.instructor}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted font-body">
                      {course.duration && <span>⏱ {course.duration}</span>}
                      {course.lessonsCount != null && <span>📖 {course.lessonsCount} lessons</span>}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                      <span className="font-body font-bold text-navy text-base">
                        {course.price ? `₹${course.price}` : (
                          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">FREE</span>
                        )}
                      </span>
                      <button
                        onClick={() => handleEnroll(course)}
                        disabled={isEnrolling}
                        className="px-4 py-1.5 rounded-lg text-sm font-body font-semibold text-white transition-all duration-200 disabled:opacity-60"
                        style={{ background: primaryColor }}
                      >
                        {isEnrolling ? 'Enrolling…' : 'Enroll'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-border bg-white text-navy font-body font-semibold disabled:opacity-40 hover:bg-cream transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === '…' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted font-body">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`w-10 h-10 rounded-xl font-body font-semibold text-sm transition-all duration-200 ${
                      page === item
                        ? 'bg-navy text-white shadow-premium'
                        : 'bg-white text-navy border border-border hover:bg-cream'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-border bg-white text-navy font-body font-semibold disabled:opacity-40 hover:bg-cream transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
