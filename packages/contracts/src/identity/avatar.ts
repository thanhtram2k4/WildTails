import { z } from 'zod';

export const AVATAR_BASES = ['cat-round', 'cat-slim', 'cat-fluffy'] as const;
export const AVATAR_FURS = ['orange', 'black', 'white', 'gray', 'calico', 'tuxedo'] as const;
export const AVATAR_EYES = ['round', 'almond', 'wink', 'sleepy'] as const;
export const AVATAR_OUTFITS = ['none', 'astronaut', 'explorer', 'scholar', 'captain'] as const;
export const AVATAR_ACCESSORIES = ['none', 'glasses', 'scarf', 'hat', 'earring'] as const;
export const AVATAR_BACKGROUNDS = ['none', 'stars', 'planets', 'nebula', 'forest'] as const;

export const AvatarConfigSchema = z.object({
  base: z.enum(AVATAR_BASES),
  fur: z.enum(AVATAR_FURS),
  eyes: z.enum(AVATAR_EYES),
  outfit: z.enum(AVATAR_OUTFITS),
  accessory: z.enum(AVATAR_ACCESSORIES).default('none'),
  background: z.enum(AVATAR_BACKGROUNDS).default('none'),
});

export type AvatarConfig = z.infer<typeof AvatarConfigSchema>;
