import React from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { CategoryScale, Chart as ChartJs, Tooltip, Filler, LinearScale, PointElement, LineElement, ArcElement, Legend } from "chart.js";
import { lightOrange, lightPurple, orange, purple } from '../../constants/color';
import { getLast7Days } from '../../lib/features';

ChartJs.register(
    CategoryScale,
    Tooltip,
    Filler,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Legend
);


const labels = getLast7Days();


const lineChartOptions = {
    responsive: true,
    plugins: {
        legend: {
            display: false
        },
        title: {
            display: false
        }
    },
    scale: {
        x: {
            grid: {
                display: false
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                display: false
            },
            ticks: {
                stepSize: 10
            }
        }
    }
};

const LineChart = ({ values = [] }) => {
    const data = {
        labels: labels,
        datasets: [
            {
                label: "Total messages sent",
                data: values,
                fill: true,
                backgroundColor: lightPurple,
                borderColor: purple,
                tension: 0.1
            }
        ]
    };
    return (
        <Line data={data} options={lineChartOptions} />
    )
}

const doughnuChartOptions = {
    responsive: true,
    plugins: {
        legend: {
            display: false
        },
        title: {
            display: false
        }
    },
    cutout: 120
};

const DoughnutChart = ({ values = [], labels = [] }) => {
    const data = {
        labels: labels,
        datasets: [
            {
                data: values,
                fill: true,
                backgroundColor: [lightPurple, lightOrange],
                hoverBackgroundColor:[purple, orange],
                borderColor: [purple, orange],
                offset: 20
            }
        ]
    };
    return (
        <Doughnut style={{zIndex: 10}} data={data} options={doughnuChartOptions}/>
    )
}

export { LineChart, DoughnutChart };