import { DynMapReducer } from '@typhonjs-fvtt/runtime/svelte/store';

export default class SpellMapReducer extends DynMapReducer {
  initialize() {
    this.filters.add((item) => item.type === 'spell');
    this.sort.set((a, b) => a.sort - b.sort);
  }
}