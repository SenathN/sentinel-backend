import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { BarChart3, Map, Users, TrendingUp, Shield, Activity } from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';

interface WelcomeProps {
    auth: {
        user?: {
            name?: string;
            email?: string;
        };
    };
}

export default function Welcome({ auth }: WelcomeProps) {
    return (
        <>
            <Head title="Sentinel - Data Visualized" />
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
                <div className="relative min-h-screen flex flex-col">
                    {/* Header */}
                    <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="flex h-16 justify-between items-center">
                                <div className="flex items-center">
                                    <Link href="/" className="flex items-center space-x-3">
                                        <img src="/logo.png" alt="Sentinel Logo" className="h-10 w-auto" />
                                    </Link>
                                </div>
                                <nav className="flex items-center space-x-4">
                                    {auth.user ? (
                                        <Link
                                            href={route('dashboard')}
                                            className="px-4 py-2 text-sm font-medium text-white hover:text-blue-300 transition-colors"
                                        >
                                            Dashboard
                                        </Link>
                                    ) : (
                                        <>
                                            <Link
                                                href={route('login')}
                                                className="px-4 py-2 text-sm font-medium text-white hover:text-blue-300 transition-colors"
                                            >
                                                Log in
                                            </Link>
                                            <Link
                                                href={route('register')}
                                                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                            >
                                                Register
                                            </Link>
                                        </>
                                    )}
                                </nav>
                            </div>
                        </div>
                    </header>

                    {/* Hero Section */}
                    <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
                        <div className="max-w-5xl mx-auto text-center">

                            <h1 className="text-5xl md:text-7xl font-bold text-white mb-1">
                                Sentinel Analytics
                            </h1>
                            <hr className='my-5' />
                            
                            <h3 className="text-2xl md:text-4xl font-bold text-white mb-6">
                                Data <span className="text-blue-400">Visualized</span>
                            </h3>

                            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
                                Monitor GPS tracking, passenger data, and device activity with powerful real-time analytics and visualizations.
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                {auth.user ? (
                                    <Link href={route('dashboard')}>
                                        <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                                            Go to Dashboard
                                        </Button>
                                    </Link>
                                ) : (
                                    <>
                                        <Link href={route('register')}>
                                            <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                                                Get Started
                                            </Button>
                                        </Link>
                                        <Link href={route('login')}>
                                            <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-slate-900 hover:bg-white/10">
                                                Sign In
                                            </Button>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </main>

                    {/* Features Grid */}
                    <div className="px-4 sm:px-6 lg:px-8 py-20">
                        <div className="max-w-7xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                                        <Map className="h-6 w-6 text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Live GPS Tracking</h3>
                                    <p className="text-gray-400 text-sm">Real-time location monitoring with passenger count visualization.</p>
                                </div>

                                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                    <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                                        <BarChart3 className="h-6 w-6 text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Advanced Analytics</h3>
                                    <p className="text-gray-400 text-sm">Heatmaps, passenger flow analysis, and trend visualizations.</p>
                                </div>

                                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                    <div className="w-12 h-12 bg-violet-500/20 rounded-lg flex items-center justify-center mb-4">
                                        <Users className="h-6 w-6 text-violet-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Device Management</h3>
                                    <p className="text-gray-400 text-sm">Monitor device activity, data uploads, and coverage metrics.</p>
                                </div>

                                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                    <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
                                        <Activity className="h-6 w-6 text-amber-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Real-time Updates</h3>
                                    <p className="text-gray-400 text-sm">Automatic data refresh with live status indicators.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="border-t border-white/10 py-8">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <p className="text-center text-gray-500 text-sm">
                                Sentinel — Data Visualized {new Date().getFullYear()}
                            </p>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
