import { Component, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface JournalEntry {
  date: string;
  answers: { [question: string]: any };
}

const QUESTION_LIST = [
  "My previous night's sleep",
  'Easiness of leaving the bed',
  'My day with my boss (optional)',
  'My day with my colleague (optional)',
  'My day with my spouse (optional)',
  'My driving experience TO office (optional)',
  'My driving experience FROM office (optional)',
  'My day with my kids (optional)',
  'My day with my house help (optional)',
  'Was I happy and satisfied with how I spent my ideal time',
  "Today's experience overall",
];

const RADIO_QUESTION = "Today's experience overall";
const RADIO_OPTIONS = ['Happy', 'Sad', 'Annoyed'];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxSliderModule]
})
export class AppComponent {
  title = 'Daily Journal';
  questions: string[] = QUESTION_LIST;
  answers: { [question: string]: any } = {};
  isBrowser: boolean;
  radioOptions = RADIO_OPTIONS;
  sliderOptions: Options = {
    floor: 1,
    ceil: 10,
    showTicks: true,
    step: 1,
    animate: true,
    translate: (value: number): string => `${value}`
  };
  userName: string = '';
  showNameModal: boolean = true;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initAnswers();
    if (this.isBrowser) {
      this.loadTodayAnswers();
      const savedName = localStorage.getItem('journal-user-name');
      if (savedName) {
        this.userName = savedName;
        this.showNameModal = false;
      }
    }
  }

  onNameSubmit() {
    if (this.userName.trim()) {
      this.showNameModal = false;
      if (this.isBrowser) {
        localStorage.setItem('journal-user-name', this.userName);
      }
    }
  }

  get todayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  initAnswers() {
    this.answers = {};
    for (const q of this.questions) {
      if (q === RADIO_QUESTION) {
        this.answers[q] = { value: '', comment: '' };
      } else if (q.includes('(optional)')) {
        this.answers[q] = { value: 0, comment: '' };
      } else {
        this.answers[q] = { value: 5, comment: '' };
      }
    }
  }

  loadTodayAnswers() {
    if (!this.isBrowser) return;
    const data = localStorage.getItem('journal-' + this.todayKey);
    if (data) {
      this.answers = JSON.parse(data);
    } else {
      this.initAnswers();
    }
  }

  onSubmit() {
    if (!this.isBrowser) return;
    localStorage.setItem('journal-' + this.todayKey, JSON.stringify(this.answers));
    this.exportToExcel();
  }

  exportToExcel() {
    if (!this.isBrowser) return;
    // Gather only today's journal entry from localStorage
    const entries: JournalEntry[] = [];
    const today = new Date().toISOString().split('T')[0];
    const key = 'journal-' + today;
    const data = localStorage.getItem(key);
    if (data) {
      const answers = JSON.parse(data);
      entries.push({ date: today, answers });
    }
    // Prepare data for Excel
    const allQuestions = this.questions;
    const worksheetData = [
      ['Date', ...allQuestions.flatMap(q => q === RADIO_QUESTION ? [q + ' (Option)', q + ' (Comment)'] : [q + ' (1-10)', q + ' (Comment)'])],
      ...entries.map(entry => [
        entry.date,
        ...allQuestions.flatMap(q => q === RADIO_QUESTION
          ? [entry.answers[q]?.value ?? '', entry.answers[q]?.comment ?? '']
          : [entry.answers[q]?.value ?? '', entry.answers[q]?.comment ?? '']
        )
      ])
    ];
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Journal');
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const safeName = this.userName ? this.userName.replace(/[^a-zA-Z0-9]/g, '_') : 'journal';
    saveAs(
      new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${safeName}'s journal entry_${today}.xlsx`
    );
  }

  refreshFields() {
    this.initAnswers();
    if (this.isBrowser) {
      localStorage.removeItem('journal-' + this.todayKey);
    }
  }

  getSliderColor(value: number): string {
    if (value <= 3) return '#e74c3c'; // red
    if (value <= 7) return '#f1c40f'; // yellow
    return '#2ecc71'; // green
  }

  onSliderInput(question: string, event: any) {
    this.answers[question].value = +event.target.value;
  }
}
