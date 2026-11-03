import { Component, computed, inject, input } from '@angular/core';
import { MetaStore, equipmentImg, equipmentName } from '../api/meta';
import { Json, JsonObject } from '../api/types';
import { freshId } from '../case/blank';
import { Path, asText, getAt, isObject, listAt, pathText, setAt } from '../case/json';
import { Confirm } from '../ui/confirm';
import { CaseEditor } from './case-editor';
import { Errors, Field, ProblemsAt, TextField } from './fields';

/**
 * An id of a card, option or tray. Renamed, the lists that name it (`refs`, such as correctOrder)
 * follow, as long as no other entry of `siblings` still has the old id.
 */
@Component({
  selector: 'cs-id',
  imports: [Errors],
  host: { class: 'block', '[attr.data-path]': 'where()' },
  template: `
    <label class="label" [for]="id()"
      >{{ label() }} <span class="key" aria-hidden="true">id</span></label
    >
    <input
      class="input font-mono"
      autocomplete="off"
      spellcheck="false"
      [id]="id()"
      [value]="text()"
      [attr.aria-invalid]="invalid()"
      [attr.aria-describedby]="describedBy()"
      (input)="write($event)"
    />
    <cs-errors [problems]="problems()" [listId]="errId()" />
  `,
})
export class IdField extends Field {
  readonly siblings = input.required<Path>();
  readonly refs = input<readonly Path[]>([]);
  protected readonly text = computed(() => asText(this.value()));

  protected write(e: Event): void {
    const next = (e.target as HTMLInputElement).value;
    const old = this.text();
    this.editor.doc.update((d) => {
      let out = setAt(d, this.path(), next);
      const stillUsed = listAt(out, this.siblings()).some((x) => isObject(x) && x['id'] === old);
      if (old === '' || stillUsed) return out;
      for (const ref of this.refs()) {
        const ids = getAt(out, ref);
        if (Array.isArray(ids))
          out = setAt(
            out,
            ref,
            ids.map((x) => (x === old ? next : x)),
          );
      }
      return out;
    });
  }
}

/** A card's picture: one of the app's equipment pictures, or none. */
@Component({
  selector: 'cs-image',
  imports: [Errors],
  host: { class: 'block', '[attr.data-path]': 'where()' },
  template: `
    <label class="label" [for]="id()"
      >รูปอุปกรณ์ <span class="key" aria-hidden="true">img</span></label
    >
    <div class="flex items-center gap-2">
      <div
        class="flex h-[46px] w-[52px] shrink-0 items-center justify-center rounded-md border border-line bg-white"
      >
        @if (name(); as n) {
          <img [src]="'equipment/' + n" width="52" height="46" alt="" class="h-[46px] w-[52px]" />
        }
      </div>
      <select
        class="input"
        [id]="id()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        (change)="write($event)"
      >
        <option value="" [selected]="raw() === ''">ไม่มีรูป</option>
        @if (unknown()) {
          <option [value]="raw()" selected>{{ raw() }} (ไม่มีในแอป)</option>
        }
        @for (e of meta.equipment(); track e) {
          <option [value]="e" [selected]="e === name()">{{ caption(e) }}</option>
        }
      </select>
    </div>
    <cs-errors [problems]="problems()" [listId]="errId()" />
  `,
})
export class ImageField extends Field {
  protected readonly meta = inject(MetaStore);
  protected readonly raw = computed(() => asText(this.value()));
  protected readonly name = computed(() => {
    const n = equipmentName(this.value());
    return n && this.meta.equipment().includes(n) ? n : null;
  });
  protected readonly unknown = computed(() => this.raw() !== '' && this.name() === null);

  protected caption(file: string): string {
    return file.replace(/\.png$/, '').replaceAll('_', ' ');
  }

  protected write(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    if (v === '') this.editor.remove(this.path());
    else if (v === this.raw()) return;
    else this.editor.set(this.path(), equipmentImg(v));
  }
}

/**
 * A task's cards (pool): id, text and picture each. `refs` are the lists that name cards by id;
 * `role` says what a card is for (its place in the order, its tray, right or wrong).
 */
@Component({
  selector: 'cs-pool',
  imports: [IdField, ImageField, TextField, ProblemsAt],
  host: { class: 'block', '[attr.data-path]': 'where()' },
  template: `
    <h4 class="text-sm font-semibold text-ink">
      การ์ดตัวเลือก / อุปกรณ์ <span class="key" aria-hidden="true">pool</span>
      <span class="ml-1 font-normal text-ink-3">({{ cards().length }} ใบ)</span>
    </h4>
    <cs-problems-at [at]="path()" />
    <ol class="mt-2 space-y-2">
      @for (card of cards(); track $index; let i = $index) {
        <li class="rounded-lg border border-line bg-sky-50/60 p-2.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-plain">การ์ด {{ i + 1 }}</span>
            @if (roleOf(card); as r) {
              <span class="badge" [class]="r.ok ? 'badge-ok' : 'badge-plain'">{{ r.text }}</span>
            }
            <button
              type="button"
              class="btn btn-ghost btn-icon ml-auto text-rose-700"
              [attr.aria-label]="'ลบการ์ด ' + (i + 1)"
              (click)="removeCard(i)"
            >
              ✕
            </button>
          </div>
          <div class="mt-1 grid gap-2 md:grid-cols-[8rem_1fr_15rem]">
            <cs-id label="รหัส" [path]="at(i, 'id')" [siblings]="path()" [refs]="refs()" />
            <cs-text label="ข้อความ" [path]="at(i, 'text')" [multiline]="true" />
            <cs-image [path]="at(i, 'img')" label="รูปอุปกรณ์" />
          </div>
        </li>
      }
    </ol>
    <button type="button" class="btn mt-2" (click)="addCard()">+ เพิ่มการ์ด</button>
  `,
})
export class PoolEditor {
  private readonly editor = inject(CaseEditor);
  private readonly confirm = inject(Confirm);
  readonly path = input.required<Path>();
  readonly refs = input<readonly Path[]>([]);
  readonly fallbackId = input('card');
  readonly role = input<(id: string) => { text: string; ok: boolean } | null>(() => null);

  protected readonly where = computed(() => pathText(this.path()));
  protected readonly cards = computed(() => listAt(this.editor.doc(), this.path()));

  protected at(i: number, key: string): Path {
    return [...this.path(), i, key];
  }

  protected roleOf(card: Json): { text: string; ok: boolean } | null {
    return isObject(card) && typeof card['id'] === 'string' ? this.role()(card['id']) : null;
  }

  protected addCard(): void {
    const doc = this.editor.doc();
    const card: JsonObject = { id: freshId(doc, this.cards(), this.fallbackId()), text: '' };
    this.editor.set(this.path(), [...this.cards(), card]);
  }

  /** Removes a card and every mention of its id in the lists that name it. */
  protected async removeCard(i: number): Promise<void> {
    const card = this.cards()[i];
    const text = isObject(card) ? asText(card['text']) : '';
    if (
      text &&
      !(await this.confirm.ask({ title: `ลบการ์ด ${i + 1}?`, body: text, yes: 'ลบ', danger: true }))
    )
      return;
    const id = isObject(card) ? card['id'] : undefined;
    this.editor.doc.update((d) => {
      let out = setAt(
        d,
        this.path(),
        listAt(d, this.path()).filter((_, k) => k !== i),
      );
      const stillUsed = listAt(out, this.path()).some((x) => isObject(x) && x['id'] === id);
      if (typeof id === 'string' && !stillUsed)
        for (const ref of this.refs()) {
          const ids = getAt(out, ref);
          if (Array.isArray(ids))
            out = setAt(
              out,
              ref,
              ids.filter((x) => x !== id),
            );
        }
      return out;
    });
  }
}
