interface Props {
  year: number;
  userEmail: string;
}

export function Header({ year, userEmail }: Props) {
  const currentYear = new Date().getFullYear();

  return (
    <header class="flex items-center justify-between p-4 border-b shrink-0 bg-white">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <a
            href={`/?year=${year - 1}`}
            class="p-2 hover:bg-gray-100 rounded text-gray-600"
          >
            &larr;
          </a>
          <h1 class="text-2xl font-bold tabular-nums min-w-[5ch] text-center">
            {year}
          </h1>
          <a
            href={`/?year=${year + 1}`}
            class="p-2 hover:bg-gray-100 rounded text-gray-600"
          >
            &rarr;
          </a>
        </div>
        {year !== currentYear && (
          <a
            href="/"
            class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Today
          </a>
        )}
      </div>
      <div class="flex items-center gap-4 text-sm text-gray-600">
        <span>{userEmail}</span>
        <a href="/signout" class="text-blue-600 hover:underline">
          Sign out
        </a>
      </div>
    </header>
  );
}
