'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
const TodoList = () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [open, setOpen] = React.useState(false);
    return (
        <div>
            <h1 className="text-medium mb-4 font-semibold">Todo List</h1>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="default" className="w-full cursor-pointer">
                        <CalendarIcon />
                        {date ? format(date, 'PPP') : 'Select date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} />
                </PopoverContent>
            </Popover>

            <ScrollArea className="mt-4 max-h-[400px] overflow-y-auto">
                {/* list items */}
                <div className="flex flex-col gap-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" checked />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" checked />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" checked />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" checked />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>{' '}
                    {/* list items */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <Checkbox id="item1" />
                            <label
                                htmlFor="item1"
                                className="text-muted-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                            </label>
                        </div>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    );
};
export default TodoList;
