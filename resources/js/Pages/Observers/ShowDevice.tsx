import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
    Database
} from 'lucide-react';

export default function ShowDevice({ device, stats }) {
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

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Device Details - {device.name}
                    </h2>
                    <Link href={route('devices.index')}>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Devices
                        </Button>
                    </Link>
                </div>
            }
        >
            <Head title={`Device - ${device.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
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
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Recent Datasets */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Database className="mr-2 h-5 w-5" />
                                Recent Datasets
                            </CardTitle>
                            <CardDescription>
                                Latest 10 observer data requests from this device
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {device.observer_data_requests && device.observer_data_requests.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Timestamp</TableHead>
                                                <TableHead>Passenger Count</TableHead>
                                                <TableHead>IP Address</TableHead>
                                                <TableHead>User Agent</TableHead>
                                                <TableHead>Files</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {device.observer_data_requests.map((request) => (
                                                <TableRow key={request.id}>
                                                    <TableCell>
                                                        <div className="flex items-center text-sm">
                                                            <Clock className="mr-1 h-3 w-3" />
                                                            {formatDate(request.created_at)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{request.passenger_count || 0}</TableCell>
                                                    <TableCell className="font-mono text-xs">{request.ip_address}</TableCell>
                                                    <TableCell className="text-xs max-w-xs truncate">
                                                        {request.user_agent}
                                                    </TableCell>
                                                    <TableCell>
                                                        {request.observer_files && request.observer_files.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {request.observer_files.map((file) => (
                                                                    <div key={file.id} className="border-l-2 border-blue-300 pl-3 py-1">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <a 
                                                                                href={`/storage/${file.file_path}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-blue-600 hover:text-blue-800 underline flex items-center text-sm font-medium"
                                                                            >
                                                                                <FileText className="mr-1 h-3 w-3" />
                                                                                <span className="truncate max-w-xs">{file.original_name}</span>
                                                                            </a>
                                                                            <span className="text-xs text-gray-500">Passengers: {file.passenger_count || 0}</span>
                                                                        </div>
                                                                        {file.gps_data && (
                                                                            <div className="text-xs text-gray-600 space-y-1">
                                                                                <div className="flex items-center">
                                                                                    <span className="font-medium">GPS:</span>
                                                                                    <span className="ml-2 font-mono">
                                                                                        {file.gps_data.latitude?.toFixed(6)}, {file.gps_data.longitude?.toFixed(6)}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex items-center">
                                                                                    <span className="font-medium">Time:</span>
                                                                                    <span className="ml-2">
                                                                                        {file.gps_data.gps_timestamp ? new Date(file.gps_data.gps_timestamp).toLocaleString() : 'N/A'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">No files</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
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
