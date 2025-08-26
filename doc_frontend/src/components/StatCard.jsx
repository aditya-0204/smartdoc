// src/components/StatCard.js
import React from 'react';

const colorClasses = {
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

export const StatCard = ({ title, value, color = 'blue' }) => {
  return (
    <div className={`p-6 rounded-lg shadow ${colorClasses[color]}`}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-4xl font-bold">{value}</p>
    </div>
  );
};  