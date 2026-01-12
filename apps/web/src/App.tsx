import { useState } from 'react';
import { Globe } from './components/Globe';
import { GlobeExplorer } from './components/GlobeExplorer';
import { QuestionCard } from './components/QuestionCard';
import { VoteButtons } from './components/VoteButtons';
import { StatsBar } from './components/StatsBar';
import { QuestionQueue } from './components/QuestionQueue';
import { QuestionHistory } from './components/QuestionHistory';
import { AchievementToast } from './components/AchievementToast';
import { useQuestion } from './hooks/useQuestion';
import { useVotes } from './hooks/useVotes';
import { useUserStats } from './contexts/UserStatsContext';
import type { GlobalVotes, QuestionOption } from '@world-pulse/shared';

type Tab = 'vote' | 'queue' | 'history';

export default function App() {
  const { question, loading: questionLoading } = useQuestion();
  const {
    votes, submitVote, userVote, loading: voteLoading, newAchievements, clearAchievements,
  } = useVotes(question?.id);
  const { refetch: refetchStats } = useUserStats();
  const [activeTab, setActiveTab] = useState<Tab>('vote');
  const [showGlobeExplorer, setShowGlobeExplorer] = useState(false);

  // Show results if user has already voted
  const showResults = !!userVote;

  const handleVote = async (optionId: string) => {
    await submitVote(optionId);
    // Refetch stats to update achievements count
    await refetchStats();
  };

  if (questionLoading || voteLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="animate-pulse text-2xl text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900">
      {/* Globe Explorer Modal */}
      {showGlobeExplorer && question && (
        <GlobeExplorer
          votes={votes}
          options={question.options}
          onClose={() => setShowGlobeExplorer(false)}
        />
      )}

      {/* Achievement Toast */}
      <AchievementToast
        achievements={newAchievements}
        onClose={clearAchievements}
      />

      {/* Globe Background - hidden on mobile for performance */}
      <div className="absolute inset-0 hidden sm:block">
        <Globe votes={votes} options={question?.options} />
      </div>

      {/* Mobile gradient background */}
      <div className="absolute inset-0 bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 sm:hidden" />

      {/* Content Overlay */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 sm:p-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            World<span className="text-blue-500">Pulse</span>
          </h1>
          <StatsBar />
        </header>

        {/* Tab Navigation */}
        <nav className="flex justify-center gap-2 px-4">
          <button
            onClick={() => setActiveTab('vote')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'vote'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Today's Question
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Tomorrow's Queue
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            History
          </button>
        </nav>

        {/* Main Content */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:py-8">
          {activeTab === 'vote' ? (
            question ? (
              <div className="w-full max-w-lg space-y-4 sm:space-y-6">
                <QuestionCard question={question} />

                {!showResults ? (
                  <VoteButtons options={question.options} onVote={handleVote} />
                ) : (
                  <ResultsDisplay
                    options={question.options}
                    votes={votes}
                    userVote={userVote}
                    questionId={question.id}
                    onExploreGlobe={() => setShowGlobeExplorer(true)}
                  />
                )}
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <p className="text-lg">No active question right now.</p>
                <p className="mt-2 text-sm">Check back soon!</p>
              </div>
            )
          ) : activeTab === 'queue' ? (
            <QuestionQueue />
          ) : (
            <QuestionHistory />
          )}
        </main>

        {/* Footer */}
        <footer className="p-4 text-center text-xs text-slate-500 sm:text-sm">
          One question. One day. One world.
        </footer>
      </div>
    </div>
  );
}

function ResultsDisplay({
  options,
  votes,
  userVote,
  questionId,
  onExploreGlobe,
}: {
  options: QuestionOption[];
  votes: GlobalVotes | null;
  userVote: string | null;
  questionId: string;
  onExploreGlobe: () => void;
}) {
  const total = votes?.totalVotes || 0;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/api/share/${questionId}/${userVote}/og`;
    const userOption = options.find((o) => o.id === userVote);
    const userPercentage = votes?.options.find((o) => o.optionId === userVote)?.count || 0;
    const pct = total > 0 ? Math.round((userPercentage / total) * 100) : 0;

    const shareText = `I voted "${userOption?.text}" (${pct}%) on WorldPulse! What do you think?`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WorldPulse',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed, copy to clipboard instead
        copyToClipboard(shareUrl, shareText);
      }
    } else {
      copyToClipboard(shareUrl, shareText);
    }
  };

  const copyToClipboard = (url: string, text: string) => {
    navigator.clipboard.writeText(`${text}\n${url}`);
    alert('Share link copied to clipboard!');
  };

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const count = votes?.options.find((o) => o.optionId === option.id)?.count || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const isUserVote = userVote === option.id;

        return (
          <div
            key={option.id}
            className={`relative overflow-hidden rounded-xl border-2 p-4 transition-all ${
              isUserVote ? 'border-white' : 'border-slate-700'
            }`}
          >
            {/* Progress bar background */}
            <div
              className="absolute inset-y-0 left-0 opacity-30 transition-all duration-700 ease-out"
              style={{
                backgroundColor: option.color,
                width: `${percentage}%`,
              }}
            />

            {/* Content */}
            <div className="relative flex items-center justify-between">
              <span className="font-medium">
                {option.text}
                {isUserVote && (
                  <span className="ml-2 text-xs text-slate-400 sm:text-sm">
                    (your vote)
                  </span>
                )}
              </span>
              <span className="text-lg font-bold sm:text-xl">{percentage}%</span>
            </div>
          </div>
        );
      })}

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={onExploreGlobe}
          className="flex items-center gap-2 text-blue-400 transition-colors hover:text-blue-300"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">
            {total.toLocaleString()} votes from {votes?.byCountry.filter((c) => c.countryCode !== 'XX' && c.countryCode !== 'T1' && c.total > 0).length || 0} countries
          </span>
          <span className="text-xs text-slate-500">- Explore Globe</span>
        </button>

        {userVote && (
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}/api/share/${questionId}/${userVote}/og`;
                const userOption = options.find((o) => o.id === userVote);
                const userPercentage = votes?.options.find((o) => o.optionId === userVote)?.count || 0;
                const pct = total > 0 ? Math.round((userPercentage / total) * 100) : 0;
                const text = `I voted "${userOption?.text}" (${pct}%) on WorldPulse! What do you think?`;
                const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
                window.open(twitterUrl, '_blank', 'width=550,height=420');
              }}
              className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-900"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X/Twitter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
