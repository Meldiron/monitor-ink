import { Component, OnInit } from '@angular/core';
import { DataState } from './states/data.state';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  DataState = DataState;

  nextReloadInSeconds = 0;
  reloadTimeout = 10;

  liveUpdateInterval: ReturnType<typeof setTimeout> | undefined;

  constructor(public dataState: DataState) {}

  ngOnInit() {
    this.fetchData();
    this.dataState.reloadSettings();
  }

  private startInterval() {
    this.liveUpdateInterval = setInterval(() => {
      this.nextReloadInSeconds--;

      if (this.nextReloadInSeconds <= 0) {
        this.liveUpdateInterval && clearInterval(this.liveUpdateInterval);
        this.fetchData();
      }
    }, 1000);
  }

  private async fetchData() {
    await this.dataState.reloadMainStatus();

    this.nextReloadInSeconds = this.reloadTimeout;
    this.startInterval();
  }
}
