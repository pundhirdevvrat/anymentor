import { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { supportApi } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_TABS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITY_COLORS = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-gray-100 text-gray-600',
};
const STATUS_COLORS = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  WAITING: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

export default function AdminSupport() {
  const { user } = useAuthStore();
  const companyId = user?.companyId;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ subject: '', priority: 'MEDIUM', message: '' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = activeTab !== 'ALL' ? { status: activeTab } : {};
      const res = await supportApi.getTickets(companyId, params);
      setTickets(res.data?.data || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (companyId) load(); }, [companyId, activeTab]);

  const openDetail = async (ticket) => {
    setSelected(ticket);
    setLoadingDetail(true);
    try {
      const res = await supportApi.getTicket(companyId, ticket.id);
      setDetail(res.data?.data);
    } catch {
      setDetail(ticket);
    } finally {
      setLoadingDetail(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await supportApi.addMessage(companyId, selected.id, { message: reply });
      setReply('');
      toast.success('Reply sent');
      const res = await supportApi.getTicket(companyId, selected.id);
      setDetail(res.data?.data);
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (ticketId, status) => {
    try {
      await supportApi.updateTicket(companyId, ticketId, { status });
      toast.success('Status updated');
      load();
      if (detail?.id === ticketId) setDetail(prev => ({ ...prev, status }));
    } catch {
      toast.error('Update failed');
    }
  };

  const createTicket = async () => {
    if (!newForm.subject.trim() || !newForm.message.trim()) return toast.error('Subject and message required');
    setCreating(true);
    try {
      await supportApi.createTicket(companyId, newForm);
      toast.success('Ticket created');
      setShowNew(false);
      setNewForm({ subject: '', priority: 'MEDIUM', message: '' });
      load();
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy-800">Support Tickets</h1>
          <p className="text-gray-500 mt-1">Manage customer support requests</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-navy-700 transition">
          + New Ticket
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${activeTab === tab ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">🎫</p>
            <p>No tickets in this category.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-navy-800 text-left">
              <tr>
                {['Subject', 'Priority', 'Status', 'Submitter', 'Created', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-cream-50/50 cursor-pointer" onClick={() => openDetail(ticket)}>
                  <td className="px-4 py-3 font-medium text-navy-800 max-w-xs truncate">{ticket.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[ticket.priority] || 'bg-gray-100 text-gray-600'}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] || 'bg-gray-100'}`}>
                      {ticket.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ticket.user?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {ticket.status !== 'RESOLVED' && (
                      <button onClick={() => updateStatus(ticket.id, 'RESOLVED')} className="text-xs text-green-600 hover:underline">
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl mb-8">
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-serif font-bold text-navy-800 text-lg">{selected.subject}</h2>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[selected.priority]}`}>{selected.priority}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status]}`}>{selected.status?.replace('_', ' ')}</span>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setDetail(null); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Messages */}
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {loadingDetail ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : (detail?.messages || []).length === 0 ? (
                <p className="text-gray-400 text-sm text-center">No messages yet.</p>
              ) : (
                (detail?.messages || []).map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(msg.user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${msg.userId === user?.id ? 'bg-navy-800 text-white' : 'bg-cream-50 text-gray-700'}`}>
                      <p>{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.userId === user?.id ? 'text-navy-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Type your reply…"
                rows={2}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
              <button onClick={sendReply} disabled={sending || !reply.trim()} className="bg-navy-800 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-navy-700 transition self-end">
                {sending ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-navy-800 text-lg">New Ticket</h3>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <input
              value={newForm.subject}
              onChange={e => setNewForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Subject"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
            <select
              value={newForm.priority}
              onChange={e => setNewForm(p => ({ ...p, priority: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
            >
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p}>{p}</option>)}
            </select>
            <textarea
              value={newForm.message}
              onChange={e => setNewForm(p => ({ ...p, message: e.target.value }))}
              placeholder="Describe the issue…"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2 border border-gray-300 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={createTicket} disabled={creating} className="flex-1 py-2 bg-navy-800 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
                {creating ? 'Creating…' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
