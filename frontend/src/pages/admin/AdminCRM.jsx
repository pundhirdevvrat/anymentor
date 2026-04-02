import { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { crmApi, userApi } from '../../services/api';
import toast from 'react-hot-toast';

const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];
const KANBAN_COLS = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON/LOST'];

const stageColors = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-purple-100 text-purple-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

const sourceColors = {
  WEBSITE: 'bg-blue-50 text-blue-600',
  REFERRAL: 'bg-green-50 text-green-600',
  SOCIAL: 'bg-pink-50 text-pink-600',
  EMAIL: 'bg-orange-50 text-orange-600',
  OTHER: 'bg-gray-100 text-gray-600',
};

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  source: 'WEBSITE',
  assignedTo: '',
};

export default function AdminCRM() {
  const { user } = useAuthStore();
  const companyId = user?.companyId;

  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadDetail, setLeadDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activityText, setActivityText] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    fetchLeads();
    fetchUsers();
  }, [companyId]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await crmApi.getLeads(companyId);
      setLeads(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await userApi.getAll({ companyId });
      setUsers(res.data?.data || res.data || []);
    } catch {}
  };

  const openDetail = async (lead) => {
    setSelectedLead(lead);
    setDetailLoading(true);
    setLeadDetail(null);
    try {
      const res = await crmApi.getLead(companyId, lead._id || lead.id);
      setLeadDetail(res.data?.data || res.data);
    } catch {
      toast.error('Failed to load lead details');
    } finally {
      setDetailLoading(false);
    }
  };

  const openNew = () => {
    setEditingLead(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingLead(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editingLead) {
        await crmApi.updateLead(companyId, editingLead._id || editingLead.id, form);
        toast.success('Lead updated');
      } else {
        await crmApi.createLead(companyId, form);
        toast.success('Lead created');
      }
      closeModal();
      fetchLeads();
    } catch {
      toast.error('Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (lead, newStatus) => {
    try {
      await crmApi.updateLead(companyId, lead._id || lead.id, { status: newStatus });
      toast.success('Stage updated');
      fetchLeads();
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleAddActivity = async () => {
    if (!activityText.trim()) return;
    setAddingActivity(true);
    try {
      await crmApi.addActivity(companyId, selectedLead._id || selectedLead.id, {
        type: 'NOTE',
        description: activityText,
      });
      toast.success('Activity added');
      setActivityText('');
      openDetail(selectedLead);
    } catch {
      toast.error('Failed to add activity');
    } finally {
      setAddingActivity(false);
    }
  };

  const getColLeads = (col) => {
    if (col === 'WON/LOST') return leads.filter((l) => l.status === 'WON' || l.status === 'LOST');
    return leads.filter((l) => l.status === col);
  };

  const colStyle = {
    NEW: 'border-blue-200 bg-blue-50/40',
    CONTACTED: 'border-yellow-200 bg-yellow-50/40',
    QUALIFIED: 'border-purple-200 bg-purple-50/40',
    'WON/LOST': 'border-green-200 bg-green-50/40',
  };

  const colHeaderStyle = {
    NEW: 'text-blue-700 bg-blue-100',
    CONTACTED: 'text-yellow-700 bg-yellow-100',
    QUALIFIED: 'text-purple-700 bg-purple-100',
    'WON/LOST': 'text-green-700 bg-green-100',
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3c6e] font-serif">CRM Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">{leads.length} total leads</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-[#1a3c6e] text-white px-4 py-2 rounded-lg hover:bg-[#15325c] transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Lead
        </button>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {KANBAN_COLS.map((col) => (
            <div key={col} className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded-lg mb-3" />
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl mb-2" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLS.map((col) => {
            const colLeads = getColLeads(col);
            return (
              <div key={col} className={`rounded-xl border ${colStyle[col]} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${colHeaderStyle[col]}`}>
                    {col}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">{colLeads.length}</span>
                </div>
                <div className="space-y-2 min-h-[120px]">
                  {colLeads.map((lead) => (
                    <div
                      key={lead._id || lead.id}
                      onClick={() => openDetail(lead)}
                      className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="font-semibold text-[#1a3c6e] text-sm leading-tight">{lead.name}</p>
                        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${sourceColors[lead.source] || sourceColors.OTHER}`}>
                          {lead.source || 'N/A'}
                        </span>
                      </div>
                      {lead.email && <p className="text-xs text-gray-500 truncate">{lead.email}</p>}
                      {lead.assignedUser && (
                        <p className="text-xs text-gray-400 mt-1">
                          Assigned: {lead.assignedUser?.name || lead.assignedUser}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                        <span className="text-xs text-gray-400">{formatDate(lead.createdAt)}</span>
                        <select
                          value={lead.status}
                          onChange={(e) => { e.stopPropagation(); handleStageChange(lead, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none"
                        >
                          {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-gray-300">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Lead Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#f5f0e8] rounded-t-xl">
              <h2 className="text-lg font-bold text-[#1a3c6e]">{editingLead ? 'Edit Lead' : 'Add Lead'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]" placeholder="Lead name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]" placeholder="+91 00000 00000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] bg-white">
                  {['WEBSITE', 'REFERRAL', 'SOCIAL', 'EMAIL', 'OTHER'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] bg-white">
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u._id || u.id} value={u._id || u.id}>{u.name || u.email}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#1a3c6e] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#15325c] disabled:opacity-60 transition-colors">
                  {saving ? 'Saving...' : editingLead ? 'Update Lead' : 'Create Lead'}
                </button>
                <button type="button" onClick={closeModal}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setSelectedLead(null); setLeadDetail(null); }} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#f5f0e8]">
              <div>
                <h2 className="text-lg font-bold text-[#1a3c6e]">{selectedLead.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColors[selectedLead.status] || 'bg-gray-100 text-gray-600'}`}>
                  {selectedLead.status}
                </span>
              </div>
              <button onClick={() => { setSelectedLead(null); setLeadDetail(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 p-5">
              {/* Lead Info */}
              <div className="space-y-2 mb-5 text-sm">
                {selectedLead.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {selectedLead.email}
                  </div>
                )}
                {selectedLead.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {selectedLead.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Source: <span className={`text-xs px-2 py-0.5 rounded font-medium ${sourceColors[selectedLead.source] || sourceColors.OTHER}`}>{selectedLead.source || 'OTHER'}</span>
                </div>
              </div>

              {/* Change Stage */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Move Stage</label>
                <select
                  value={selectedLead.status}
                  onChange={(e) => { handleStageChange(selectedLead, e.target.value); setSelectedLead({ ...selectedLead, status: e.target.value }); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] bg-white"
                >
                  {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Activities Timeline */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#1a3c6e] mb-3">Activity Timeline</h3>
                {detailLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {((leadDetail || selectedLead).activities || []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No activities yet</p>
                    ) : (
                      ((leadDetail || selectedLead).activities || []).map((act, idx) => (
                        <div key={idx} className="flex gap-3 p-3 bg-[#f5f0e8] rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-[#d4a017] mt-1.5 shrink-0" />
                          <div>
                            <p className="text-sm text-gray-700">{act.description || act.note}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(act.createdAt)} · {act.type || 'NOTE'}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Add Activity */}
              <div>
                <h3 className="text-sm font-semibold text-[#1a3c6e] mb-2">Add Activity Note</h3>
                <textarea
                  value={activityText}
                  onChange={(e) => setActivityText(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] resize-none"
                  placeholder="Note or activity description..."
                />
                <button
                  onClick={handleAddActivity}
                  disabled={addingActivity || !activityText.trim()}
                  className="mt-2 w-full bg-[#d4a017] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#b8880f] disabled:opacity-60 transition-colors"
                >
                  {addingActivity ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
