<script setup lang="ts">
import { glyphs, spriteURL, symbolChoices } from '../icons';
defineProps<{ value: string; kind?: string }>();
</script>
<template>
  <span v-if="kind === 'icon' && glyphs.has(value)" class="studio-glyph" aria-hidden="true">{{ glyphs.get(value) }}</span>
  <svg v-else-if="kind === 'symbol' && symbolChoices.some(option => option.value === value)" class="symbol-preview" aria-hidden="true"><use :href="`${spriteURL}#${value}`" /></svg>
  <span v-else-if="kind === 'emoji'" class="emoji-preview" aria-hidden="true">{{ value }}</span>
</template>
