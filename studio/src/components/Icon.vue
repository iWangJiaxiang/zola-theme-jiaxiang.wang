<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 });
const paths: Record<string, string> = {
  image: 'M3 3h18v18H3ZM3 16l5-5 4 4 3-3 6 6M15 7h.01',
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  pen: 'm16 3 5 5-12 12-6 1 1-6ZM14 5l5 5',
  book: 'M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v15h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3ZM12 6v15',
  folder: 'M3 7V4h6l3 3h9v13H3Z',
  file: 'M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8M8 16h6',
  tag: 'M3 3h8l10 10-8 8L3 11ZM7 7h.01',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
  menu: 'M4 6h16M4 12h16M4 18h16',
  link: 'm10 13 4-4M8 15l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 6 0M16 9l2-2a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-6 0',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 8 0 0 1 16 0v3',
  star: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',
  palette: 'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h6a3 3 0 0 0 3-3 9 9 0 0 0-9-7ZM7 8h.01M12 6h.01M17 8h.01M5 13h.01',
  moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',
  arrow: 'M5 12h14M14 7l5 5-5 5',
  plus: 'M12 5v14M5 12h14',
  logout: 'M9 3H4v18h5M9 12h12M17 8l4 4-4 4',
  search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM15 15l6 6',
  lock: 'M6 10h12v11H6ZM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
  check: 'm5 12 4 4L19 6',
};
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.file" /></svg></template>
