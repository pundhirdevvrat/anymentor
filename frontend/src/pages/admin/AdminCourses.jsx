import { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { lmsApi } from '../../services/api';
import toast from 'react-hot-toast';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

const levelColors = {
  BEGINNER: 'bg-green-100 text-green-800',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
  ADVANCED: 'bg-red-100 text-red-800',
};

const emptyForm = {
  title: '',
  description: '',
  level: 'BEGINNER',
  price: '',
  isFree: false,
  isPublished: false,
};

export default function AdminCourses() {
  const { user } = useAuthStore();
  const companyId = user?.companyId;

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, [companyId]);

  const fetchCourses = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await lmsApi.getCourses(companyId);
      setCourses(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingCourse(null);
    setForm(emptyForm);
    setPanelOpen(true);
  };

  const openEdit = (course) => {
    setEditingCourse(course);
    setForm({
      title: course.title || '',
      description: course.description || '',
      level: course.level || 'BEGINNER',
      price: course.price ?? '',
      isFree: course.isFree || false,
      isPublished: course.isPublished || false,
    });
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingCourse(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, price: form.isFree ? 0 : parseFloat(form.price) || 0 };
      if (editingCourse) {
        await lmsApi.updateCourse(companyId, editingCourse._id || editingCourse.id, payload);
        toast.success('Course updated');
      } else {
        await lmsApi.createCourse(companyId, payload);
        toast.success('Course created');
      }
      closePanel();
      fetchCourses();
    } catch {
      toast.error('Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course) => {
    try {
      await lmsApi.deleteCourse(companyId, course._id || course.id);
      toast.success('Course deleted');
      setDeleteConfirm(null);
      fetchCourses();
    } catch {
      toast.error('Failed to delete course');
    }
  };

  const filtered = courses.filter((c) => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase());
    const matchLevel = !levelFilter || c.level === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3c6e] font-serif">Courses</h1>
          <p className="text-sm text-gray-500 mt-1">{courses.length} total courses</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-[#1a3c6e] text-white px-4 py-2 rounded-lg hover:bg-[#15325c] transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Course
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]"
        />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] bg-white"
        >
          <option value="">All Levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="font-medium">No courses found</p>
          <p className="text-sm mt-1">Create your first course to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => (
            <div key={course._id || course.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Thumbnail */}
              <div className="h-40 bg-gradient-to-br from-[#1a3c6e] to-[#2a5298] flex items-center justify-center relative">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-white opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.isPublished ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                    {course.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-[#1a3c6e] text-sm line-clamp-2 leading-snug">{course.title}</h3>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[course.level] || 'bg-gray-100 text-gray-600'}`}>
                    {course.level}
                  </span>
                </div>
                {course.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-semibold text-[#d4a017] text-sm">
                      {course.isFree ? 'FREE' : `₹${course.price || 0}`}
                    </span>
                    <span>{course.enrollmentCount || 0} enrolled</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(course)}
                      className="p-1.5 text-gray-400 hover:text-[#1a3c6e] hover:bg-blue-50 rounded transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(course)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-in Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closePanel} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#f5f0e8]">
              <h2 className="text-lg font-bold text-[#1a3c6e]">{editingCourse ? 'Edit Course' : 'New Course'}</h2>
              <button onClick={closePanel} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]"
                  placeholder="Course title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] resize-none"
                  placeholder="Course description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] bg-white"
                >
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setForm({ ...form, isFree: !form.isFree })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.isFree ? 'bg-[#d4a017]' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isFree ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-gray-700">Free Course</span>
                </label>
              </div>
              {!form.isFree && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]"
                    placeholder="0"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.isPublished ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublished ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-gray-700">Published</span>
                </label>
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#1a3c6e] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#15325c] disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                </button>
                <button type="button" onClick={closePanel} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 shadow-2xl w-80">
            <h3 className="font-bold text-[#1a3c6e] text-lg mb-2">Delete Course</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete <strong>{deleteConfirm.title}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
