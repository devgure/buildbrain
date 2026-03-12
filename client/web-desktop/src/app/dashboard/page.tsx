'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { formatCurrency, formatDate } from '@/lib/utils';

type Project = {
  id: string;
  title: string;
  budget: number;
  spent: number;
  status: string;
  startDate: string;
  endDate: string;
  milestones: Milestone[];
  bids: any[];
};

type Milestone = {
  id: string;
  title: string;
  amount: number;
  status: string;
  dueDate: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await axios.get('/api/v1/projects', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        setProjects(response.data.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load projects');
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => router.push('/projects/new')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          + New Project
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Budget</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(totalBudget)}
          </div>
          <div className="mt-2 text-xs text-gray-500">Across {projects.length} projects</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Spent</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</div>
          <div className="mt-2 text-xs text-gray-500">
            {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% of budget
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Active Projects</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{activeProjects}</div>
          <div className="mt-2 text-xs text-gray-500">
            {projects.length - activeProjects} completed or on hold
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(project.startDate).toLocaleDateString()} -{' '}
                    {new Date(project.endDate).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    project.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {project.status}
                </span>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Budget</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(project.spent)} / {formatCurrency(project.budget)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${(project.spent / project.budget) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2 mb-4">
                <h4 className="text-xs font-semibold text-gray-600 uppercase">
                  Milestones ({project.milestones.length})
                </h4>
                {project.milestones.slice(0, 2).map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{milestone.title}</span>
                    <span
                      className={`text-xs font-medium ${
                        milestone.status === 'COMPLETED'
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {milestone.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action */}
              <button
                onClick={() => router.push(`/projects/${project.id}`)}
                className="mt-4 block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 rounded-lg text-sm font-medium transition"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
