import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import RouteMap from '@/components/RouteMap';
import { 
    Map, 
    Users, 
    Activity, 
    Clock,
    TrendingUp,
    TrendingDown,
    MapPin,
    RefreshCw,
    X,
    BarChart3,
    Upload,
    Wifi,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    PieChart,
    Pie,
} from 'recharts';

interface DashboardProps {
    gpsData: Array<{
        id: number;
        latitude: number;
        longitude: number;
        gps_timestamp: string;
        passenger_count: number;
        device_id: string;
        device_name: string;
    }>;
    activeDevices: Array<{
        device_id: string;
        device_name: string;
        latest_timestamp: string;
        dataset_count: number;
        total_passengers: number;
        latest_latitude: number;
        latest_longitude: number;
    }>;
    stats: {
        total_gps_points: number;
        total_passengers_today: number;
        active_devices_today: number;
        latest_gps_time: string | null;
        total_passengers_week: number;
        avg_passengers_per_hour: number;
        total_files_uploaded: number;
        data_coverage_percent: number;
    };
    hourlyFlow: Array<{
        hour: string;
        passengers: number;
        gps_points: number;
    }>;
    deviceContribution: Array<{
        device_id: string;
        device_name: string;
        total_passengers: number;
        total_points: number;
    }>;
    uploadTrend: Array<{
        date: string;
        day: string;
        points: number;
        passengers: number;
    }>;
    peakHours: Array<{
        hour: string;
        avg_passengers: number;
        total_passengers: number;
        frequency: number;
    }>;
    weeklyComparison: Array<{
        day: string;
        date: string;
        this_week_passengers: number;
        last_week_passengers: number;
        this_week_points: number;
        last_week_points: number;
    }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200 text-sm">
                <p className="font-semibold text-gray-800 mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color }}>
                        {entry.name}: {new Intl.NumberFormat().format(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Dashboard({ gpsData, activeDevices, stats, hourlyFlow, deviceContribution, uploadTrend, peakHours, weeklyComparison }: DashboardProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [countdown, setCountdown] = useState(5);
    const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
    const [selectedTime, setSelectedTime] = useState<number>(100); // Default to current time
    const [isReset, setIsReset] = useState<boolean>(true);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    };

    const formatLastRefresh = (date: Date) => {
        return date.toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(',', '');
    };

    // Get min and max timestamps from GPS data
    const getTimeRange = () => {
        if (!gpsData || gpsData.length === 0) return { min: 0, max: 100 };
        
        const timestamps = gpsData.map(d => new Date(d.gps_timestamp).getTime());
        const min = Math.min(...timestamps);
        const max = Math.max(...timestamps);
        return { min, max };
    };

    // Find visible points based on selected time
    const getVisiblePoints = (sliderValue: number) => {
        if (!gpsData || gpsData.length === 0) {
            return { visiblePoints: [], timeWindow: 0 };
        }

        const { min, max } = getTimeRange();
        const selectedTimestamp = min + (sliderValue / 100) * (max - min);
        
        // Sort GPS data by timestamp
        const sortedData = [...gpsData].sort((a, b) => 
            new Date(a.gps_timestamp).getTime() - new Date(b.gps_timestamp).getTime()
        );
        
        // Calculate time window (5% of total time range)
        const timeWindow = (max - min) * 0.05; // 5% window
        
        // Find points within the time window
        const visiblePoints = sortedData.filter(point => {
            const pointTime = new Date(point.gps_timestamp).getTime();
            return Math.abs(pointTime - selectedTimestamp) <= timeWindow;
        });
        
        return { visiblePoints, timeWindow };
    };

    // Handle slider change
    const handleTimeChange = (value: number[]) => {
        const newTime = value[0];
        setSelectedTime(newTime);
        setIsReset(false);
    };

    // Reset to defaults (current time)
    const resetTimeSlider = () => {
        setSelectedTime(100);
        setIsReset(true);
    };

    // Get current time position (100% = latest)
    const getCurrentTimePosition = () => {
        const { min, max } = getTimeRange();
        const now = new Date().getTime();
        const latest = Math.min(now, max); // Don't go beyond latest data
        return ((latest - min) / (max - min)) * 100;
    };

    // Format timestamp for display
    const formatSliderTime = (value: number) => {
        const { min, max } = getTimeRange();
        const timestamp = min + (value / 100) * (max - min);
        return new Date(timestamp).toLocaleString();
    };

    // Initialize to current time when GPS data changes
    useEffect(() => {
        if (gpsData && gpsData.length > 0) {
            const currentPosition = getCurrentTimePosition();
            setSelectedTime(currentPosition);
        }
    }, [gpsData]);

    const refreshData = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['gpsData', 'stats'],
            onSuccess: () => {
                setLastRefresh(new Date());
                setIsRefreshing(false);
            },
            onError: () => {
                setIsRefreshing(false);
            }
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            refreshData();
        }, 20000); // Refresh every 20 seconds

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Initial timestamp
        setLastRefresh(new Date());
    }, []);

    useEffect(() => {
        const countdownInterval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    return 20; // Reset to 20 when refresh happens
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(countdownInterval);
    }, []);

    useEffect(() => {
        // Reset countdown when refresh happens
        if (!isRefreshing) {
            setCountdown(20);
        }
    }, [isRefreshing]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Dashboard
                    </h2>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Data as at: {formatLastRefresh(lastRefresh)}</span>
                        </div>
                        <button
                            onClick={refreshData}
                            disabled={isRefreshing}
                            className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors"
                            title="Refresh data"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="text-xs">
                                {isRefreshing ? 'Refreshing...' : `Next refresh in ${countdown}s`}
                            </span>
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    {/* Stats Cards */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-300 ${isRefreshing ? 'opacity-60' : ''}`}>
                        <Card className="border-l-4 border-l-blue-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total GPS Points</CardTitle>
                                <MapPin className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(stats.total_gps_points)}</div>
                                <p className="text-xs text-muted-foreground">
                                    All time data points collected
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-emerald-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Passengers Today</CardTitle>
                                <Users className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(stats.total_passengers_today)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Avg {formatNumber(Math.round(stats.avg_passengers_per_hour))}/hr today
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-amber-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Data Coverage</CardTitle>
                                <Wifi className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.data_coverage_percent}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {stats.active_devices_today} of {stats.active_devices_today + Math.max(0, Math.round(stats.active_devices_today / (stats.data_coverage_percent || 1) * 100) - stats.active_devices_today)} devices reporting
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-violet-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Weekly Passengers</CardTitle>
                                <TrendingUp className="h-4 w-4 text-violet-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(stats.total_passengers_week)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Last 7 days total
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Secondary Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-blue-700">Files Uploaded</p>
                                        <p className="text-3xl font-bold text-blue-900">{formatNumber(stats.total_files_uploaded)}</p>
                                    </div>
                                    <div className="p-3 bg-blue-200/50 rounded-full">
                                        <Upload className="h-6 w-6 text-blue-700" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-emerald-700">Active Devices</p>
                                        <p className="text-3xl font-bold text-emerald-900">{formatNumber(stats.active_devices_today)}</p>
                                    </div>
                                    <div className="p-3 bg-emerald-200/50 rounded-full">
                                        <Activity className="h-6 w-6 text-emerald-700" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-violet-700">Last Update</p>
                                        <p className="text-3xl font-bold text-violet-900">
                                            {stats.latest_gps_time ? 
                                                new Date(stats.latest_gps_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                                : 'Never'
                                            }
                                        </p>
                                    </div>
                                    <div className="p-3 bg-violet-200/50 rounded-full">
                                        <Clock className="h-6 w-6 text-violet-700" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row 1: Hourly Passenger Flow + Peak Hours Radar */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Hourly Passenger Flow - Area Chart */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                                    Today's Passenger Flow
                                </CardTitle>
                                <CardDescription>
                                    Hourly passenger count and GPS data points throughout the day
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={hourlyFlow} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="passengerGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis 
                                                dataKey="hour" 
                                                tick={{ fontSize: 11 }} 
                                                interval={2}
                                            />
                                            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Area 
                                                yAxisId="left"
                                                type="monotone" 
                                                dataKey="passengers" 
                                                stroke="#3b82f6" 
                                                fill="url(#passengerGradient)"
                                                strokeWidth={2}
                                                name="Passengers"
                                            />
                                            <Bar 
                                                yAxisId="right"
                                                dataKey="gps_points" 
                                                fill="#10b981" 
                                                opacity={0.6}
                                                radius={[2, 2, 0, 0]}
                                                name="GPS Points"
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Peak Hours Radar Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Zap className="mr-2 h-5 w-5 text-amber-500" />
                                    Peak Activity Hours
                                </CardTitle>
                                <CardDescription>
                                    Historical passenger distribution by hour
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={peakHours}>
                                            <PolarGrid stroke="#e5e7eb" />
                                            <PolarAngleAxis dataKey="hour" tick={{ fontSize: 10 }} />
                                            <PolarRadiusAxis tick={{ fontSize: 9 }} />
                                            <Radar 
                                                name="Avg Passengers" 
                                                dataKey="avg_passengers" 
                                                stroke="#f59e0b" 
                                                fill="#f59e0b" 
                                                fillOpacity={0.3}
                                                strokeWidth={2}
                                            />
                                            <Radar 
                                                name="Frequency" 
                                                dataKey="frequency" 
                                                stroke="#3b82f6" 
                                                fill="#3b82f6" 
                                                fillOpacity={0.15}
                                                strokeWidth={1.5}
                                            />
                                            <Legend />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row 2: 7-Day Trend + Weekly Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 7-Day Upload Trend */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Upload className="mr-2 h-5 w-5 text-emerald-500" />
                                    7-Day Upload Trend
                                </CardTitle>
                                <CardDescription>
                                    Daily GPS points uploaded and passengers counted
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={uploadTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="trendPassengers" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="trendPoints" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Area 
                                                type="monotone" 
                                                dataKey="passengers" 
                                                stroke="#8b5cf6" 
                                                fill="url(#trendPassengers)"
                                                strokeWidth={2}
                                                name="Passengers"
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="points" 
                                                stroke="#06b6d4" 
                                                fill="url(#trendPoints)"
                                                strokeWidth={2}
                                                name="GPS Points"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Week-over-Week Comparison */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <BarChart3 className="mr-2 h-5 w-5 text-violet-500" />
                                    Week-over-Week Comparison
                                </CardTitle>
                                <CardDescription>
                                    This week vs last week passenger counts
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weeklyComparison} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar 
                                                dataKey="last_week_passengers" 
                                                fill="#e5e7eb" 
                                                radius={[4, 4, 0, 0]}
                                                name="Last Week"
                                            />
                                            <Bar 
                                                dataKey="this_week_passengers" 
                                                fill="#8b5cf6" 
                                                radius={[4, 4, 0, 0]}
                                                name="This Week"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row 3: Device Contribution + Map + Active Devices */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Device Contribution - Horizontal Bar + Pie */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Users className="mr-2 h-5 w-5 text-pink-500" />
                                    Device Contribution
                                </CardTitle>
                                <CardDescription>
                                    Passenger share by device
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-52">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={deviceContribution}
                                                dataKey="total_passengers"
                                                nameKey="device_name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                innerRadius={40}
                                                paddingAngle={2}
                                                label={({ device_name, percent }) => 
                                                    `${device_name.substring(0, 8)} ${(percent * 100).toFixed(0)}%`
                                                }
                                                labelLine={{ stroke: '#9ca3af', strokeWidth: 0.5 }}
                                            >
                                                {deviceContribution.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-2 space-y-1">
                                    {deviceContribution.slice(0, 5).map((device, i) => (
                                        <div key={device.device_id} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center">
                                                <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[i] }}></div>
                                                <span className="text-gray-700 truncate max-w-[120px]">{device.device_name}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{formatNumber(device.total_passengers)}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Map Section */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Map className="mr-2 h-5 w-5" />
                                        Live GPS Tracking Map
                                    </CardTitle>
                                    <CardDescription>
                                        Real-time GPS locations and passenger counts from the last 24 hours
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <RouteMap 
                                        gpsData={gpsData} 
                                        height="400px" 
                                        selectedDeviceId={selectedDeviceId}
                                        selectedTime={selectedTime}
                                        isReset={isReset}
                                    />
                                    
                                    {/* Time Slider */}
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                                <Clock className="h-4 w-4 text-gray-600" />
                                                <span className="text-sm font-medium text-gray-700">Time Navigation</span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={resetTimeSlider}
                                                className="flex items-center space-x-1"
                                            >
                                                <X className="h-3 w-3" />
                                                <span>Reset</span>
                                            </Button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-xs text-gray-600">
                                                <span>{formatSliderTime(0)}</span>
                                                <span className={`font-medium ${isReset ? 'text-gray-500' : 'text-blue-600'}`}>
                                                    Selected: {formatSliderTime(selectedTime)}
                                                </span>
                                                <span>{formatSliderTime(100)}</span>
                                            </div>
                                            
                                            <Slider
                                                value={[selectedTime]}
                                                onValueChange={handleTimeChange}
                                                max={100}
                                                step={1}
                                                className={`w-full ${isReset ? 'opacity-60' : ''}`}
                                            />
                                            
                                            <div className="text-center text-xs text-gray-500">
                                                {isReset ? 'Showing current time (drag to explore timeline)' : 'Showing selected time window'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Map Legend */}
                                    <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                                            <span>0 Passengers</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                                            <span>1-5 Passengers</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-amber-500 rounded-full mr-2"></div>
                                            <span>6-15 Passengers</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                                            <span>15+ Passengers</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Active Devices - Full Width */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Activity className="mr-2 h-5 w-5" />
                                Active Devices
                            </CardTitle>
                            <CardDescription>
                                Devices uploading datasets (latest first) — click to filter on map
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {activeDevices && activeDevices.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeDevices.map((device) => (
                                        <div 
                                            key={device.device_id} 
                                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                                selectedDeviceId === device.device_id 
                                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' 
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                            onClick={() => setSelectedDeviceId(
                                                selectedDeviceId === device.device_id ? null : device.device_id
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`w-3 h-3 rounded-full ${
                                                        selectedDeviceId === device.device_id 
                                                            ? 'bg-blue-500' 
                                                            : 'bg-green-500'
                                                    }`}></div>
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {device.device_name}
                                                    </div>
                                                </div>
                                                <span className="text-xs text-gray-400">ID: {device.device_id}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-gray-50 rounded-md p-2 text-center">
                                                    <div className="text-lg font-bold text-blue-600">{device.dataset_count}</div>
                                                    <div className="text-xs text-gray-500">Datasets</div>
                                                </div>
                                                <div className="bg-gray-50 rounded-md p-2 text-center">
                                                    <div className="text-lg font-bold text-emerald-600">{device.total_passengers}</div>
                                                    <div className="text-xs text-gray-500">Passengers</div>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs text-gray-400">
                                                Last active: {formatDate(device.latest_timestamp)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Activity className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                    <p>No active devices</p>
                                    <p className="text-sm">Devices will appear here once they start uploading datasets.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
