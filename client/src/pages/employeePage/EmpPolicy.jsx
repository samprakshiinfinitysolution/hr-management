import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import toast, { Toaster } from 'react-hot-toast';
import { BookText } from 'lucide-react';
import DOMPurify from 'dompurify';

export default function EmpPolicy() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/policies');
      setPolicies(data);
    } catch (err) {
      toast.error("Failed to fetch company policies.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createMarkup = (htmlContent) => {
    return { __html: DOMPurify.sanitize(htmlContent) };
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toaster />
      <h1 className="text-3xl font-bold flex items-center gap-3 mb-6">
        <BookText size={28} /> Company Policies
      </h1>

      {loading ? (
        <p className="text-center py-8">Loading policies...</p>
      ) : (
        <div className="space-y-4">
          {policies.length > 0 ? policies.map(policy => (
            <div key={policy._id} className="border dark:border-gray-700 rounded-lg shadow-sm">
              <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-xl font-semibold">{policy.title}</h2>
              </div>
              <div className="p-4 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={createMarkup(policy.content)} />
            </div>
          )) : (
            <p className="text-center text-gray-500 py-8">No company policies have been published yet.</p>
          )}
        </div>
      )}
    </div>
  );
}