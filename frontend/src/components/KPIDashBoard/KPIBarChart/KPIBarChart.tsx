import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer  } from 'recharts';
import './KPIBarChart.css';

type BarChartProps<T extends object> = {
    title: string;
    data: T[];
    xKey: keyof T;
    yKey: keyof T;
    onItemClick?: (item: T) => void;
};

function KPIBarChart<T extends object>({
    title,
    data,
    xKey, 
    yKey,
    onItemClick,
}: BarChartProps<T>) {
    return (
        <div className = "chart-card">
            <h3> {title} </h3>
                <ResponsiveContainer width="100%" height={141.25}>
                    <BarChart data = {data}>
                    <XAxis dataKey = {xKey as string} />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                        dataKey = {yKey as string}
                        fill="#2563eb" 
                        radius={[4, 4, 0, 0]} 
                        onClick={(entry) => {
                          if (onItemClick && entry && entry.payload) {
                            onItemClick(entry.payload as T);
                          }
                        }}
                        cursor={onItemClick ? 'pointer' : 'default'}
                    />
                    </BarChart>
                </ResponsiveContainer>
        </div>
    )
}

export default KPIBarChart