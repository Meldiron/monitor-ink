import { Component, OnInit } from '@angular/core';
import { DataState } from './states/data.state';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  contactMail = 'matejbaco2000@gmail.com';
  contactPhone = '+421 919 194 798';

  DataState = DataState;

  nextReloadInSeconds = 10;
  reloadTimeout = 10;

  liveUpdateInterval: ReturnType<typeof setTimeout> | undefined;

  constructor(public dataState: DataState) {}

  ngOnInit() {
    this.fetchData();

    this.liveUpdateInterval = setInterval(() => {
      this.nextReloadInSeconds--;

      if (this.nextReloadInSeconds <= 0) {
        this.fetchData();
      }
    }, 1000);
  }

  private async fetchData() {
    this.nextReloadInSeconds = this.reloadTimeout;
    await this.dataState.reloadMainStatus();
  }
}
