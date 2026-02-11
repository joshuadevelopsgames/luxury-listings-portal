/**
 * Shown on Friday when the SMM has clients with zero posts logged this week.
 * Prompts them to log posts (link to My Clients).
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';

export default function PostLogReminderBanner({ clientNames, onDismiss }) {
  const navigate = useNavigate();
  if (!clientNames?.length) return null;

  const text =
    clientNames.length === 1
      ? `Weekly post target not met for ${clientNames[0]}. Log your posts to stay on track.`
      : `Weekly post target not met for ${clientNames.length} client(s). Log your posts to stay on track.`;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Log your posts</p>
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">{text}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate('/my-clients')}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
        >
          Go to My Clients
          <ArrowRight className="h-4 w-4" />
        </button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-amber-700 dark:text-amber-400 hover:underline text-sm"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
