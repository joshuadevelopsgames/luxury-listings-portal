import React from 'react';
import { BookOpen, FileText, Video, ExternalLink, Clock, Star } from 'lucide-react';

/**
 * V3 Resources - Static content tutorials and documents
 */
const V3Resources = () => {
  const tutorials = [
    { id: 1, title: 'Getting Started with the Portal', description: 'Learn the basics of navigating the Luxury Listings Portal', type: 'video', duration: '5 min', category: 'Basics', starred: true },
    { id: 2, title: 'Creating Effective Social Media Content', description: 'Best practices for luxury real estate social media', type: 'article', duration: '10 min', category: 'Content', starred: false },
    { id: 3, title: 'Managing Client Packages', description: 'How to track and manage client deliverables', type: 'video', duration: '8 min', category: 'Clients', starred: true },
    { id: 4, title: 'Analytics Deep Dive', description: 'Understanding your content performance metrics', type: 'article', duration: '15 min', category: 'Analytics', starred: false },
    { id: 5, title: 'Content Calendar Mastery', description: 'Planning and scheduling content effectively', type: 'video', duration: '12 min', category: 'Planning', starred: false },
    { id: 6, title: 'Client Communication Best Practices', description: 'How to maintain great client relationships', type: 'article', duration: '8 min', category: 'Clients', starred: false },
  ];

  const documents = [
    { id: 1, title: 'Brand Guidelines', description: 'Official Luxury Listings brand standards', type: 'pdf', size: '2.4 MB' },
    { id: 2, title: 'Social Media Templates', description: 'Canva templates for common post types', type: 'link', size: 'External' },
    { id: 3, title: 'Client Onboarding Checklist', description: 'Step-by-step new client setup guide', type: 'pdf', size: '156 KB' },
    { id: 4, title: 'Content Calendar Template', description: 'Monthly planning spreadsheet', type: 'xlsx', size: '45 KB' },
  ];

  const categoryColors = {
    'Basics': 'from-[#0071e3] to-[#5856d6]',
    'Content': 'from-[#af52de] to-[#ff2d55]',
    'Clients': 'from-[#34c759] to-[#30d158]',
    'Analytics': 'from-[#ff9500] to-[#ff3b30]',
    'Planning': 'from-[#5856d6] to-[#0071e3]',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Resources</h1>
        <p className="text-[17px] text-[#86868b]">Tutorials, guides, and helpful documents.</p>
      </div>

      {/* Tutorials Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white">Tutorials</h2>
          <button className="text-[13px] text-[#0071e3] font-medium hover:underline">View All</button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tutorials.map((tutorial) => (
            <div
              key={tutorial.id}
              className="p-5 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${categoryColors[tutorial.category]} flex items-center justify-center shadow-lg`}>
                  {tutorial.type === 'video' ? (
                    <Video className="w-5 h-5 text-white" strokeWidth={1.5} />
                  ) : (
                    <FileText className="w-5 h-5 text-white" strokeWidth={1.5} />
                  )}
                </div>
                {tutorial.starred && (
                  <Star className="w-5 h-5 text-[#ff9500] fill-current" strokeWidth={1.5} />
                )}
              </div>
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white mb-1 group-hover:text-[#0071e3] transition-colors">
                {tutorial.title}
              </h3>
              <p className="text-[13px] text-[#86868b] mb-3 line-clamp-2">{tutorial.description}</p>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold text-white bg-gradient-to-r ${categoryColors[tutorial.category]}`}>
                  {tutorial.category}
                </span>
                <span className="flex items-center gap-1 text-[12px] text-[#86868b]">
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {tutorial.duration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documents Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white">Documents & Templates</h2>
        </div>
        <div className="rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#86868b]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white group-hover:text-[#0071e3] transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-[13px] text-[#86868b]">{doc.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#86868b] uppercase">{doc.type}</span>
                  <span className="text-[12px] text-[#86868b]">{doc.size}</span>
                  <ExternalLink className="w-4 h-4 text-[#86868b] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h3 className="text-[17px] font-semibold mb-1">Need Help?</h3>
            <p className="text-[15px] text-white/80 mb-4">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <button className="h-9 px-4 rounded-lg bg-white text-[#0071e3] text-[13px] font-medium hover:bg-white/90 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3Resources;
