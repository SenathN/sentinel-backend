import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
    ArrowLeft, 
    Monitor, 
    FileText, 
    Calendar, 
    HardDrive, 
    Activity,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Database,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ShowDevice({ device, stats }) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [countdown, setCountdown] = useState(30);
    const [currentPage, setCurrentPage] = useState(device.observer_data_requests?.current_page || 1);
    const [perPage, setPerPage] = useState(device.observer_data_requests?.per_page || 25);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    };

    const formatLastRefresh = (date) => {
        return date.toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(',', '');
    };

    const refreshData = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['device', 'stats'],
            onSuccess: () => {
                setLastRefresh(new Date());
                setIsRefreshing(false);
            },
            onError: () => {
                setIsRefreshing(false);
            }
        });
    };

    const goToPage = (page) => {
        setCurrentPage(page);
        router.get(route('devices.show', device.id), {
            page: page,
            per_page: perPage
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const changePerPage = (newPerPage) => {
        setPerPage(newPerPage);
        setCurrentPage(1);
        router.get(route('devices.show', device.id), {
            page: 1,
            per_page: newPerPage
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            refreshData();
        }, 30000); // Refresh every 30 seconds

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
                    return 30; // Reset to 30 when refresh happens
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(countdownInterval);
    }, []);

    useEffect(() => {
        // Reset countdown when refresh happens
        if (!isRefreshing) {
            setCountdown(30);
        }
    }, [isRefreshing]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Device Details - {device.name}
                    </h2>
                    <div className="flex items-center space-x-3">
                        <Link href={route('devices.index')}>
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Devices
                            </Button>
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title={`Device - ${device.name}`} />

            <div className="py-12">
                <div className={`mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6 transition-opacity duration-300 ${isRefreshing ? 'opacity-60' : ''}`}>
                    {/* Device Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Monitor className="mr-2 h-5 w-5" />
                                        Device Information
                                    </CardTitle>
                                    <CardDescription>
                                        Basic information about this observer device
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Device ID</label>
                                            <p className="text-sm font-mono bg-gray-100 p-2 rounded">{device.device_id}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Name</label>
                                            <p className="text-sm font-medium">{device.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Status</label>
                                            <div className="mt-1">
                                                <Badge variant={device.is_active ? "default" : "secondary"}>
                                                    {device.is_active ? (
                                                        <span className="flex items-center">
                                                            <CheckCircle className="mr-1 h-3 w-3" />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center">
                                                            <XCircle className="mr-1 h-3 w-3" />
                                                            Inactive
                                                        </span>
                                                    )}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Created</label>
                                            <p className="text-sm">{formatDate(device.created_at)}</p>
                                        </div>
                                    </div>
                                    {device.description && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Description</label>
                                            <p className="text-sm mt-1">{device.description}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Quick Stats */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center">
                                        <Activity className="mr-2 h-5 w-5" />
                                        Quick Stats
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Total Files</span>
                                        <span className="font-semibold">{stats.total_files.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Total Size</span>
                                        <span className="font-semibold">{formatFileSize(stats.total_size)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Last Activity</span>
                                        <span className="font-semibold text-sm">{formatDate(stats.last_activity)}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center">
                                        <TrendingUp className="mr-2 h-5 w-5" />
                                        Activity Trends
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Today</span>
                                        <span className="font-semibold">{stats.files_today}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">This Week</span>
                                        <span className="font-semibold">{stats.files_this_week}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">This Month</span>
                                        <span className="font-semibold">{stats.files_this_month}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Last Hour</span>
                                        <span className="font-semibold">{stats.files_last_hour}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Recent Datasets */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Database className="mr-2 h-5 w-5" />
                                <div className='w-full flex justify-between items-center'>
                                    <span>
                                        Recent Datasets
                                    </span>
                                    <div className='flex'>
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
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
                            </CardTitle>
                            <CardDescription>
                                Observer data requests from this device with pagination controls
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {device.observer_data_requests && device.observer_data_requests.data && device.observer_data_requests.data.length > 0 ? (
                                <>
                                    {/* Pagination Controls */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm text-gray-600">
                                                Showing {((device.observer_data_requests.current_page - 1) * device.observer_data_requests.per_page) + 1} to {Math.min(device.observer_data_requests.current_page * device.observer_data_requests.per_page, device.observer_data_requests.total)} of {device.observer_data_requests.total} entries
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {/* Per Page Selector */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        {perPage} entries
                                                        <ChevronLeft className="ml-2 h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => changePerPage(10)}>
                                                        10 entries
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => changePerPage(25)}>
                                                        25 entries
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => changePerPage(50)}>
                                                        50 entries
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => changePerPage(100)}>
                                                        100 entries
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            {/* Pagination Buttons */}
                                            <div className="flex items-center space-x-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => goToPage(device.observer_data_requests.current_page - 1)}
                                                    disabled={device.observer_data_requests.current_page <= 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                
                                                <span className="px-3 py-1 text-sm border rounded">
                                                    Page {device.observer_data_requests.current_page} of {device.observer_data_requests.last_page}
                                                </span>
                                                
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => goToPage(device.observer_data_requests.current_page + 1)}
                                                    disabled={device.observer_data_requests.current_page >= device.observer_data_requests.last_page}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {device.observer_data_requests.data.map((request) => (
                                        <Card key={request.id} className="overflow-hidden">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex items-center text-sm">
                                                            <Clock className="mr-1 h-3 w-3" />
                                                            {formatDate(request.created_at)}
                                                        </div>
                                                        <div className="text-sm">
                                                            <span className="font-medium">Passenger Avg:</span> {request.observer_files.length>0 ? (request.observer_files.map(i=>i?.passenger_count || 0).reduce((a,c) => a+c, 0) / request.observer_files.length).toFixed(1) : '0'}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            <span className="font-medium">IP:</span> {request.ip_address}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {request.observer_files && request.observer_files.length > 0 ? (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                        {request.observer_files.map((file) => (
                                                            <div key={file.id} className="group cursor-pointer">
                                                                <div className="relative overflow-hidden rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                                                                    <a 
                                                                        href={`/storage/${file.file_path}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="block"
                                                                    >
                                                                        {file.file_path && (file.file_path.toLowerCase().endsWith('.jpg') || file.file_path.toLowerCase().endsWith('.jpeg') || file.file_path.toLowerCase().endsWith('.png') || file.file_path.toLowerCase().endsWith('.gif')) ? (
                                                                            <img 
                                                                                src={`/storage/${file.file_path}`}
                                                                                alt={file.original_name}
                                                                                className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200"
                                                                                onError={(e) => {
                                                                                    e.target.style.display = 'none';
                                                                                    e.target.nextElementSibling.style.display = 'flex';
                                                                                }}
                                                                            />
                                                                        ) : null}
                                                                        <div className="w-full h-24 bg-gray-100 flex items-center justify-center" style={{display: file.file_path && (file.file_path.toLowerCase().endsWith('.jpg') || file.file_path.toLowerCase().endsWith('.jpeg') || file.file_path.toLowerCase().endsWith('.png') || file.file_path.toLowerCase().endsWith('.gif')) ? 'none' : 'flex'}}>
                                                                            <FileText className="h-8 w-8 text-gray-400" />
                                                                        </div>
                                                                    </a>
                                                                </div>
                                                                <div className="mt-1 space-y-1">
                                                                    <div className="text-xs text-gray-500 space-y-0.5">
                                                                        <div className='flex justify-between'>
                                                                            {file.gps_data && file.gps_data.gps_timestamp && (
                                                                                <div className="flex items-center">
                                                                                    <Clock className="mr-1 h-3 w-3" />
                                                                                    {new Date(file.gps_data.gps_timestamp).toLocaleTimeString('en-US', { 
                                                                                        hour: '2-digit', 
                                                                                        minute: '2-digit',
                                                                                        second: '2-digit',
                                                                                        hour12: false 
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                            <div className="flex items-center">
                                                                                {/* <span className="mr-1">Count:</span> */}
                                                                                <Users className="mr-1 h-3 w-3"/>
                                                                                <span className="font-medium">{file.passenger_count || 0}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className='flex justify-between'>
                                                                            {file.gps_data && file.gps_data.gps_timestamp && (
                                                                                <div className="flex items-center justify-between w-full">
                                                                                    <div>{file.gps_data.latitude}</div>
                                                                                    <div>{file.gps_data.longitude} </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex overflow-hidden">

                                                                            <div className="text-xs text-gray-600 flex items-center justify-between opacity-50">
                                                                                <span className="truncate max-w-full" title={file.original_name}>
                                                                                    {/* {file.original_name.length > 15 ? file.original_name.substring(0, 12) + '...' : file.original_name} */}
                                                                                    {file?.original_name || '-' }
                                                                                </span>
                                                                            </div>

                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 text-gray-400 text-sm">
                                                        No files in this dataset
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Database className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                    <p>No data requests found for this device.</p>
                                    <p className="text-sm">Data requests will appear here once the device starts synchronizing.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
