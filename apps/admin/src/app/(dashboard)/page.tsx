import AppAreaChart from '@/components/AppAreaChart';
import AppBarChart from '@/components/AppBarChart';
import AppPieChart from '@/components/AppPieChart';
import CardList from '@/components/CardList';
import LatestTransactions from '@/components/LatestTransactions';
import TodoList from '@/components/TodoList';

export default function Home() {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4">
            <div className="bg-primary-foreground rounded-lg border border-gray-800/10 p-4 shadow-sm lg:col-span-2 xl:col-span-1 2xl:col-span-2 dark:border-gray-200/10">
                <AppBarChart />
            </div>
            <div className="bg-primary-foreground rounded-lg border border-gray-800/10 p-4 shadow-sm dark:border-gray-200/10">
                <AppPieChart />
            </div>
            <div className="bg-primary-foreground rounded-lg border border-gray-800/10 p-4 shadow-sm dark:border-gray-200/10">
                <LatestTransactions />
            </div>
            <div className="bg-primary-foreground rounded-lg border border-gray-800/10 p-4 shadow-sm dark:border-gray-200/10">
                <TodoList />
            </div>
            <div className="bg-primary-foreground rounded-lg border border-gray-800/10 p-4 shadow-sm lg:col-span-2 xl:col-span-1 2xl:col-span-2 dark:border-gray-200/10">
                <AppAreaChart />
            </div>
            <div className="bg-primary-foreground rounded-lg border border-gray-800/10 p-4 shadow-sm dark:border-gray-200/10">
                <CardList title="Popular Stays" />
            </div>
        </div>
    );
}
