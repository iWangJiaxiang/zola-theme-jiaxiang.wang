<script setup lang="ts">
import type { Json } from '../../shared/types';
import type { Choice } from '../../shared/choices';
import SelectionField from './SelectionField.vue';
defineProps<{ modelValue: Json; options: Choice[]; name: string; label: string; disabled?: boolean; hint?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: Json] }>();
</script>
<template><SelectionField :model-value="modelValue" :options="options" :name="name" :label="label" :disabled="disabled" :hint="hint" multiple @update:model-value="emit('update:modelValue', $event)" /></template>
