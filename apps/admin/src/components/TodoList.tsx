'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Trash2, Brain, Loader2, BarChart3, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trainAIModel, getTrainingStatus } from '@/actions/aiActions';

type TodoItem = { id: string; text: string; completed: boolean };

const TodoList = () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isTraining, setIsTraining] = useState(false);
    const [trainingStatus, setTrainingStatus] = useState<any>(null);

    const [todos, setTodos] = useState<TodoItem[]>([
        {
            id: '1',
            text: 'Kiểm tra báo cáo doanh thu Kiểm tra báo cáo doanh thu Kiểm tra báo cáo doanh thu Kiểm tra báo cáo doanh thu',
            completed: true,
        },
        { id: '2', text: 'Train lại model SVD', completed: false },
        { id: '3', text: 'Xem xét anomalies', completed: false },
    ]);

    const toggleTodo = (id: string) =>
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    const addTodo = () => {
        if (!inputValue.trim()) return;
        setTodos([{ id: Date.now().toString(), text: inputValue, completed: false }, ...todos]);
        setInputValue('');
    };
    const deleteTodo = (id: string) => setTodos((prev) => prev.filter((t) => t.id !== id));

    useEffect(() => {
        getTrainingStatus().then(setTrainingStatus);
    }, []);

    const handleTrain = async () => {
        setIsTraining(true);
        const result = await trainAIModel();
        setIsTraining(false);
        if (result.success) {
            toast.success(result.data.message);
            getTrainingStatus().then(setTrainingStatus);
        } else toast.error(result.error || 'Training failed');
    };

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
                <h1 className="text-sm font-semibold">Todo List</h1>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                'w-[120px] justify-start text-left text-xs font-normal',
                                !date && 'text-muted-foreground',
                            )}
                        >
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                            {date ? format(date, 'PP') : <span>Pick date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>

            {/* AI + Navigation */}
            <div className="mb-2 flex gap-1.5">
                {/* <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-start gap-1.5 text-xs"
                    onClick={handleTrain}
                    disabled={isTraining}
                >
                    {isTraining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                    Train AI
                </Button> */}
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 cursor-pointer justify-start gap-1.5 text-xs"
                    onClick={() => (window.location.href = '/chatbox')}
                >
                    <BarChart3 className="h-3 w-3" />
                    BI Agent
                    <ArrowRight className="ml-auto h-3 w-3 opacity-50" />
                </Button>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="mb-2 w-full cursor-pointer justify-start gap-1.5 text-xs"
                onClick={() => (window.location.href = '/ai-management')}
            >
                <Brain className="h-3 w-3" />
                AI Management
                {trainingStatus && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                        {trainingStatus.totalInteractions}
                    </Badge>
                )}
                <ArrowRight className="ml-auto h-3 w-3 opacity-50" />
            </Button>

            {/* Input */}
            <div className="mb-2 flex gap-1.5">
                <Input
                    placeholder="Thêm công việc..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                    className="h-7 text-xs"
                />
                <Button size="sm" onClick={addTodo} disabled={!inputValue.trim()} className="h-7 px-2">
                    <Plus className="h-3 w-3" />
                </Button>
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1">
                    {todos.length === 0 ? (
                        <p className="text-muted-foreground py-4 text-center text-xs">Trống.</p>
                    ) : (
                        todos.map((item) => (
                            <Card
                                key={item.id}
                                className="group grid grid-cols-[auto_1fr_auto] items-start gap-2 p-1.5"
                            >
                                <Checkbox
                                    checked={item.completed}
                                    onCheckedChange={() => toggleTodo(item.id)}
                                    className="mt-0.5 h-3.5 w-3.5"
                                />

                                <span
                                    className={cn(
                                        'text-xs leading-relaxed font-medium break-words',
                                        item.completed && 'text-muted-foreground line-through',
                                    )}
                                >
                                    {item.text}
                                </span>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive mt-0.5 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                                    onClick={() => deleteTodo(item.id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default TodoList;
