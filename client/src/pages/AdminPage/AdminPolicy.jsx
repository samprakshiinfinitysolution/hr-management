import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import toast, { Toaster } from 'react-hot-toast';
import { BookText, Plus, Edit, Trash2, Save, X, ShieldCheck } from 'lucide-react';
import DOMPurify from 'dompurify';

export default function AdminPolicy() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState({ _id: null, title: '', content: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null);

  const isMainAdmin = localStorage.getItem("isMainAdmin") === "true";

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/policies');
      setPolicies(data);
    } catch (err) {
      toast.error("Failed to fetch policies.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (policy = null) => {
    if (policy) {
      setIsEditing(true);
      setCurrentPolicy({ _id: policy._id, title: policy.title, content: policy.content });
    } else {
      setIsEditing(false);
      setCurrentPolicy({ _id: null, title: '', content: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPolicy({ _id: null, title: '', content: '' });
  };

  const handleSavePolicy = async () => {
    if (!currentPolicy.title || !currentPolicy.content) {
      toast.error("Title and content are required.");
      return;
    }

    const promise = isEditing
      ? API.put(`/policies/${currentPolicy._id}`, { title: currentPolicy.title, content: currentPolicy.content })
      : API.post('/policies', { title: currentPolicy.title, content: currentPolicy.content });

    toast.promise(promise, {
      loading: 'Saving policy...',
      success: () => {
        fetchPolicies();
        handleCloseModal();
        return `Policy ${isEditing ? 'updated' : 'created'} successfully!`;
      },
      error: `Failed to ${isEditing ? 'update' : 'create'} policy.`,
    });
  };

  const handleDeletePolicy = async () => {
    if (!policyToDelete) return;

    toast.promise(API.delete(`/policies/${policyToDelete._id}`), {
      loading: 'Deleting policy...',
      success: () => {
        setPolicyToDelete(null);
        fetchPolicies();
        return 'Policy deleted successfully!';
      },
      error: 'Failed to delete policy.',
    });
  };

  const createMarkup = (htmlContent) => {
    return { __html: DOMPurify.sanitize(htmlContent) };
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toaster />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookText size={28} /> Company Policies
        </h1>
        {isMainAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={18} /> Add New Policy
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading policies...</p>
      ) : (
        <div className="space-y-4">
          {policies.length > 0 ? policies.map(policy => (
            <div key={policy._id} className="border rounded-lg shadow-sm">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">{policy.title}</h2>
                {isMainAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenModal(policy)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit size={18} /></button>
                    <button onClick={() => setPolicyToDelete(policy)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>
              <div className="p-4 prose max-w-none" dangerouslySetInnerHTML={createMarkup(policy.content)} />
            </div>
          )) : (
            <p className="text-center text-gray-500 py-8">No policies found. {isMainAdmin && "Click 'Add New Policy' to get started."}</p>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{isEditing ? 'Edit Policy' : 'Add New Policy'}</h2>
              <button onClick={handleCloseModal}><X /></button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Policy Title"
                value={currentPolicy.title}
                onChange={(e) => setCurrentPolicy({ ...currentPolicy, title: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <textarea
                placeholder="Policy Content (HTML is supported)"
                value={currentPolicy.content}
                onChange={(e) => setCurrentPolicy({ ...currentPolicy, content: e.target.value })}
                className="w-full p-2 border rounded"
                rows={10}
              />
              <p className="text-xs text-gray-500">You can use HTML tags like &lt;b&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;p&gt; for formatting.</p>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg">Cancel</button>
              <button onClick={handleSavePolicy} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><Save size={16} /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {policyToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Confirm Deletion</h2>
              <button onClick={() => setPolicyToDelete(null)}><X /></button>
            </div>
            <p>Are you sure you want to delete the policy titled "<strong>{policyToDelete.title}</strong>"? This action cannot be undone.</p>
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setPolicyToDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg">Cancel</button>
              <button onClick={handleDeletePolicy} className="px-4 py-2 bg-red-600 text-white rounded-lg">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {!isMainAdmin && (
         <div className="mt-8 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-lg">
            <h4 className="font-bold flex items-center gap-2"><ShieldCheck size={16}/> Admin View</h4>
            <p className="text-sm">You are viewing policies. Only the main administrator can add, edit, or delete policies.</p>
          </div>
      )}
    </div>
  );
}