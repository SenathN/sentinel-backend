import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Smartphone, Tablet, Laptop, Monitor, Eye, Clock } from 'lucide-react';
import { useState } from 'react';

export default function Devices({ devices }) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const createForm = useForm({
        device_id: '',
        name: '',
        description: '',
        is_active: true,
    });

    const editForm = useForm({
        device_id: '',
        name: '',
        description: '',
        is_active: true,
    });

    const handleCreateDevice = (e) => {
        e.preventDefault();
        createForm.post(route('devices.store'), {
            onSuccess: () => {
                createForm.reset();
                setIsCreateDialogOpen(false);
            },
        });
    };

    const handleEditDevice = (device) => {
        setEditingDevice(device);
        editForm.setData({
            device_id: device.device_id,
            name: device.name,
            description: device.description || '',
            is_active: device.is_active,
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdateDevice = (e) => {
        e.preventDefault();
        editForm.patch(route('devices.update', editingDevice.id), {
            onSuccess: () => {
                editForm.reset();
                setEditingDevice(null);
                setIsEditDialogOpen(false);
            },
        });
    };

    const handleDeleteDevice = (device) => {
        if (confirm(`Are you sure you want to delete device "${device.name}"?`)) {
            useForm().delete(route('devices.destroy', device.id));
        }
    };

    
    const totalDevices = devices.length;
    const activeDevices = devices.filter(d => d.is_active).length;
    const inactiveDevices = totalDevices - activeDevices;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Observers - Devices
                </h2>
            }
        >
            <Head title="Devices" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Device Management</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Manage and monitor your observer devices
                                    </p>
                                </div>
                                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Device
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Add New Device</DialogTitle>
                                            <DialogDescription>
                                                Create a new observer device to start collecting data.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateDevice}>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="device_id" className="text-right">
                                                        Device ID
                                                    </Label>
                                                    <Input
                                                        id="device_id"
                                                        value={createForm.data.device_id}
                                                        onChange={(e) => createForm.setData('device_id', e.target.value)}
                                                        className="col-span-3"
                                                        required
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="name" className="text-right">
                                                        Name
                                                    </Label>
                                                    <Input
                                                        id="name"
                                                        value={createForm.data.name}
                                                        onChange={(e) => createForm.setData('name', e.target.value)}
                                                        className="col-span-3"
                                                        required
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="description" className="text-right">
                                                        Description
                                                    </Label>
                                                    <Textarea
                                                        id="description"
                                                        value={createForm.data.description}
                                                        onChange={(e) => createForm.setData('description', e.target.value)}
                                                        className="col-span-3"
                                                        rows={3}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit" disabled={createForm.processing}>
                                                    {createForm.processing ? 'Creating...' : 'Create Device'}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <Card className="hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                                        <Monitor className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{totalDevices}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Registered devices
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
                                        <Monitor className="h-4 w-4 text-green-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{activeDevices}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Currently active
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Inactive Devices</CardTitle>
                                        <Monitor className="h-4 w-4 text-gray-400" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{inactiveDevices}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Currently inactive
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="mt-8">
                                <h4 className="text-md font-medium text-gray-900 mb-4">Device List</h4>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Device ID</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Files</TableHead>
                                                <TableHead>Last Activity</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {devices.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                        No devices found. Click "Add Device" to create your first device.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                devices.map((device) => (
                                                    <TableRow key={device.id}>
                                                        <TableCell className="font-medium">{device.device_id}</TableCell>
                                                        <TableCell>{device.name}</TableCell>
                                                        <TableCell className="max-w-xs truncate">{device.description || '-'}</TableCell>
                                                        <TableCell>
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                                    device.is_active
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-gray-100 text-gray-800'
                                                                }`}
                                                            >
                                                                {device.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>{device.observer_files_count || 0}</TableCell>
                                                        <TableCell>
                                                            {device.last_activity_at ? (
                                                                <div className="flex items-center text-sm text-gray-600">
                                                                    <Clock className="mr-1 h-3 w-3" />
                                                                    {new Date(device.last_activity_at).toLocaleDateString()} {new Date(device.last_activity_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-gray-400">Never</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center space-x-2">
                                                                <a 
                                                                    href={route('devices.show', device.id)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        title="View Device (New Tab)"
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </a>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEditDevice(device)}
                                                                    title="Edit Device"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteDevice(device)}
                                                                    className="text-red-600 hover:text-red-700"
                                                                    title="Delete Device"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Device</DialogTitle>
                        <DialogDescription>
                            Update the device information.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateDevice}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_device_id" className="text-right">
                                    Device ID
                                </Label>
                                <Input
                                    id="edit_device_id"
                                    value={editForm.data.device_id}
                                    onChange={(e) => editForm.setData('device_id', e.target.value)}
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="edit_name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_description" className="text-right">
                                    Description
                                </Label>
                                <Textarea
                                    id="edit_description"
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                    className="col-span-3"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={editForm.processing}>
                                {editForm.processing ? 'Updating...' : 'Update Device'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
