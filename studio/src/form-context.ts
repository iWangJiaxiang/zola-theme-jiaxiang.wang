import type { InjectionKey, Ref } from 'vue';
import type { Choice } from '../shared/choices';
import type { Message } from './i18n';
import type { Json } from '../shared/types';
export interface FormContext { unresolved: Ref<string[]>; posts: Ref<Choice[]>; links: Ref<Choice[]>; values: Ref<Record<string, Json>>; loading: Ref<boolean>; error: Ref<Message> }
export const formContext: InjectionKey<FormContext> = Symbol('studio-form');
