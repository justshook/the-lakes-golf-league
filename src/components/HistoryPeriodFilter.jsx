import React from 'react';
import { Button } from './ui/button';

export default function HistoryPeriodFilter({ value = 'all', periods = [], onChange, label = 'History year' }) {
  const choices = ['all', ...periods];
  if (!choices.includes(value)) choices.push(value);
  return <div role="group" aria-label={label} className="flex flex-wrap gap-2">
    {choices.map(period => <Button key={period} type="button" variant={value === period ? 'default' : 'outline'} className="h-11 rounded-full px-4 text-sm" aria-pressed={value === period} onClick={() => onChange(period)}>
      {period === 'all' ? 'All years' : period === 'undated' ? 'Undated' : period}
    </Button>)}
  </div>;
}
