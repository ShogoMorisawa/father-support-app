'use client';

interface TimeSelectorProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimeSelector({
  value,
  onChange,
  placeholder = '時刻を選択',
  className = '',
}: TimeSelectorProps) {
  // 時刻の選択肢を生成（00:00から23:59まで30分間隔）
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    >
      <option value="">{placeholder}</option>
      {timeOptions.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </select>
  );
}

