import * as migration_20260925_104747_initial from './20260925_104747_initial';

export const migrations = [
  {
    up: migration_20260925_104747_initial.up,
    down: migration_20260925_104747_initial.down,
    name: '20260925_104747_initial'
  },
];
