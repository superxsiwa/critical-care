import { Component, Directive, computed, inject, input } from '@angular/core';
import { Json, Problem } from '../api/types';
import { Path, asText, pathText } from '../case/json';
import { CaseEditor, fieldId } from './case-editor';

/** A field's problems, under it. The texts are the server's (English, the app's own words). */
@Component({
  selector: 'cs-errors',
  template: `
    @if (problems().length) {
      <ul [id]="listId()" class="mt-1 space-y-0.5" lang="en">
        @for (p of problems(); track $index) {
          <li class="field-error mt-0">{{ p.message }}</li>
        }
      </ul>
    }
  `,
})
export class Errors {
  readonly problems = input.required<Problem[]>();
  readonly listId = input<string>();
}

/** The problems that belong to a place with no field of its own (a list, a step, a task). */
@Component({
  selector: 'cs-problems-at',
  imports: [Errors],
  host: { '[attr.data-path]': 'where()' },
  template: `<cs-errors [problems]="editor.problemsAt(at())" />`,
})
export class ProblemsAt {
  protected readonly editor = inject(CaseEditor);
  readonly at = input.required<Path>();
  protected readonly where = computed(() => pathText(this.at()));
}

/** What every field shares: its path, its words, its problems. */
@Directive()
export abstract class Field {
  protected readonly editor = inject(CaseEditor);
  readonly path = input.required<Path>();
  readonly label = input.required<string>();
  readonly placeholder = input('');

  protected readonly id = computed(() => fieldId(this.path()));
  protected readonly errId = computed(() => this.id() + '-err');
  protected readonly where = computed(() => pathText(this.path()));
  protected readonly key = computed(() => String(this.path()[this.path().length - 1]));
  protected readonly value = computed(() => this.editor.value(this.path()));
  protected readonly problems = computed(() => this.editor.problemsAt(this.path()));
  protected readonly invalid = computed(() => (this.problems().length ? 'true' : null));
  protected readonly describedBy = computed(() => (this.problems().length ? this.errId() : null));
}

/** A text field. `optional`: emptied, the key is left out (as the case files do). */
@Component({
  selector: 'cs-text',
  imports: [Errors],
  host: { class: 'block', '[attr.data-path]': 'where()' },
  template: `
    <label class="label" [for]="id()"
      >{{ label() }} <span class="key" aria-hidden="true">{{ key() }}</span></label
    >
    @if (multiline()) {
      <textarea
        class="input field-sizing-content max-h-80"
        rows="3"
        [id]="id()"
        [value]="text()"
        [attr.placeholder]="placeholder() || null"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        (input)="write($event)"
      ></textarea>
    } @else {
      <input
        class="input"
        [id]="id()"
        [value]="text()"
        [attr.placeholder]="placeholder() || null"
        [attr.list]="suggestions() ? id() + '-list' : null"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        (input)="write($event)"
      />
      @if (suggestions(); as list) {
        <datalist [id]="id() + '-list'">
          @for (s of list; track s) {
            <option [value]="s"></option>
          }
        </datalist>
      }
    }
    <cs-errors [problems]="problems()" [listId]="errId()" />
  `,
})
export class TextField extends Field {
  readonly multiline = input(false);
  readonly optional = input(false);
  readonly suggestions = input<readonly string[] | null>(null);
  protected readonly text = computed(() => asText(this.value()));

  protected write(e: Event): void {
    const v = (e.target as HTMLInputElement | HTMLTextAreaElement).value;
    if (v === '' && this.optional()) this.editor.remove(this.path());
    else this.editor.set(this.path(), v);
  }
}

/**
 * A whole-number field. What does not read as a number is kept as typed, so the server's problem
 * ("expected a whole number") says what is wrong; emptied, an optional key is left out.
 */
@Component({
  selector: 'cs-number',
  imports: [Errors],
  host: { class: 'block', '[attr.data-path]': 'where()' },
  template: `
    <label class="label" [for]="id()"
      >{{ label() }} <span class="key" aria-hidden="true">{{ key() }}</span></label
    >
    <input
      class="input"
      inputmode="numeric"
      [id]="id()"
      [value]="text()"
      [attr.placeholder]="placeholder() || null"
      [attr.aria-invalid]="invalid()"
      [attr.aria-describedby]="describedBy()"
      (input)="write($event)"
    />
    <cs-errors [problems]="problems()" [listId]="errId()" />
  `,
})
export class NumberField extends Field {
  readonly optional = input(false);
  protected readonly text = computed(() => asText(this.value()));

  protected write(e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (v === '') {
      if (this.optional()) this.editor.remove(this.path());
      else this.editor.set(this.path(), null);
      return;
    }
    const n = Number(v);
    this.editor.set(this.path(), /^-?\d+(\.\d+)?$/.test(v) && Number.isFinite(n) ? n : v);
  }
}

/** A yes/no field. */
@Component({
  selector: 'cs-check',
  imports: [Errors],
  host: { class: 'block', '[attr.data-path]': 'where()' },
  template: `
    <label class="inline-flex items-center gap-2 text-sm text-ink" [for]="id()">
      <input
        type="checkbox"
        class="h-4 w-4 accent-sky-700"
        [id]="id()"
        [checked]="value() === true"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        (change)="write($event)"
      />
      {{ label() }}
      @if (showKey()) {
        <span class="key" aria-hidden="true">{{ key() }}</span>
      }
    </label>
    <cs-errors [problems]="problems()" [listId]="errId()" />
  `,
})
export class CheckField extends Field {
  readonly showKey = input(true);

  protected write(e: Event): void {
    this.editor.set(this.path(), (e.target as HTMLInputElement).checked);
  }
}

export interface Choice {
  value: string;
  label: string;
}

/** One of a fixed set of values. A value outside the set is shown as it is, never changed silently. */
@Component({
  selector: 'cs-select',
  imports: [Errors],
  host: { class: 'block', '[attr.data-path]': 'where()' },
  template: `
    <label class="label" [for]="id()"
      >{{ label() }} <span class="key" aria-hidden="true">{{ key() }}</span></label
    >
    <select
      class="input"
      [id]="id()"
      [attr.aria-invalid]="invalid()"
      [attr.aria-describedby]="describedBy()"
      (change)="write($event)"
    >
      @if (unknown(); as raw) {
        <option [value]="raw" selected>{{ raw }} (ไม่รู้จัก)</option>
      }
      @for (c of choices(); track c.value) {
        <option [value]="c.value" [selected]="c.value === value()">{{ c.label }}</option>
      }
    </select>
    <cs-errors [problems]="problems()" [listId]="errId()" />
  `,
})
export class SelectField extends Field {
  readonly choices = input.required<readonly Choice[]>();
  protected readonly unknown = computed(() => {
    const v: Json | undefined = this.value();
    return this.choices().some((c) => c.value === v) ? null : asText(v) || '(ว่าง)';
  });

  protected write(e: Event): void {
    this.editor.set(this.path(), (e.target as HTMLSelectElement).value);
  }
}
