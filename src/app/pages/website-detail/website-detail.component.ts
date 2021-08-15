import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import {
  DataState,
  DataStateGroup,
  DataStateProject,
  DateStateDetailedProject,
} from 'src/app/states/data.state';

@Component({
  selector: 'app-website-detail',
  templateUrl: './website-detail.component.html',
  styleUrls: ['./website-detail.component.scss'],
})
export class WebsiteDetailComponent implements OnInit {
  DataState = DataState;

  currentGroup: DataStateGroup | null = null;
  currentProject: DataStateProject | null = null;
  currentProjectDetailed: DateStateDetailedProject | null = null;

  projectId: string | undefined;
  currentPage = 1;
  isSnapshotLoading = true;
  currentCalendarSection: Date;

  dateFrom: Date | undefined;
  dateTo: Date | undefined;

  calendar: any[] = []; // TODO: Real calendar

  constructor(
    private route: ActivatedRoute,
    public dataState: DataState,
    private router: Router,
    private store: Store
  ) {
    this.currentCalendarSection = new Date();
  }

  ngOnInit(): void {
    this.route.params.subscribe((newParams: any) => {
      this.parseParams(newParams);
    });
  }

  async parseParams(params: any) {
    this.projectId = params.projectId || this.projectId;

    if (!this.projectId) {
      return;
    }

    await this.reloadCurrentService();

    this.currentProject = DataState.getProject(
      this.dataState.snapshot,
      this.projectId
    );

    if (this.currentProject) {
      this.currentGroup = DataState.getGroup(
        this.dataState.snapshot,
        this.currentProject.groupId
      );
    }

    this.currentProjectDetailed = DataState.getProjectDetail(
      this.dataState.snapshot,
      this.projectId
    );

    // TODO: Does this even sync?
  }

  async goLeft() {
    if (this.isSnapshotLoading) {
      return;
    }

    this.currentPage++;
    this.isSnapshotLoading = true;

    // await this.reloadCurrentService();

    this.isSnapshotLoading = false;
  }

  async goRight() {
    if (this.isSnapshotLoading) {
      return;
    }

    if (this.currentPage <= 1) {
      this.currentPage = 1;
      return;
    }

    this.currentPage--;
    this.isSnapshotLoading = true;

    // await this.reloadCurrentService();

    this.isSnapshotLoading = false;
  }

  calendarGoLeft() {
    let month = this.currentCalendarSection.getMonth();
    let year = this.currentCalendarSection.getFullYear();

    month--;

    if (month <= 0) {
      month = 11;
      year--;
    }

    this.currentCalendarSection = new Date(year, month);

    // this.reloadFullCalendar();
  }

  calendarGoRight() {
    let month = this.currentCalendarSection.getMonth();
    let year = this.currentCalendarSection.getFullYear();

    month++;

    if (month >= 11) {
      month = 0;
      year++;
    }

    this.currentCalendarSection = new Date(year, month);

    // this.reloadFullCalendar();
  }

  onOpenDetail(key: string) {
    this.router.navigateByUrl('/detail/' + key);
  }

  async reloadCurrentService() {
    if (!this.projectId) {
      return;
    }

    await this.dataState.loadProjectDetail(this.projectId);

    this.reloadFullCalendar();

    this.isSnapshotLoading = false; // TODO: Load data
  }

  async reloadFullCalendar() {
    if (!this.projectId) {
      return;
    }

    const detailedProject =
      this.dataState.snapshot.projectDetails[this.projectId];
    if (!detailedProject) {
      return;
    }

    const date = this.currentCalendarSection;
    const currentDateData: any = {};
    currentDateData.date = date;
    currentDateData.month = date.getMonth() + 1;

    console.log(date);

    const firstDay = new Date(date.getFullYear(), date.getMonth() + 0, 1);
    console.log(firstDay);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    console.log(lastDay);
    const firstDayIndex = firstDay.getDay(); // 0 sunday, 1 monday, 2 ...
    const lastDayIndex = lastDay.getDate();

    let emptyDaysIndex = firstDayIndex - 1;

    if (emptyDaysIndex < 0) {
      emptyDaysIndex = 6;
    }
    console.log(emptyDaysIndex);

    this.calendar = [];

    for (let i = 0; i < emptyDaysIndex; i++) {
      this.calendar.push(null);
    }

    const calendar =
      detailedProject.calendar[
        `${new Date().getFullYear()}_${new Date().getMonth()}`
      ];

    console.log(calendar);

    let dayNumber = 0;
    for (let i = 0; i < lastDayIndex; i++) {
      const currentDate = new Date(date.getFullYear(), date.getMonth(), i);

      const calendarItem = calendar.find(
        (c) => c.dayNumber === currentDate.getDate() + 1
      );

      let isDown = calendarItem?.status === 'down';
      let isSlow = calendarItem?.status === 'slow';
      let hasData = calendarItem ? true : false;

      const today = new Date();

      const isToday =
        today.getDate() - 1 === currentDate.getDate() &&
        today.getMonth() === currentDate.getMonth() &&
        today.getFullYear() === currentDate.getFullYear()
          ? true
          : false;

      let isOutOfRange = false;

      if (currentDate.getTime() > Date.now()) {
        isOutOfRange = true;
      }

      if (currentDate.getTime() < Date.now() - 31536000000) {
        isOutOfRange = true;
      }

      this.calendar.push({
        isToday,
        number: dayNumber + 1,
        classes: isOutOfRange
          ? ['text-blue-600', 'bg-blue-50']
          : !hasData
          ? ['text-gray-600', 'bg-gray-50']
          : isDown
          ? ['text-red-600', 'bg-red-50']
          : isSlow
          ? ['text-yellow-600', 'bg-yellow-50']
          : ['text-green-600', 'bg-green-50'],
      });

      dayNumber++;
    }

    console.log(this.calendar);
  }

  getPings(): DataStateProject['mainStatuses'] {
    if (!this.projectId) {
      return [];
    }

    const pings = DataState.getProject(this.dataState.snapshot, this.projectId);
    return pings ? pings.mainStatuses : [];
  }

  getDate(dateNumber: number) {
    return new Date(dateNumber);
  }
}
