import { ResponsiveContainer, PieChart, Cell, Pie, Tooltip, Legend } from 'recharts';
import './KPIDonutChart.css';

type DonutChartProps<T extends object> = {
    title: string;
    data: T[];
    nameKey: keyof T;
    dataKey: keyof T;
    onItemClick?: (item: T) => void;
    customColors?: string[];
};

const COLORS = [
    '#2563eb',
    '#4f86f7',
    '#38bdf8',
    '#0b1d4f',
    '#16a34a',
    '#0369a1',
    '#b45309',
    '#475569',
    '#dc2626',
];

function KPIDonutChart<T extends object>( {
    title,
    data,
    nameKey,
    dataKey,
    onItemClick,
    customColors,
 }: DonutChartProps<T>) {
    const palette = customColors ?? COLORS;
    return (
        <div className="chart-card donut-card-wrapper">
            <h3> {title} </h3>
            {/* Increased height slightly from 141px to 160px for dynamic readability */}
            <ResponsiveContainer width="100%" height={141.25}>
              <PieChart>
                <Pie
                  data={data}
                  nameKey={nameKey as string}
                  dataKey={dataKey as string}
                  /* Increased radius values to maximize total geometric size */
                  innerRadius={45}
                  outerRadius={60}
                  paddingAngle={4}
                  /* cx handles horizontal center alignment. 40% offsets it nicely to the left */
                  cx="40%"
                  cy="50%"
                  onClick={(_, index) => {
                    if (onItemClick && index >= 0 && data[index]) {
                      onItemClick(data[index]);
                    }
                  }}
                  style={{ cursor: onItemClick ? 'pointer' : 'default' }}
                >
                  {data.map((item, index) => (
                    <Cell 
                        key={`${title}-cell-${index}`} 
                        fill={palette[index % palette.length]} 
                        onClick={() => {
                          if (onItemClick) {
                            onItemClick(item);
                          }
                        }}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  /* CHANGED: Rearranges legend directly to the right margin */
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{
                    fontSize: '12px',
                    lineHeight: '1.5',
                    maxWidth: '45%', /* Prevents long item names from squishing the chart */
                    maxHeight: '140px',
                    overflowY: 'auto',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export default KPIDonutChart;