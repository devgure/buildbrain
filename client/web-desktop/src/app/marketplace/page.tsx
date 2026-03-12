'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency, formatDate } from '@/lib/utils';

type Job = {
  id: string;
  title: string;
  category: string;
  hourlyRate?: number;
  totalBudget?: number;
  location: string;
  requiredSkills: string[];
  createdBy: {
    companyName: string;
    rating: number;
  };
  openPositions: number;
  relevanceScore?: number;
  hasApplied?: boolean;
};

export default function MarketplacePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    skills: [] as string[],
    category: '',
    minRate: 0,
    maxRate: 20000,
    location: '',
  });
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidProposal, setBidProposal] = useState('');

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  async function fetchJobs() {
    try {
      const params = new URLSearchParams();
      if (filters.skills.length > 0) params.append('skills', filters.skills.join(','));
      if (filters.category) params.append('category', filters.category);
      if (filters.minRate) params.append('minRate', filters.minRate.toString());
      if (filters.maxRate) params.append('maxRate', filters.maxRate.toString());
      if (filters.location) params.append('location', filters.location);

      const response = await axios.get(`/api/v1/marketplace/jobs/search?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      setJobs(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setLoading(false);
    }
  }

  async function submitBid() {
    if (!selectedJob || !bidAmount || !bidProposal) return;

    try {
      await axios.post(
        `/api/v1/marketplace/jobs/${selectedJob.id}/bids`,
        {
          amount: parseInt(bidAmount) * 100, // Convert to cents
          proposal: bidProposal,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        },
      );

      setBidModalOpen(false);
      setBidAmount('');
      setBidProposal('');
      setSelectedJob(null);
      fetchJobs();
    } catch (error) {
      console.error('Failed to submit bid:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Job Marketplace</h1>
        <div className="text-sm text-gray-600">
          {jobs.length} jobs available
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold">Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Location"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Categories</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="PLUMBING">Plumbing</option>
            <option value="HVAC">HVAC</option>
            <option value="FRAMING">Framing</option>
            <option value="PAINTING">Painting</option>
          </select>

          <input
            type="number"
            placeholder="Min Rate"
            value={filters.minRate}
            onChange={(e) => setFilters({ ...filters, minRate: parseInt(e.target.value) || 0 })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <input
            type="number"
            placeholder="Max Rate"
            value={filters.maxRate}
            onChange={(e) => setFilters({ ...filters, maxRate: parseInt(e.target.value) || 20000 })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{job.category}</p>
                </div>
                <div className="text-right">
                  {job.hourlyRate && (
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(job.hourlyRate)}/hr
                    </div>
                  )}
                  {job.totalBudget && (
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(job.totalBudget)}
                    </div>
                  )}
                  {job.relevanceScore && (
                    <div className="text-xs text-gray-600 mt-2">
                      Match: {Math.round(job.relevanceScore)}%
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-600">Location</span>
                  <p className="font-medium text-gray-900">{job.location}</p>
                </div>
                <div>
                  <span className="text-gray-600">Open Positions</span>
                  <p className="font-medium text-gray-900">{job.openPositions}</p>
                </div>
                <div>
                  <span className="text-gray-600">Contractor</span>
                  <p className="font-medium text-gray-900">{job.createdBy.companyName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Rating</span>
                  <p className="font-medium text-gray-900">★ {job.createdBy.rating.toFixed(1)}</p>
                </div>
              </div>

              {/* Skills */}
              <div className="mb-4">
                <span className="text-sm text-gray-600">Required Skills</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {job.hasApplied ? (
                  <button disabled className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-lg font-medium cursor-not-allowed">
                    ✓ Already Applied
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setBidModalOpen(true);
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition"
                  >
                    Apply Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bid Modal */}
      {bidModalOpen && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Submit Bid for {selectedJob.title}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Bid Amount (USD)
                </label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Proposal
                </label>
                <textarea
                  value={bidProposal}
                  onChange={(e) => setBidProposal(e.target.value)}
                  placeholder="Tell the contractor why you're a great fit"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setBidModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitBid}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium"
              >
                Submit Bid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
