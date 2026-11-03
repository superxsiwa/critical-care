import { httpResource } from '@angular/common/http';
import { Service, computed } from '@angular/core';
import { Meta } from './types';

/** What the server says about the app it writes for: steps per case, the equipment pictures. */
@Service()
export class MetaStore {
  private readonly meta = httpResource<Meta>(() => '/api/meta');

  readonly equipment = computed(() => (this.meta.hasValue() ? this.meta.value().equipment : []));
  readonly stepsPerCase = computed(() =>
    this.meta.hasValue() ? this.meta.value().stepsPerCase : 6,
  );
}

/** The picture an img names (./assets/equipment/syringe.png gives syringe.png), as the app reads it. */
export function equipmentName(img: unknown): string | null {
  if (typeof img !== 'string') return null;
  return /(?:^|\/)equipment\/([a-z0-9_]+\.png)$/.exec(img)?.[1] ?? null;
}

/** The img a picture is written as, the way the shipped cases write it. */
export function equipmentImg(name: string): string {
  return `./assets/equipment/${name}`;
}
