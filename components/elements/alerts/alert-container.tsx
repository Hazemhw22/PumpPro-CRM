'use client';
import React from 'react';
import { Alert } from './elements-alerts-default';

interface AlertData {
    id: string;
    type: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    message: string;
    title?: string;
}

interface AlertContainerProps {
    alerts: AlertData[];
    onClose: (id: string) => void;
}

const AlertContainer: React.FC<AlertContainerProps> = ({ alerts, onClose }) => {
    if (alerts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] w-full max-w-md space-y-3">
            {alerts.map((alert) => (
                <Alert
                    key={alert.id}
                    type={alert.type}
                    title={alert.title}
                    message={alert.message}
                    onClose={() => onClose(alert.id)}
                />
            ))}
        </div>
    );
};

export default AlertContainer;
