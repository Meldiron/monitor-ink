import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
    private router: Router
  ) {
    this.currentCalendarSection = new Date();
  }

  ngOnInit(): void {
    this.parseParams(this.route.snapshot.params);
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

    this.isSnapshotLoading = false; // TODO: Load data
  }
}
