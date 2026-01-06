import { MonthGrid } from "./MonthGrid";
import type { CalendarEvent } from "../env";

interface Props {
  year: number;
  events: CalendarEvent[];
}

export function YearCalendar({ year, events }: Props) {
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 flex-1 overflow-auto bg-gray-50">
      {months.map((month) => (
        <MonthGrid key={month} year={year} month={month} events={events} />
      ))}
    </div>
  );
}
