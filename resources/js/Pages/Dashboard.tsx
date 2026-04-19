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
    MapPin,
    RefreshCw,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';

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
    };
}

export default function Dashboard({ gpsData, activeDevices, stats }: DashboardProps) {
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
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total GPS Points</CardTitle>
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(stats.total_gps_points)}</div>
                                <p className="text-xs text-muted-foreground">
                                    All time data points
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Passengers Today</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(stats.total_passengers_today)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Total passengers counted today
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(stats.active_devices_today)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Devices active today
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Last Update</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold">
                                    {stats.latest_gps_time ? 
                                        new Date(stats.latest_gps_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                        : 'Never'
                                    }
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Most recent GPS data
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Map Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                        height="500px" 
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

                        {/* Active Devices */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Activity className="mr-2 h-5 w-5" />
                                        Active Devices
                                    </CardTitle>
                                    <CardDescription>
                                        Devices uploading datasets (latest first)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {activeDevices && activeDevices.length > 0 ? (
                                        <div className="space-y-3">
                                            {activeDevices.map((device) => (
                                                <div 
                                                    key={device.device_id} 
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                                        selectedDeviceId === device.device_id 
                                                            ? 'border-blue-500 bg-blue-50' 
                                                            : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                    onClick={() => setSelectedDeviceId(
                                                        selectedDeviceId === device.device_id ? null : device.device_id
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
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
                                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                                <div>
                                                                    <span className="text-gray-500">Datasets:</span>
                                                                    <span className="ml-1 font-semibold text-gray-900">{device.dataset_count}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500">Passengers:</span>
                                                                    <span className="ml-1 font-semibold text-gray-900">{device.total_passengers}</span>
                                                                </div>
                                                            </div>
                                                            <div className="mt-1 text-xs text-gray-400">
                                                                Last active: {formatDate(device.latest_timestamp)}
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0">
                                                            <div className="text-xs text-gray-400">
                                                                ID: {device.device_id}
                                                            </div>
                                                        </div>
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
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
