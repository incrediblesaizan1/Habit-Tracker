import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-emerald-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 text-center z-10">
        <div className="mb-8 inline-block">
          <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-800/50 text-slate-300 text-xs font-semibold tracking-wider uppercase">
            v1.0 Now Live
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-linear-to-r from-emerald-400 via-blue-500 to-purple-600">
          Master Your Daily <br /> Consistency
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          The habit tracker that doesn't just track—it visualizes your journey.
          Build streaks, analyze data, and transform your routine with ease.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard"
            className="px-8 py-4 rounded-full bg-linear-to-r from-emerald-500 to-teal-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:-translate-y-1"
          >
            Start Tracking Free
          </Link>
          <a
            href="#features"
            className="px-8 py-4 rounded-full border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 transition-all"
          >
            Learn More
          </a>
        </div>

        {/* Feature Grid Preview */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm hover:border-emerald-500/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Visual Streaks
            </h3>
            <p className="text-slate-400 text-sm">
              See your progress at a glance with our intuitive monthly calendar
              view.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm hover:border-blue-500/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Data Insights</h3>
            <p className="text-slate-400 text-sm">
              Analyze your consistency with detailed charts and completion
              metrics.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm hover:border-purple-500/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Secure & Private
            </h3>
            <p className="text-slate-400 text-sm">
              Your data is encrypted and secure. You own your habits.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
