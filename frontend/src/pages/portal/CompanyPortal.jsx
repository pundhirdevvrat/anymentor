import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lmsApi, shopApi, companyApi } from '../../services/api';
import useCompanyStore from '../../store/companyStore';
import toast from 'react-hot-toast';

export default function CompanyPortal() {
  const { slug } = useParams();
  const { company, setCompany } = useCompanyStore();
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    companyApi.getBySlug(slug)
      .then((res) => {
        const data = res.data?.data || res.data;
        setCompany(data);
        const companyId = data.id || data._id;
        return Promise.all([
          lmsApi.getCourses(companyId, { limit: 3, published: true }).catch(() => ({ data: { data: [] } })),
          shopApi.getProducts(companyId, { limit: 4 }).catch(() => ({ data: { data: [] } })),
        ]).then(([coursesRes, productsRes]) => {
          const courses = coursesRes.data?.data || coursesRes.data?.courses || [];
          const products = productsRes.data?.data || productsRes.data?.products || [];
          setFeaturedCourses(Array.isArray(courses) ? courses.slice(0, 3) : []);
          setFeaturedProducts(Array.isArray(products) ? products.slice(0, 4) : []);
        });
      })
      .catch(() => toast.error('Failed to load company'))
      .finally(() => setLoading(false));
  }, [slug]);

  const primaryColor = company?.primaryColor || '#1a3c6e';
  const goldColor = company?.secondaryColor || '#d4a017';

  const getInitials = (name = '') =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const levelColor = (level) => {
    if (!level) return 'bg-gray-100 text-gray-600';
    const l = level.toLowerCase();
    if (l === 'beginner') return 'bg-green-100 text-green-700';
    if (l === 'intermediate') return 'bg-yellow-100 text-yellow-700';
    if (l === 'advanced') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-navy border-t-gold animate-spin" />
          <p className="text-navy font-body text-lg font-semibold">Loading portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #800020 100%)` }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10 bg-gold" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-10 bg-cream" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center text-center gap-8">
          {/* Logo */}
          <div className="w-24 h-24 rounded-2xl shadow-premium-lg overflow-hidden flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-serif text-3xl font-bold">
                {getInitials(company?.name || 'AM')}
              </span>
            )}
          </div>

          <div>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white drop-shadow-lg">
              {company?.name || 'Welcome'}
            </h1>
            {company?.tagline && (
              <p className="mt-4 text-cream-light text-xl sm:text-2xl font-body max-w-2xl">
                {company.tagline}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to={`/c/${slug}/courses`}
              className="px-8 py-3.5 rounded-xl font-body font-semibold text-lg transition-all duration-200 shadow-gold animate-pulse-gold"
              style={{ background: goldColor, color: primaryColor }}
            >
              Explore Courses
            </Link>
            <Link
              to={`/c/${slug}/shop`}
              className="px-8 py-3.5 rounded-xl font-body font-semibold text-lg border-2 border-white/50 text-white hover:bg-white/10 transition-all duration-200"
            >
              Visit Shop
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Courses ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-serif text-3xl font-bold text-navy">Featured Courses</h2>
            <p className="text-muted font-body mt-1">Expand your knowledge with expert-led programs</p>
          </div>
          <Link
            to={`/c/${slug}/courses`}
            className="text-sm font-body font-semibold text-gold hover:text-gold-dark transition-colors"
          >
            View all →
          </Link>
        </div>

        {featuredCourses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-premium border border-border">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-muted font-body">No courses published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses.map((course) => {
              const id = course.id || course._id;
              const initials = getInitials(course.title || 'C');
              return (
                <Link
                  key={id}
                  to={`/c/${slug}/courses/${id}`}
                  className="group bg-white rounded-2xl shadow-premium hover:shadow-premium-lg transition-all duration-300 overflow-hidden border border-border hover:-translate-y-1"
                >
                  {/* Thumbnail */}
                  <div
                    className="h-44 flex items-center justify-center text-white text-4xl font-serif font-bold"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, #800020)` }}
                  >
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-body font-semibold px-2 py-0.5 rounded-full ${levelColor(course.level)}`}>
                        {course.level || 'All Levels'}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-navy group-hover:text-gold transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    {course.instructor && (
                      <p className="text-muted text-sm font-body mt-1">{course.instructor}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-body font-bold text-navy text-lg">
                        {course.price ? `₹${course.price}` : (
                          <span className="text-green-600">FREE</span>
                        )}
                      </span>
                      {course.duration && (
                        <span className="text-xs text-muted font-body">{course.duration}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Featured Products ── */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="font-serif text-3xl font-bold text-navy">Featured Products</h2>
              <p className="text-muted font-body mt-1">Curated resources to support your journey</p>
            </div>
            <Link
              to={`/c/${slug}/shop`}
              className="text-sm font-body font-semibold text-gold hover:text-gold-dark transition-colors"
            >
              View all →
            </Link>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="text-center py-16 bg-cream rounded-2xl border border-border">
              <div className="text-5xl mb-4">🛍️</div>
              <p className="text-muted font-body">No products listed yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => {
                const id = product.id || product._id;
                return (
                  <div
                    key={id}
                    className="bg-cream rounded-2xl border border-border overflow-hidden hover:shadow-premium transition-all duration-300 hover:-translate-y-1"
                  >
                    <div
                      className="h-36 flex items-center justify-center text-white text-3xl font-serif font-bold"
                      style={{ background: `linear-gradient(135deg, ${goldColor}, #b8891a)` }}
                    >
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(product.name || 'P')
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-body font-semibold text-navy line-clamp-1">{product.name}</h3>
                      <p className="font-body font-bold text-navy mt-2">₹{product.price}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: primaryColor }} className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="text-white font-serif font-bold">{getInitials(company?.name || 'AM')}</span>
            )}
          </div>
          <h3 className="font-serif text-xl font-bold text-white">{company?.name}</h3>
          {company?.description && (
            <p className="text-cream/70 font-body mt-3 max-w-xl mx-auto text-sm">{company.description}</p>
          )}
          <p className="text-cream/40 font-body text-xs mt-8">
            Powered by AnyMentor · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
