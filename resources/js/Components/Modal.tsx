import {
    Dialog,
    DialogPanel,
    Transition,
} from '@headlessui/react';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose = () => {},
}) {
    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
    }[maxWidth];

    if (!show) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center overflow-y-auto px-4 py-6 sm:px-0">
            <div className="absolute inset-0 bg-gray-500/75" onClick={close} />
            <Dialog
                as="div"
                className="relative mx-auto w-full"
                onClose={close}
                open={show}
            >
                <DialogPanel
                    className={`mb-6 transform overflow-hidden rounded-lg bg-white shadow-xl transition-all sm:mx-auto sm:w-full ${maxWidthClass}`}
                >
                    {children}
                </DialogPanel>
            </Dialog>
        </div>
    );
}
