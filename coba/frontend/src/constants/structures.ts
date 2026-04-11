import type { TranslationKey } from '../i18n/en'

export const STRUCTURE_TYPES = ['bridge', 'dam', 'tunnel', 'retaining_wall', 'embankment',
  'building', 'pipeline', 'reservoir', 'culvert', 'road', 'other'] as const

export const STRUCT_TYPE_KEY: Record<string, TranslationKey> = {
  bridge: 'structTypeBridge', dam: 'structTypeDam', tunnel: 'structTypeTunnel',
  retaining_wall: 'structTypeRetainingWall', embankment: 'structTypeEmbankment',
  building: 'structTypeBuilding', pipeline: 'structTypePipeline',
  reservoir: 'structTypeReservoir', culvert: 'structTypeCulvert',
  road: 'structTypeRoad', other: 'structTypeOther',
}
