import * as migration_20260925_104747_initial from './20260925_104747_initial';
import * as migration_20260925_231057_site_content from './20260925_231057_site_content';
import * as migration_20260925_232856_site_content_versions from './20260925_232856_site_content_versions';
import * as migration_20260928_012131_blob_storage_fields from './20260928_012131_blob_storage_fields';

export const migrations = [
  {
    up: migration_20260925_104747_initial.up,
    down: migration_20260925_104747_initial.down,
    name: '20260925_104747_initial',
  },
  {
    up: migration_20260925_231057_site_content.up,
    down: migration_20260925_231057_site_content.down,
    name: '20260925_231057_site_content',
  },
  {
    up: migration_20260925_232856_site_content_versions.up,
    down: migration_20260925_232856_site_content_versions.down,
    name: '20260925_232856_site_content_versions',
  },
  {
    up: migration_20260928_012131_blob_storage_fields.up,
    down: migration_20260928_012131_blob_storage_fields.down,
    name: '20260928_012131_blob_storage_fields'
  },
];
