/// <reference types="vite/client" />
import type { DocFlowPreloadApi } from '../preload/api-types';

declare global {
  interface Window {
    readonly docflowApi?: DocFlowPreloadApi;
  }
}

export {};
