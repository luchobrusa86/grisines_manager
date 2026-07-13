import React, { useEffect, useState } from 'react';
import { Activity, ServerOff, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface AfipState {
    status: 'online' | 'offline' | 'loading';
    app?: string;
    db?: string;
}

const AfipStatus: React.FC = () => {
    const [statusData, setStatusData] = useState<AfipState>({ status: 'loading' });

    const checkStatus = async () => {
        try {
            const response = await fetch(`${API_URL}/afip/status`);
            const data = await response.json();
            setStatusData(data);
        } catch (error) {
            setStatusData({ status: 'offline' });
        }
    };

    useEffect(() => {
        checkStatus();
        // Opcional: Re-chequear cada 5 minutos
        const interval = setInterval(checkStatus, 300000);
        return () => clearInterval(interval);
    }, []);

    // Configuramos colores y clases según el estado
    const config = {
        online: {
            container: 'bg-emerald-50 border-emerald-200 text-emerald-700',
            dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
            icon: <Activity className="w-3.5 h-3.5" />,
            text: 'ARCA Conectado'
        },
        loading: {
            container: 'bg-amber-50 border-amber-200 text-amber-700',
            dot: 'bg-amber-500 animate-pulse',
            icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
            text: 'Verificando ARCA...'
        },
        offline: {
            container: 'bg-red-50 border-red-200 text-red-700',
            dot: 'bg-red-500',
            icon: <ServerOff className="w-3.5 h-3.5" />,
            text: 'ARCA Desconectado'
        }
    };

    const current = config[statusData.status];

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold tracking-wide uppercase transition-colors ${current.container}`}>
            <div className="relative flex items-center justify-center">
                <span className={`w-2 h-2 rounded-full ${current.dot}`}></span>
            </div>
            <div className="flex items-center gap-1.5">
                {current.icon}
                {current.text}
            </div>
        </div>
    );
};

export default AfipStatus;