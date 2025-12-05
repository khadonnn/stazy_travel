import type { ComponentType } from 'react';

export type Route = string;
export type PathName = Route;

export interface Page {
    path: PathName;
    component: ComponentType<Record<string, unknown>>;
}
