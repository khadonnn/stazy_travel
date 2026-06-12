'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getAIStatus, forceRetrainAI, getTrainingProgress } from '@/actions/aiActions';
import { getLatestSystemMetric } from '@/app/(dashboard)/actions/get-system-metrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BrainCircuit,
    RefreshCw,
    Activity,
    Database,
    Clock,
    Zap,
    CheckCircle2,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import ExportablePDFSection from '@/components/export/ExportablePDFSection';

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

interface SystemMetricData {
    rmse: number;
    mae: number;
    precisionAt5: number;
    recallAt5: number;
    ndcgAt5: number;
    baselineRmse: number;
    baselineMae: number;
    baselinePrecision: number;
    baselineRecall: number;
    baselineNdcg: number;
    algorithm: string;
    datasetSize: number;
    createdAt: string;
}

interface TrainingProgress {
    is_running: boolean;
    progress_pct: number;
    current_step: string;
    status_message: string;
    started_at: string | null;
    finished_at: string | null;
    success: boolean | null;
    error_message: string | null;
    lock_acquired: boolean;
}

export default function AIManagementPage() {
    const [status, setStatus] = useState<AIStatus | null>(null);
    const [metrics, setMetrics] = useState<SystemMetricData | null>(null);
    const [loading, setLoading] = useState(true);
    const [retraining, setRetraining] = useState(false);
    const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const [data, metricData] = await Promise.all([getAIStatus(), getLatestSystemMetric()]);
            setStatus(data);
            if (metricData) {
                setMetrics(metricData as unknown as SystemMetricData);
            }
        } catch (error) {
            console.error('Failed to fetch AI status:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Poll training progress khi đang training
    const startPollingProgress = useCallback(() => {
        // Clear interval cũ nếu có
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
        }

        pollingRef.current = setInterval(async () => {
            try {
                const progress = await getTrainingProgress();
                if (progress) {
                    setTrainingProgress(progress);

                    // Nếu training đã kết thúc
                    if (!progress.is_running && progress.success !== null) {
                        // Dừng polling
                        if (pollingRef.current) {
                            clearInterval(pollingRef.current);
                            pollingRef.current = null;
                        }
                        setRetraining(false);

                        if (progress.success) {
                            toast.success('Huấn luyện hoàn tất!');
                            // Tự động fetch lại status mới
                            fetchStatus();
                        } else {
                            toast.error(progress.error_message || 'Huấn luyện thất bại');
                        }
                    }
                }
            } catch (error) {
                console.error('Poll progress error:', error);
            }
        }, 2000); // Poll mỗi 2 giây
    }, [fetchStatus]);

    // Cleanup interval khi unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    const handleForceRetrain = async () => {
        console.log('🔧 [UI] Bắt đầu huấn luyện lại...');
        console.time('forceRetrain');
        setRetraining(true);
        setTrainingProgress({
            is_running: true,
            progress_pct: 0,
            current_step: 'init',
            status_message: 'Đang khởi tạo...',
            started_at: new Date().toISOString(),
            finished_at: null,
            success: null,
            error_message: null,
            lock_acquired: true,
        });

        try {
            console.log('🔧 [UI] Gọi forceRetrainAI()...');
            const result = await forceRetrainAI();
            console.log('🔧 [UI] forceRetrainAI result:', JSON.stringify(result, null, 2));
            if (result.success) {
                console.log('🔧 [UI] Thành công! Bắt đầu polling progress...');
                toast.success(result.data.message || 'Huấn luyện đã bắt đầu chạy ngầm!');
                // Bắt đầu poll progress
                startPollingProgress();
            } else {
                console.error('🔧 [UI] Lỗi:', result.error);
                toast.error(result.error || 'Không thể kích hoạt huấn luyện');
                setRetraining(false);
                setTrainingProgress(null);
            }
        } catch (error) {
            console.error('🔧 [UI] Lỗi kết nối:', error);
            toast.error('Lỗi kết nối đến AI Service');
            setRetraining(false);
            setTrainingProgress(null);
        }
        console.timeEnd('forceRetrain');
    };

    // --- RENDER: Loading ---
    if (loading && !status) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
        );
    }

    // --- RENDER: Training Progress Overlay (khi đang training, thay thế toàn bộ nội dung) ---
    if (trainingProgress?.is_running) {
        return (
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Quản lý AI Model</h1>
                        <p className="text-muted-foreground text-sm">Đang huấn luyện model...</p>
                    </div>
                    <Button disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang huấn luyện...
                    </Button>
                </div>

                {/* Training Progress Card */}
                <Card className="border-primary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Loader2 className="text-primary h-5 w-5 animate-spin" />
                            Tiến trình huấn luyện
                        </CardTitle>
                        <CardDescription>{trainingProgress.status_message}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Tiến độ</span>
                                <span className="font-medium">{trainingProgress.progress_pct}%</span>
                            </div>
                            <Progress value={trainingProgress.progress_pct} className="h-3" />
                        </div>

                        {/* Steps */}
                        <div className="space-y-2">
                            <TrainingStep
                                label="Kết nối database"
                                step="connecting_db"
                                current={trainingProgress.current_step}
                                pct={5}
                                currentPct={trainingProgress.progress_pct}
                            />
                            <TrainingStep
                                label="Tải dữ liệu"
                                step="loading_data"
                                current={trainingProgress.current_step}
                                pct={10}
                                currentPct={trainingProgress.progress_pct}
                            />
                            <TrainingStep
                                label="Xử lý điểm số"
                                step="converting_scores"
                                current={trainingProgress.current_step}
                                pct={20}
                                currentPct={trainingProgress.progress_pct}
                            />
                            <TrainingStep
                                label="Cross-validation"
                                step="training_cv"
                                current={trainingProgress.current_step}
                                pct={30}
                                currentPct={trainingProgress.progress_pct}
                            />
                            <TrainingStep
                                label="Huấn luyện final model"
                                step="training_final"
                                current={trainingProgress.current_step}
                                pct={55}
                                currentPct={trainingProgress.progress_pct}
                            />
                            <TrainingStep
                                label="Lưu model & báo cáo"
                                step="saving_model"
                                current={trainingProgress.current_step}
                                pct={70}
                                currentPct={trainingProgress.progress_pct}
                            />
                            <TrainingStep
                                label="Tải model vào bộ nhớ"
                                step="reloading_model"
                                current={trainingProgress.current_step}
                                pct={95}
                                currentPct={trainingProgress.progress_pct}
                            />
                        </div>

                        {/* Chú thích auto-refresh */}
                        <p className="text-muted-foreground text-xs italic">
                            Dữ liệu sẽ tự động cập nhật sau khi huấn luyện hoàn tất.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // --- RENDER: No Model ---
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
        <ExportablePDFSection filename="stazy_ai-management" title="Báo cáo AI" className="space-y-6 p-6">
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
                        {retraining ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {retraining ? 'Đang huấn luyện...' : 'Huấn luyện lại ngay'}
                    </Button>
                </div>
            </div>

            {/* Status Cards Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Trạng thái hệ thống</CardTitle>
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
                        <p className="text-muted-foreground text-xs">Root Mean Square Error</p>
                        <p className="text-xs text-green-600">
                            Baseline: {eval_?.baseline_rmse?.toFixed(4) || '—'} → Cải thiện{' '}
                            {eval_?.rmse_improvement_pct?.toFixed(1) || 0}%
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
                        <p className="text-muted-foreground text-xs">Mean Absolute Error</p>
                        <p className="text-xs text-green-600">
                            Baseline: {eval_?.baseline_mae?.toFixed(4) || '—'} → Cải thiện{' '}
                            {eval_?.mae_improvement_pct?.toFixed(1) || 0}%
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

            {/* Ranking Metrics (Implicit CF) */}
            <h2 className="mt-6 text-lg font-semibold">📊 Chỉ số Ranking (Implicit CF — System A)</h2>
            <p className="text-muted-foreground mb-3 text-sm">
                Đánh giá khả năng gợi ý đúng khách sạn trong Top-K. Dữ liệu từ 6 loại tín hiệu ngầm định (VIEW,
                CLICK_BOOK_NOW, ADD_TO_WISHLIST, RATE_POSITIVE, BOOK, RATE_NEGATIVE).
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Precision@5</CardTitle>
                        <CardDescription className="text-xs">|Relevant ∩ Recommended@5| / 5</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {metrics?.precisionAt5?.toFixed(1) || '—'}%
                        </div>
                        <p className="text-muted-foreground text-xs">Tỷ lệ item đúng trong 5 gợi ý đầu</p>
                        <p className="text-xs text-blue-600">
                            Baseline (Top Popular): {metrics?.baselinePrecision?.toFixed(1) || '—'}%
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Recall@5</CardTitle>
                        <CardDescription className="text-xs">|Relevant ∩ Recommended@5| / |Relevant|</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{metrics?.recallAt5?.toFixed(1) || '—'}%</div>
                        <p className="text-muted-foreground text-xs">Tỷ lệ item đúng được tìm thấy</p>
                        <p className="text-xs text-blue-600">
                            Baseline (Top Popular): {metrics?.baselineRecall?.toFixed(1) || '—'}%
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">NDCG@5</CardTitle>
                        <CardDescription className="text-xs">
                            DCG@5 / IDCG@5 — Discounted Cumulative Gain
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{metrics?.ndcgAt5?.toFixed(4) || '—'}</div>
                        <p className="text-muted-foreground text-xs">Chất lượng xếp hạng (ranking quality)</p>
                        <p className="text-xs text-blue-600">
                            Baseline (Top Popular): {metrics?.baselineNdcg?.toFixed(4) || '—'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Prediction Metrics (Explicit CF) */}
            <h2 className="mt-6 text-lg font-semibold">📈 Chỉ số Dự đoán (Explicit CF — System B)</h2>
            <p className="text-muted-foreground mb-3 text-sm">
                Đánh giá khả năng dự đoán điểm đánh giá (rating prediction). Dữ liệu từ reviews (1-5 sao).
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">RMSE — Root Mean Square Error</CardTitle>
                        <CardDescription className="text-xs">√(Σ(ŷᵢ - yᵢ)² / N)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {eval_?.optimized_rmse?.toFixed(4) || '—'}
                        </div>
                        <p className="text-muted-foreground text-xs">Giá trị thấp hơn = dự đoán chính xác hơn</p>
                        <p className="text-xs text-green-600">
                            Baseline (User Mean): {eval_?.baseline_rmse?.toFixed(4) || '—'} → Cải thiện{' '}
                            {eval_?.rmse_improvement_pct?.toFixed(1) || 0}%
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">MAE — Mean Absolute Error</CardTitle>
                        <CardDescription className="text-xs">Σ|ŷᵢ - yᵢ| / N</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {eval_?.optimized_mae?.toFixed(4) || '—'}
                        </div>
                        <p className="text-muted-foreground text-xs">Lỗi tuyệt đối trung bình trên mỗi dự đoán</p>
                        <p className="text-xs text-green-600">
                            Baseline (User Mean): {eval_?.baseline_mae?.toFixed(4) || '—'} → Cải thiện{' '}
                            {eval_?.mae_improvement_pct?.toFixed(1) || 0}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Model Configuration */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
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

            {/* Signal Weights Reference */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Trọng số Tín hiệu Ngầm định (Implicit Signal Weights)
                    </CardTitle>
                    <CardDescription>signal_weights dùng trong Collaborative Filtering</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                        {[
                            { name: 'VIEW', weight: '0.5', color: 'bg-gray-100 text-gray-700' },
                            { name: 'CLICK_BOOK_NOW', weight: '2.0', color: 'bg-blue-100 text-blue-700' },
                            { name: 'ADD_TO_WISHLIST', weight: '3.0', color: 'bg-pink-100 text-pink-700' },
                            { name: 'RATE_POSITIVE', weight: '4.5', color: 'bg-green-100 text-green-700' },
                            { name: 'BOOK', weight: '5.0', color: 'bg-emerald-100 text-emerald-700' },
                            { name: 'RATE_NEGATIVE', weight: '-3.0', color: 'bg-red-100 text-red-700' },
                        ].map((signal) => (
                            <div key={signal.name} className={`rounded-lg p-3 text-center ${signal.color}`}>
                                <p className="text-xs font-medium">{signal.name}</p>
                                <p className="text-lg font-bold">{signal.weight}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </ExportablePDFSection>
    );
}

// Sub-component: hiển thị từng bước training
function TrainingStep({
    label,
    step,
    current,
    pct,
    currentPct,
}: {
    label: string;
    step: string;
    current: string;
    pct: number;
    currentPct: number;
}) {
    const isActive = current === step;
    const isDone = currentPct > pct;
    const isPending = currentPct < pct && !isActive;

    return (
        <div
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                isActive
                    ? 'border-primary bg-primary/5'
                    : isDone
                      ? 'border-green-200 bg-green-50'
                      : 'border-muted bg-muted/20'
            }`}
        >
            {isDone ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            ) : isActive ? (
                <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
            ) : (
                <div className="border-muted-foreground/30 h-4 w-4 shrink-0 rounded-full border-2" />
            )}
            <span
                className={isDone ? 'text-green-700' : isActive ? 'text-primary font-medium' : 'text-muted-foreground'}
            >
                {label}
            </span>
        </div>
    );
}
