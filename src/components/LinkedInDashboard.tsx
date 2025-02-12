import React from 'react';
import { BarChart, Calendar, Share2 } from 'lucide-react';

export function LinkedInDashboard({ stats, posts, onShare, onSchedule }) {
  return (
    <div className="space-y-6">
      {/* Estatísticas do LinkedIn */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Seguidores</h3>
          <p className="text-2xl font-bold">{stats.followers}</p>
        </div>
        {/* ... outras estatísticas ... */}
      </div>

      {/* Posts Recentes */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Posts Recentes</h3>
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="border-b pb-4">
              <p className="text-gray-600">{post.content}</p>
              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <span>👍 {post.likes}</span>
                <span>💬 {post.comments}</span>
                <span>🔄 {post.shares}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agendador de Posts */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Agendar Post</h3>
        {/* ... formulário de agendamento ... */}
      </div>
    </div>
  );
} 