'use client';

import { useEffect, useState } from 'react';
import { getAIStatus, forceRetrainAI } from '@/actions/aiActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, RefreshCw, Activity, Database, Clock, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AIStatus {
    status: string;
    model_loaded: boolean;
    last_trained: string;
    model_type: string;
    best_params: {
        n_factors: number;
        n_epochs: number;
        lr_all: number;
        reg_all: number;
    };
    data_stats: {
        total_ratings: number;
        unique_users: number;
        unique_hotels: number;
    };
    evaluation: {
        optimized_rmse: number;
        optimized_mae: number;
        baseline_rmse: number;
        baseline_mae: number;
        rmse_improvement_pct: number;
        mae_improvement_pct: number;
    };
    model_file_exists: boolean;
    model_file_size_mb: number;
}

export default function AIManagementPage() {
    const [status, setStatus] = useState<AIStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [retraining, setRetraining] = useState(false);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const data = await getAIStatus();
            setStatus(data);
        } catch (error) {
            console.error('Failed to fetch AI status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleForceRetrain = async () => {
        setRetraining(true);
        try {
            const result = await forceRetrainAI();
            if (result.success) {
                toast.success(result.data.message || 'Huấn luyện đã bắt đầu chạy ngầm!');
                // Poll status after 10 seconds
                setTimeout(() => fetchStatus(), 10000);
            } else {
                toast.error(result.error || 'Không thể kích hoạt huấn luyện');
            }
        } catch (error) {
            toast.error('Lỗi kết nối đến AI Service');
        } finally {
            setRetraining(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!status || status.status === 'no_report') {
        return (
            <div className="space-y-6 p-6">
                <h1 className="text-2xl font-bold">Quản lý AI Model</h1>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="mb-4 h-12 w-12 text-yellow-500" />
                        <p className="text-lg font-medium">Chưa có model SVD</p>
                        <p className="text-muted-foreground mb-4 text-sm">
                            Hãy chạy train_svd.py hoặc nhấn nút bên dưới để bắt đầu.
                        </p>
                        <Button onClick={handleForceRetrain} disabled={retraining}>
                            <BrainCircuit className="mr-2 h-4 w-4" />
                            {retraining ? 'Đang khởi tạo...' : 'Huấn luyện lần đầu'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const eval_ = status.evaluation;

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Quản lý AI Model</h1>
                    <p className="text-muted-foreground text-sm">Giám sát trạng thái và hiệu suất mô hình SVD</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchStatus} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </Button>
                    <Button onClick={handleForceRetrain} disabled={retraining}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${retraining ? 'animate-spin' : ''}`} />
                        {retraining ? 'Đang huấn luyện...' : 'Huấn luyện lại ngay'}
                    </Button>
                </div>
            </div>

            {/* Status Cards Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Trạng thái</CardTitle>
                        <Activity className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {status.model_loaded ? (
                                <Badge className="bg-green-500 hover:bg-green-600">
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Đang hoạt động
                                </Badge>
                            ) : (
                                <Badge variant="destructive">
                                    <AlertCircle className="mr-1 h-3 w-3" /> Chưa load
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-2 text-xs">{status.model_type}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">RMSE</CardTitle>
                        <Zap className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{eval_?.optimized_rmse?.toFixed(4) || '—'}</div>
                        <p className="text-xs text-green-600">
                            Cải thiện {eval_?.rmse_improvement_pct?.toFixed(1) || 0}% so với baseline
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">MAE</CardTitle>
                        <Zap className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{eval_?.optimized_mae?.toFixed(4) || '—'}</div>
                        <p className="text-xs text-green-600">
                            Cải thiện {eval_?.mae_improvement_pct?.toFixed(1) || 0}% so với baseline
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Dữ liệu</CardTitle>
                        <Database className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {status.data_stats?.total_ratings?.toLocaleString() || '—'}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {status.data_stats?.unique_users || 0} users × {status.data_stats?.unique_hotels || 0}{' '}
                            hotels
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Model Configuration */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5" />
                            Cấu hình Model (Best Params)
                        </CardTitle>
                        <CardDescription>Hyperparameters tối ưu từ GridSearchCV</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            {status.best_params &&
                                Object.entries(status.best_params).map(([key, value]) => (
                                    <div key={key} className="rounded-lg border p-3">
                                        <p className="text-muted-foreground text-xs">{key}</p>
                                        <p className="text-lg font-semibold">{value}</p>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Thông tin Model
                        </CardTitle>
                        <CardDescription>Trạng thái file và thời gian cập nhật</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">Lần train cuối</span>
                            <span className="text-sm font-medium">
                                {status.last_trained ? new Date(status.last_trained).toLocaleString('vi-VN') : '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">File model</span>
                            <Badge variant={status.model_file_exists ? 'default' : 'destructive'}>
                                {status.model_file_exists ? 'Tồn tại' : 'Không tìm thấy'}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">Kích thước</span>
                            <span className="text-sm font-medium">{status.model_file_size_mb || 0} MB</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">Auto-retrain</span>
                            <Badge className="bg-blue-500 hover:bg-blue-600">3:00 AM hàng ngày</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
