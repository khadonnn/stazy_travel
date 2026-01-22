'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react'; // Thêm icon
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Cần thêm component Input
import { format } from 'date-fns';
import { cn } from '@/lib/utils'; // Utility mặc định của shadcn

// Định nghĩa kiểu dữ liệu cho Todo
type TodoItem = {
    id: string;
    text: string;
    completed: boolean;
};

const TodoList = () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = useState('');

    // Dữ liệu mẫu ban đầu (hoặc lấy từ API)
    const [todos, setTodos] = useState<TodoItem[]>([
        { id: '1', text: 'Kiểm tra báo cáo doanh thu', completed: true },
        { id: '2', text: 'Họp với team Marketing', completed: false },
        { id: '3', text: 'Backup dữ liệu hệ thống', completed: false },
    ]);

    // Hàm toggle trạng thái hoàn thành
    const toggleTodo = (id: string) => {
        setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
    };

    // Hàm thêm việc mới
    const addTodo = () => {
        if (!inputValue.trim()) return;
        const newTodo: TodoItem = {
            id: Date.now().toString(), // Tạo ID ngẫu nhiên
            text: inputValue,
            completed: false,
        };
        setTodos([newTodo, ...todos]); // Thêm vào đầu danh sách
        setInputValue('');
    };

    // Hàm xóa việc
    const deleteTodo = (id: string) => {
        setTodos((prev) => prev.filter((todo) => todo.id !== id));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') addTodo();
    };

    return (
        <div className="flex h-full flex-col">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-medium font-semibold">Todo List</h1>
                {/* Date Picker */}
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                'w-[140px] justify-start text-left font-normal',
                                !date && 'text-muted-foreground',
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, 'PP') : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Input thêm việc mới */}
            <div className="mb-4 flex gap-2">
                <Input
                    placeholder="Thêm công việc mới..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-9"
                />
                <Button size="sm" onClick={addTodo} disabled={!inputValue.trim()}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="max-h-[400px] flex-1 pr-4">
                <div className="flex flex-col gap-3">
                    {todos.length === 0 ? (
                        <p className="text-muted-foreground py-8 text-center text-sm">Không có công việc nào.</p>
                    ) : (
                        todos.map((item) => (
                            <Card key={item.id} className="group p-3 transition-all hover:shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <Checkbox
                                            id={`todo-${item.id}`} // ID unique
                                            checked={item.completed}
                                            onCheckedChange={() => toggleTodo(item.id)}
                                        />
                                        <label
                                            htmlFor={`todo-${item.id}`} // Trỏ đúng ID
                                            className={cn(
                                                'cursor-pointer truncate text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                                                item.completed && 'text-muted-foreground line-through', // Gạch ngang nếu xong
                                            )}
                                        >
                                            {item.text}
                                        </label>
                                    </div>

                                    {/* Nút xóa chỉ hiện khi hover (nhờ class group ở Card) */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={() => deleteTodo(item.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default TodoList;
