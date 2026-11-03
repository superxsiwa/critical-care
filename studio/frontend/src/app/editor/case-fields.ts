import { Component } from '@angular/core';
import { Path } from '../case/json';
import { Choice, NumberField, ProblemsAt, SelectField, TextField } from './fields';

/** The bed's status, in his case manager's words. */
const STATUSES: readonly Choice[] = [
  { value: 'stable', label: 'Stable (คงที่)' },
  { value: 'alert', label: 'Alert (เฝ้าระวัง)' },
  { value: 'critical', label: 'Critical (วิกฤต)' },
];

/** The doctor pictures the shipped cases use (written as escapes: they hold invisible joiners). */
const AVATARS = ['\u{1F468}\u200D\u2695\uFE0F', '\u{1F469}\u200D\u2695\uFE0F'];

/** The case's own fields: the bed, the patient, the doctor. */
@Component({
  selector: 'cs-case-fields',
  imports: [TextField, NumberField, SelectField, ProblemsAt],
  template: `
    <cs-problems-at [at]="root" />
    <div class="grid gap-3 md:grid-cols-[10rem_1fr_1fr]">
      <cs-number label="หมายเลขเตียง" [path]="['bedNum']" />
      <cs-text label="ชื่อเตียง" [path]="['bedCode']" placeholder="เช่น เตียง 09 CCU" />
      <cs-select label="สถานะเตียง" [path]="['status']" [choices]="statuses" />
    </div>
    <cs-text class="mt-3" label="ชื่อเคสหัตถการ" [path]="['caseTitle']" />
    <div class="mt-3 grid gap-3 md:grid-cols-[1fr_10rem_1fr]">
      <cs-text label="ชื่อคนไข้ (และอายุ)" [path]="['patientName']" />
      <cs-number label="อายุ (ปี)" [path]="['patientAge']" [optional]="true" />
      <cs-text label="ป้ายการวินิจฉัยโรค" [path]="['dxBadge']" />
    </div>
    <div class="mt-3 grid gap-3 md:grid-cols-[1fr_10rem_1fr]">
      <cs-text label="ชื่อแพทย์ผู้สั่งการ" [path]="['doctorName']" />
      <cs-text label="อีโมจิแพทย์" [path]="['doctorAvatar']" [suggestions]="avatars" />
      <cs-text label="ข้อความสถานะ" [path]="['statusText']" />
    </div>
    <div class="mt-3 grid gap-3 md:grid-cols-[1fr_2fr]">
      <cs-text label="ระยะเวลาใน CCU" [path]="['stayDuration']" [optional]="true" />
      <cs-text
        label="บันทึกทางคลินิก"
        [path]="['clinicalNote']"
        [optional]="true"
        [multiline]="true"
      />
    </div>
  `,
})
export class CaseFields {
  protected readonly root: Path = [];
  protected readonly statuses = STATUSES;
  protected readonly avatars = AVATARS;
}
